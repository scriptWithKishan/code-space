import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema.js';
import { Task, TaskDocument, TaskPriority, TaskStatus } from '../schemas/task.schema.js';
import { Workspace, WorkspaceDocument, WorkspaceRole } from '../schemas/workspace.schema.js';
import { User, UserDocument } from '../schemas/user.schema.js';
import { EventsGateway } from '../websockets/events.gateway.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddMembersDto } from './dto/add-members.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

  private async generateUniqueProjectSlug(workspaceId: Types.ObjectId, name: string): Promise<string> {
    const baseSlug = this.slugify(name) || 'project';
    let slug = baseSlug;
    let count = 1;
    while (await this.projectModel.findOne({ workspaceId, slug })) {
      slug = `${baseSlug}-${count++}`;
    }
    return slug;
  }

  async checkWorkspaceAccess(userId: string, workspaceId: string, requiredRole?: WorkspaceRole) {
    const wsObjId = new Types.ObjectId(workspaceId);
    const uObjId = new Types.ObjectId(userId);

    const workspace = await this.workspaceModel.findById(wsObjId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    const isOwner = workspace.ownerId.toString() === userId;

    if (!member && !isOwner) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (requiredRole === WorkspaceRole.ADMIN) {
      const isAdmin = isOwner || (member && member.role === WorkspaceRole.ADMIN);
      if (!isAdmin) {
        throw new ForbiddenException('Only Workspace Admins can perform this action');
      }
    }

    return workspace;
  }

  async createProject(userId: string, workspaceId: string, dto: CreateProjectDto): Promise<ProjectDocument> {
    const workspace = await this.checkWorkspaceAccess(userId, workspaceId, WorkspaceRole.ADMIN);
    const wsObjId = workspace._id as Types.ObjectId;
    const userObjId = new Types.ObjectId(userId);

    const slug = await this.generateUniqueProjectSlug(wsObjId, dto.name);

    // Filter valid member objectIds from workspace members
    const requestedMemberIds = dto.memberIds || [];
    const validMemberObjIds: Types.ObjectId[] = [userObjId];

    for (const memberIdStr of requestedMemberIds) {
      if (Types.ObjectId.isValid(memberIdStr)) {
        const objId = new Types.ObjectId(memberIdStr);
        const isWsMember = workspace.members.some((m) => m.userId.equals(objId)) || workspace.ownerId.equals(objId);
        if (isWsMember && !validMemberObjIds.some((id) => id.equals(objId))) {
          validMemberObjIds.push(objId);
        }
      }
    }

    const project = new this.projectModel({
      workspaceId: wsObjId,
      name: dto.name,
      slug,
      description: dto.description,
      creatorId: userObjId,
      members: validMemberObjIds,
    });

    const savedProject = await project.save();

    // Broadcast WebSocket updates
    this.eventsGateway.server?.to(`workspace:${workspaceId}`).emit('workspace:updated', {
      type: 'PROJECT_CREATED',
      projectId: savedProject._id.toString(),
      workspaceId,
    });

    return savedProject;
  }

  async getWorkspaceProjects(userId: string, workspaceId: string): Promise<ProjectDocument[]> {
    await this.checkWorkspaceAccess(userId, workspaceId);
    return this.projectModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .populate('members', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getRecentProjects(userId: string): Promise<ProjectDocument[]> {
    const userObjId = new Types.ObjectId(userId);
    const workspaces = await this.workspaceModel
      .find({
        $or: [{ ownerId: userObjId }, { 'members.userId': userObjId }],
      })
      .select('_id')
      .exec();

    const workspaceIds = workspaces.map((w) => w._id);
    if (workspaceIds.length === 0) return [];

    return this.projectModel
      .find({ workspaceId: { $in: workspaceIds } })
      .populate('members', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getProjectById(userId: string, projectId: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }
    const project = await this.projectModel
      .findById(projectId)
      .populate('members', 'name email avatarUrl')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceAccess(userId, project.workspaceId.toString());
    return project;
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = await this.getProjectById(userId, projectId);
    await this.checkWorkspaceAccess(userId, project.workspaceId.toString(), WorkspaceRole.ADMIN);

    if (dto.name && dto.name !== project.name) {
      project.name = dto.name;
      project.slug = await this.generateUniqueProjectSlug(project.workspaceId, dto.name);
    }
    if (dto.description !== undefined) {
      project.description = dto.description;
    }
    if (dto.status) {
      project.status = dto.status;
    }
    if (dto.memberIds) {
      const validMemberObjIds: Types.ObjectId[] = [];
      const workspace = await this.workspaceModel.findById(project.workspaceId);
      for (const idStr of dto.memberIds) {
        if (Types.ObjectId.isValid(idStr)) {
          const objId = new Types.ObjectId(idStr);
          if (workspace && (workspace.members.some((m) => m.userId.equals(objId)) || workspace.ownerId.equals(objId))) {
            if (!validMemberObjIds.some((id) => id.equals(objId))) {
              validMemberObjIds.push(objId);
            }
          }
        }
      }
      project.members = validMemberObjIds;
    }

    const updated = await project.save();
    this.eventsGateway.server?.to(`workspace:${project.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'PROJECT_UPDATED',
      projectId: updated._id.toString(),
    });

    return updated;
  }

  async addMembersToProject(userId: string, projectId: string, dto: AddMembersDto): Promise<ProjectDocument> {
    const project = await this.getProjectById(userId, projectId);
    await this.checkWorkspaceAccess(userId, project.workspaceId.toString(), WorkspaceRole.ADMIN);

    const workspace = await this.workspaceModel.findById(project.workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    const currentMemberStrSet = new Set(project.members.map((m: any) => m._id ? m._id.toString() : m.toString()));

    for (const newIdStr of dto.memberIds) {
      if (Types.ObjectId.isValid(newIdStr)) {
        const objId = new Types.ObjectId(newIdStr);
        const isWsMember = workspace.members.some((m) => m.userId.equals(objId)) || workspace.ownerId.equals(objId);
        if (isWsMember && !currentMemberStrSet.has(newIdStr)) {
          currentMemberStrSet.add(newIdStr);
          project.members.push(objId);
        }
      }
    }

    const updated = await project.save();
    return this.getProjectById(userId, updated._id.toString());
  }

  async removeMemberFromProject(userId: string, projectId: string, memberUserId: string): Promise<ProjectDocument> {
    const project = await this.getProjectById(userId, projectId);
    await this.checkWorkspaceAccess(userId, project.workspaceId.toString(), WorkspaceRole.ADMIN);

    project.members = project.members.filter((m: any) => {
      const idStr = m._id ? m._id.toString() : m.toString();
      return idStr !== memberUserId;
    });

    const updated = await project.save();
    return this.getProjectById(userId, updated._id.toString());
  }

  async deleteProject(userId: string, projectId: string): Promise<{ success: boolean; message: string }> {
    const project = await this.getProjectById(userId, projectId);
    await this.checkWorkspaceAccess(userId, project.workspaceId.toString(), WorkspaceRole.ADMIN);

    // Clean up associated tasks
    await this.taskModel.deleteMany({ projectId: project._id }).exec();
    await this.projectModel.findByIdAndDelete(project._id).exec();

    this.eventsGateway.server?.to(`workspace:${project.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'PROJECT_DELETED',
      projectId,
    });

    return { success: true, message: 'Project deleted successfully' };
  }

  async getProjectStats(userId: string, projectId: string) {
    const project = await this.getProjectById(userId, projectId);
    const projObjId = project._id as Types.ObjectId;

    const tasks = await this.taskModel.find({ projectId: projObjId }).lean().exec();

    let totalTasks = 0;
    let completedTasks = 0;
    let highUrgentTasksCount = 0;

    const statusBreakdown = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    const priorityBreakdown = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    for (const t of tasks) {
      totalTasks++;

      if (t.status === TaskStatus.DONE) {
        completedTasks++;
        statusBreakdown.DONE++;
      } else if (t.status === TaskStatus.TODO) {
        statusBreakdown.TODO++;
      } else if (t.status === TaskStatus.IN_PROGRESS) {
        statusBreakdown.IN_PROGRESS++;
      } else if (t.status === TaskStatus.IN_REVIEW) {
        statusBreakdown.IN_REVIEW++;
      }

      if (t.priority === TaskPriority.HIGH) {
        highUrgentTasksCount++;
        priorityBreakdown.HIGH++;
      } else if (t.priority === TaskPriority.URGENT) {
        highUrgentTasksCount++;
        priorityBreakdown.URGENT++;
      } else if (t.priority === TaskPriority.LOW) {
        priorityBreakdown.LOW++;
      } else if (t.priority === TaskPriority.MEDIUM) {
        priorityBreakdown.MEDIUM++;
      }
    }

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      projectId: project._id.toString(),
      projectName: project.name,
      totalTasks,
      completedTasks,
      completionPercentage,
      highUrgentTasksCount,
      teamCount: project.members.length,
      statusBreakdown,
      priorityBreakdown,
    };
  }
}
