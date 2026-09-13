import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Workspace, WorkspaceDocument, WorkspaceRole } from '../schemas/workspace.schema.js';
import { WorkspaceInvite, WorkspaceInviteDocument, InviteStatus } from '../schemas/workspace-invite.schema.js';
import { ConversationGroup, ConversationGroupDocument } from '../schemas/conversation-group.schema.js';
import { User, UserDocument } from '../schemas/user.schema.js';
import { MailService } from '../mail/mail.service.js';
import { EventsGateway } from '../websockets/events.gateway.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceInvite.name) private readonly workspaceInviteModel: Model<WorkspaceInviteDocument>,
    @InjectModel(ConversationGroup.name) private readonly conversationGroupModel: Model<ConversationGroupDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name) || 'workspace';
    let slug = baseSlug;
    let count = 1;
    while (await this.workspaceModel.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }
    return slug;
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceDocument> {
    const slug = await this.generateUniqueSlug(dto.name);
    const userObjectId = new Types.ObjectId(userId);

    const workspace = new this.workspaceModel({
      name: dto.name,
      slug,
      description: dto.description,
      ownerId: userObjectId,
      members: [
        {
          userId: userObjectId,
          role: WorkspaceRole.ADMIN,
          joinedAt: new Date(),
        },
      ],
    });

    const savedWorkspace = await workspace.save();

    // Create default #general conversation group
    await this.conversationGroupModel.create({
      workspaceId: savedWorkspace._id,
      name: 'general',
      slug: 'general',
      description: 'Default workspace conversation channel',
      isDefault: true,
    });

    return savedWorkspace;
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    return this.workspaceModel
      .find({
        $or: [{ ownerId: userObjectId }, { 'members.userId': userObjectId }],
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getWorkspaceBySlug(userId: string, slug: string): Promise<WorkspaceDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const workspace = await this.workspaceModel.findOne({ slug }).exec();

    if (!workspace) {
      throw new NotFoundException(`Workspace with slug "${slug}" not found`);
    }

    const isMember =
      workspace.ownerId.equals(userObjectId) ||
      workspace.members.some((m) => m.userId.equals(userObjectId));

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return workspace;
  }

  async updateWorkspace(userId: string, workspaceId: string, dto: UpdateWorkspaceDto): Promise<WorkspaceDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = workspace.members.find((m) => m.userId.equals(userObjectId));
    const isAdmin = workspace.ownerId.equals(userObjectId) || (member && member.role === WorkspaceRole.ADMIN);

    if (!isAdmin) {
      throw new ForbiddenException('Only workspace admins can modify workspace settings');
    }

    if (dto.name) {
      workspace.name = dto.name;
    }
    if (dto.description !== undefined) {
      workspace.description = dto.description;
    }

    return workspace.save();
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<{ success: boolean }> {
    const userObjectId = new Types.ObjectId(userId);
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = workspace.members.find((m) => m.userId.equals(userObjectId));
    const isAdmin =
      workspace.ownerId.equals(userObjectId) || (member && member.role === WorkspaceRole.ADMIN);

    if (!isAdmin) {
      throw new ForbiddenException('Only workspace admins can delete this workspace');
    }

    await this.conversationGroupModel.deleteMany({ workspaceId: workspace._id });
    await this.workspaceInviteModel.deleteMany({ workspaceId: workspace._id });
    await this.workspaceModel.findByIdAndDelete(workspaceId);

    return { success: true };
  }

  async removeMember(userId: string, workspaceId: string, memberUserId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const targetObjectId = new Types.ObjectId(memberUserId);
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const actingMember = workspace.members.find((m) => m.userId.equals(userObjectId));
    const isActingAdmin =
      workspace.ownerId.equals(userObjectId) ||
      (actingMember && actingMember.role === WorkspaceRole.ADMIN);

    if (!isActingAdmin) {
      throw new ForbiddenException('Only workspace admins can kick members');
    }

    if (workspace.ownerId.equals(targetObjectId)) {
      throw new BadRequestException('Cannot kick the workspace owner');
    }

    const memberIndex = workspace.members.findIndex((m) =>
      m.userId.equals(targetObjectId),
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Member not found in workspace');
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    this.eventsGateway.broadcastMemberKicked(workspaceId, memberUserId);

    return this.getWorkspaceMembers(userId, workspaceId);
  }

  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto): Promise<WorkspaceInviteDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const workspace = await this.workspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const inviter = await this.userModel.findById(userId).exec();
    if (!inviter) {
      throw new NotFoundException('Inviter user record not found');
    }

    const member = workspace.members.find((m) => m.userId.equals(userObjectId));
    const isAdmin =
      workspace.ownerId.equals(userObjectId) || (member && member.role === WorkspaceRole.ADMIN);

    if (!isAdmin) {
      throw new ForbiddenException('Only workspace admins can invite new team members');
    }

    // Check if target user is already a member
    const targetUser = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (targetUser && workspace.members.some((m) => m.userId.equals(targetUser._id))) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.workspaceInviteModel.create({
      workspaceId: workspace._id,
      email: dto.email.toLowerCase(),
      token,
      invitedBy: userObjectId,
      role: dto.role || WorkspaceRole.MEMBER,
      status: InviteStatus.PENDING,
      expiresAt,
    });

    const appUrl = this.getFrontendUrl();
    const inviteUrl = `${appUrl}/invite/accept?token=${token}`;

    try {
      await this.mailService.sendWorkspaceInvite(dto.email, workspace.name, inviteUrl, inviter.name);
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to send email via Zoho SMTP: ${err?.message || 'Authentication error'}. Please check your Zoho email/password or 2FA App Password.`
      );
    }

    return invite;
  }

  private getFrontendUrl(): string {
    let url =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      'http://localhost:3000';

    url = url.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }

  async getInviteDetails(token: string) {
    const invite = await this.workspaceInviteModel
      .findOne({ token, status: InviteStatus.PENDING })
      .populate('workspaceId', 'name slug description')
      .populate('invitedBy', 'name email')
      .exec();

    if (!invite) {
      throw new NotFoundException('Invitation token is invalid or has expired');
    }

    if (new Date() > invite.expiresAt) {
      invite.status = InviteStatus.EXPIRED;
      await invite.save();
      throw new BadRequestException('Invitation token has expired');
    }

    return invite;
  }

  async acceptInvite(userId: string, token: string): Promise<{ success: boolean; workspaceSlug: string }> {
    const invite = await this.workspaceInviteModel.findOne({ token, status: InviteStatus.PENDING }).exec();

    if (!invite) {
      throw new NotFoundException('Invitation token is invalid or has expired');
    }

    if (new Date() > invite.expiresAt) {
      invite.status = InviteStatus.EXPIRED;
      await invite.save();
      throw new BadRequestException('Invitation token has expired');
    }

    const workspace = await this.workspaceModel.findById(invite.workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Associated workspace no longer exists');
    }

    const userObjectId = new Types.ObjectId(userId);
    const existingMember = workspace.members.find((m) => m.userId.equals(userObjectId));

    if (!existingMember) {
      workspace.members.push({
        userId: userObjectId,
        role: invite.role,
        joinedAt: new Date(),
      });
      await workspace.save();
    }

    invite.status = InviteStatus.ACCEPTED;
    await invite.save();

    return { success: true, workspaceSlug: workspace.slug };
  }

  async getWorkspaceMembers(userId: string, workspaceId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const workspace = await this.workspaceModel.findById(workspaceId).populate('members.userId', 'name email avatarUrl').exec();

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isMember =
      workspace.ownerId.equals(userObjectId) ||
      workspace.members.some(
        (m) =>
          (m.userId as any)._id?.equals(userObjectId) ||
          (m.userId as any).equals?.(userObjectId),
      );

    if (!isMember) {
      throw new ForbiddenException('Access denied');
    }

    return workspace.members;
  }
}
