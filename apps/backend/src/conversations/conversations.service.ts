import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationGroup, ConversationGroupDocument } from '../schemas/conversation-group.schema.js';
import { Message, MessageDocument } from '../schemas/message.schema.js';
import { Workspace, WorkspaceDocument } from '../schemas/workspace.schema.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { EventsGateway } from '../websockets/events.gateway.js';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(ConversationGroup.name)
    private readonly conversationGroupModel: Model<ConversationGroupDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
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

  private async checkWorkspaceMember(userId: string, workspace: WorkspaceDocument) {
    const userObjectId = new Types.ObjectId(userId);
    const isMember =
      workspace.ownerId.equals(userObjectId) ||
      workspace.members.some((m) => m.userId.equals(userObjectId));
    if (!isMember) {
      throw new ForbiddenException('Access denied to workspace conversations');
    }
  }

  async getWorkspaceGroups(userId: string, workspaceIdOrSlug: string): Promise<ConversationGroupDocument[]> {
    let workspace: WorkspaceDocument | null = null;
    if (Types.ObjectId.isValid(workspaceIdOrSlug)) {
      workspace = await this.workspaceModel.findById(workspaceIdOrSlug).exec();
    }
    if (!workspace) {
      workspace = await this.workspaceModel.findOne({ slug: workspaceIdOrSlug }).exec();
    }
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkWorkspaceMember(userId, workspace);

    return this.conversationGroupModel
      .find({ workspaceId: workspace._id })
      .sort({ createdAt: 1 })
      .exec();
  }

  async createGroup(userId: string, workspaceId: string, dto: CreateGroupDto): Promise<ConversationGroupDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkWorkspaceMember(userId, workspace);

    const baseSlug = this.slugify(dto.name) || 'group';
    let slug = baseSlug;
    let count = 1;

    while (await this.conversationGroupModel.findOne({ workspaceId: workspace._id, slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    return this.conversationGroupModel.create({
      workspaceId: workspace._id,
      name: dto.name,
      slug,
      description: dto.description,
      isDefault: false,
    });
  }

  async getGroupBySlug(userId: string, workspaceSlug: string, groupSlug: string) {
    const workspace = await this.workspaceModel.findOne({ slug: workspaceSlug }).exec();
    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceSlug}" not found`);
    }

    await this.checkWorkspaceMember(userId, workspace);

    const group = await this.conversationGroupModel
      .findOne({ workspaceId: workspace._id, slug: groupSlug })
      .exec();

    if (!group) {
      throw new NotFoundException(`Conversation group "${groupSlug}" not found`);
    }

    return { group, workspace };
  }

  async getGroupMessages(userId: string, groupId: string): Promise<MessageDocument[]> {
    const group = await this.conversationGroupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const workspace = await this.workspaceModel.findById(group.workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkWorkspaceMember(userId, workspace);

    return this.messageModel
      .find({ conversationId: group._id })
      .populate('senderId', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .exec();
  }

  async sendMessage(userId: string, groupId: string, dto: SendMessageDto): Promise<MessageDocument> {
    const group = await this.conversationGroupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const workspace = await this.workspaceModel.findById(group.workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.checkWorkspaceMember(userId, workspace);

    const message = await this.messageModel.create({
      conversationId: group._id,
      workspaceId: workspace._id,
      senderId: new Types.ObjectId(userId),
      content: dto.content,
      attachments: dto.attachments || [],
    });

    const populatedMessage = await message.populate('senderId', 'name email avatarUrl');
    this.eventsGateway.broadcastNewMessage(groupId, populatedMessage);
    return populatedMessage;
  }
}
