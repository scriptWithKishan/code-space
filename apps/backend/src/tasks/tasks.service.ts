import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskPriority, TaskStatus } from '../schemas/task.schema.js';
import { Project, ProjectDocument } from '../schemas/project.schema.js';
import { Workspace, WorkspaceDocument, WorkspaceRole } from '../schemas/workspace.schema.js';
import { User, UserDocument } from '../schemas/user.schema.js';
import { EventsGateway } from '../websockets/events.gateway.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto.js';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async checkWorkspaceAccess(
    userId: string,
    workspaceId: string | Types.ObjectId,
    requiredRole?: WorkspaceRole,
  ): Promise<WorkspaceDocument> {
    const wsObjId = typeof workspaceId === 'string' ? new Types.ObjectId(workspaceId) : workspaceId;

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

  async createTask(userId: string, projectId: string, dto: CreateTaskDto): Promise<TaskDocument> {
    const targetProjectId = projectId || dto.projectId;
    if (!targetProjectId || !Types.ObjectId.isValid(targetProjectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findById(targetProjectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceAccess(userId, project.workspaceId, WorkspaceRole.ADMIN);

    let assigneeObjId: Types.ObjectId | undefined = undefined;
    if (dto.assigneeId && dto.assigneeId.trim() !== '') {
      if (!Types.ObjectId.isValid(dto.assigneeId)) {
        throw new BadRequestException('Invalid assignee user ID');
      }
      assigneeObjId = new Types.ObjectId(dto.assigneeId);
    }

    const task = new this.taskModel({
      projectId: project._id,
      workspaceId: project.workspaceId,
      title: dto.title.trim(),
      description: dto.description?.trim() || undefined,
      priority: dto.priority || TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      assigneeId: assigneeObjId,
      creatorId: new Types.ObjectId(userId),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const savedTask = await task.save();

    this.eventsGateway.server?.to(`workspace:${project.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'TASK_CREATED',
      taskId: savedTask._id.toString(),
      projectId: project._id.toString(),
    });

    return this.getTaskById(userId, savedTask._id.toString());
  }

  async getProjectTasks(userId: string, projectId: string, query: GetTasksQueryDto) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceAccess(userId, project.workspaceId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      projectId: new Types.ObjectId(projectId),
    };

    if (query.myTasks) {
      filter.assigneeId = new Types.ObjectId(userId);
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('assigneeId', 'name email avatarUrl')
        .populate('creatorId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return {
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  async getTaskById(userId: string, taskId: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel
      .findById(taskId)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl')
      .populate('projectId', 'name slug')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceAccess(userId, task.workspaceId);
    return task;
  }

  async updateTaskStatus(userId: string, taskId: string, dto: UpdateTaskStatusDto): Promise<TaskDocument> {
    const task = await this.getTaskById(userId, taskId);
    await this.checkWorkspaceAccess(userId, task.workspaceId);

    const assigneeIdStr = task.assigneeId
      ? typeof task.assigneeId === 'object'
        ? String((task.assigneeId as any)._id || (task.assigneeId as any).id || '')
        : String(task.assigneeId)
      : null;

    const isAssignee = Boolean(assigneeIdStr && assigneeIdStr === userId);

    if (!isAssignee) {
      throw new ForbiddenException('Only the user assigned to this task can change its status');
    }

    task.status = dto.status;
    const updated = await task.save();

    this.eventsGateway.server?.to(`workspace:${task.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'TASK_UPDATED',
      taskId: updated._id.toString(),
      projectId: task.projectId._id ? task.projectId._id.toString() : task.projectId.toString(),
    });

    return this.getTaskById(userId, updated._id.toString());
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = await this.getTaskById(userId, taskId);
    await this.checkWorkspaceAccess(userId, task.workspaceId, WorkspaceRole.ADMIN);

    if (dto.title !== undefined) {
      task.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      task.description = dto.description.trim() || undefined;
    }
    if (dto.priority !== undefined) {
      task.priority = dto.priority;
    }
    if (dto.status !== undefined) {
      task.status = dto.status;
    }
    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId && dto.assigneeId.trim() !== '') {
        if (!Types.ObjectId.isValid(dto.assigneeId)) {
          throw new BadRequestException('Invalid assignee ID');
        }
        task.assigneeId = new Types.ObjectId(dto.assigneeId);
      } else {
        task.assigneeId = undefined;
      }
    }
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    }

    const updated = await task.save();

    this.eventsGateway.server?.to(`workspace:${task.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'TASK_UPDATED',
      taskId: updated._id.toString(),
      projectId: task.projectId._id ? task.projectId._id.toString() : task.projectId.toString(),
    });

    return this.getTaskById(userId, updated._id.toString());
  }

  async deleteTask(userId: string, taskId: string): Promise<{ success: boolean; message: string }> {
    const task = await this.getTaskById(userId, taskId);
    await this.checkWorkspaceAccess(userId, task.workspaceId, WorkspaceRole.ADMIN);

    await this.taskModel.findByIdAndDelete(taskId).exec();

    this.eventsGateway.server?.to(`workspace:${task.workspaceId.toString()}`).emit('workspace:updated', {
      type: 'TASK_DELETED',
      taskId,
      projectId: task.projectId._id ? task.projectId._id.toString() : task.projectId.toString(),
    });

    return { success: true, message: 'Task deleted successfully' };
  }
}
