import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoogleGenAI, Type } from '@google/genai';
import { AiAuditLog, AiAuditLogDocument, AiAuditLogStatus, ExecutedAction } from '../schemas/ai-audit-log.schema.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { Workspace, WorkspaceDocument } from '../schemas/workspace.schema.js';
import { Project, ProjectDocument } from '../schemas/project.schema.js';
import { Task, TaskDocument, TaskPriority, TaskStatus } from '../schemas/task.schema.js';
import { User, UserDocument } from '../schemas/user.schema.js';
import { EventsGateway } from '../websockets/events.gateway.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private aiClient: GoogleGenAI | null = null;

  constructor(
    @InjectModel(AiAuditLog.name) private readonly aiAuditLogModel: Model<AiAuditLogDocument>,
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
        this.logger.log('[AiService] Initialized Google Gemini API client');
      } catch (error) {
        this.logger.error('[AiService] Failed to initialize Google Gemini client', error);
      }
    } else {
      this.logger.warn('[AiService] GEMINI_API_KEY not provided. Fallback to smart natural language parser.');
    }
  }

  private parseFallbackPrompt(prompt: string, defaultWorkspaceId?: string) {
    const actions: Array<{ tool: string; args: any }> = [];

    // Match "create workspace [name]"
    const createWsMatch = prompt.match(/create\s+(?:a\s+)?workspace\s+(?:named\s+|called\s+)?["']?([^"',.]+?)["']?(?:\s+with\s+description\s+["']?([^"']+)["']?)?$/i);
    if (createWsMatch) {
      actions.push({
        tool: 'createWorkspace',
        args: { name: createWsMatch[1].trim(), description: createWsMatch[2]?.trim() },
      });
    }

    // Match "invite [email] to [workspace]"
    const inviteMatch = prompt.match(/invite\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+to\s+(?:workspace\s+)?["']?([^"']+)["']?)?/i);
    if (inviteMatch) {
      actions.push({
        tool: 'sendWorkspaceInvite',
        args: { email: inviteMatch[1].trim(), workspaceIdOrName: inviteMatch[2]?.trim() || defaultWorkspaceId },
      });
    }

    // Match "create project [name]"
    const createProjMatch = prompt.match(/create\s+(?:a\s+)?project\s+(?:named\s+|called\s+)?["']?([^"',.]+?)["']?(?:\s+with\s+description\s+["']?([^"']+)["']?)?$/i);
    if (createProjMatch) {
      actions.push({
        tool: 'createProject',
        args: { name: createProjMatch[1].trim(), description: createProjMatch[2]?.trim() },
      });
    }

    // Match "delete project [name]"
    const deleteProjMatch = prompt.match(/delete\s+(?:project\s+)?["']?([^"',.]+?)["']?$/i);
    if (deleteProjMatch) {
      actions.push({
        tool: 'deleteProject',
        args: { projectNameOrId: deleteProjMatch[1].trim() },
      });
    }

    // Match "create task [title]"
    const createTaskMatch = prompt.match(/create\s+(?:an?\s+)?(?:urgent\s+|high\s+priority\s+)?task\s+(?:named\s+|called\s+)?["']?([^"',.]+?)["']?(?:\s+(?:in|for)\s+project\s+["']?([^"']+)["']?)?/i);
    if (createTaskMatch) {
      const isUrgent = /urgent/i.test(prompt);
      const isHigh = /high\s+priority/i.test(prompt);
      const priority = isUrgent ? 'URGENT' : isHigh ? 'HIGH' : 'MEDIUM';
      
      let assigneeNameOrEmail: string | undefined = undefined;
      const assignMatch = prompt.match(/assigned\s+to\s+["']?([^"',.]+?)["']?/i);
      if (assignMatch) assigneeNameOrEmail = assignMatch[1].trim();

      actions.push({
        tool: 'createTask',
        args: {
          title: createTaskMatch[1].trim(),
          projectNameOrId: createTaskMatch[2]?.trim(),
          priority,
          assigneeNameOrEmail,
        },
      });
    }

    // Match "update task [title]" / "change status of task [title] to [status]"
    const updateTaskMatch = prompt.match(/(?:update\s+task|change\s+status\s+of\s+task|set\s+status\s+of\s+task)\s+["']?([^"',.]+?)["']?\s+to\s+["']?([^"',.]+?)["']?$/i);
    if (updateTaskMatch) {
      const title = updateTaskMatch[1].trim();
      const statusRaw = updateTaskMatch[2].trim().toUpperCase().replace(/\s+/g, '_');
      let status: string | undefined = undefined;
      if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(statusRaw)) {
        status = statusRaw;
      } else if (statusRaw === 'COMPLETED') {
        status = 'DONE';
      }

      actions.push({
        tool: 'updateTask',
        args: {
          taskTitleOrId: title,
          status,
        },
      });
    }

    // Match "delete task [title]"
    const deleteTaskMatch = prompt.match(/delete\s+task\s+["']?([^"',.]+?)["']?$/i);
    if (deleteTaskMatch) {
      actions.push({
        tool: 'deleteTask',
        args: { taskTitleOrId: deleteTaskMatch[1].trim() },
      });
    }

    return actions;
  }

  async executePrompt(
    userId: string,
    prompt: string,
    activeWorkspaceId?: string,
  ): Promise<{
    summary: string;
    actionsExecuted: ExecutedAction[];
    auditLogId: string;
    createdWorkspaceSlug?: string;
  }> {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException('Prompt content is required.');
    }

    const userObjectId = new Types.ObjectId(userId);
    const actionsExecuted: ExecutedAction[] = [];
    let parsedIntent: any = null;
    let createdWorkspaceSlug: string | undefined = undefined;

    try {
      let toolCalls: Array<{ tool: string; args: any }> = [];

      if (this.aiClient) {
        try {
          const response = await this.aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an AI assistant for AI Code-Space platform. Convert user natural language prompts into platform actions. User prompt: "${prompt}"`,
            config: {
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: 'createWorkspace',
                      description: 'Create a new user workspace with name and optional description',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: 'Name of the workspace' },
                          description: { type: Type.STRING, description: 'Optional description' },
                        },
                        required: ['name'],
                      },
                    },
                    {
                      name: 'sendWorkspaceInvite',
                      description: 'Send an email invitation to a team member to join a workspace',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          workspaceIdOrName: { type: Type.STRING, description: 'Workspace ID or Name' },
                          email: { type: Type.STRING, description: 'Target email' },
                          role: { type: Type.STRING, enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
                        },
                        required: ['email'],
                      },
                    },
                    {
                      name: 'createProject',
                      description: 'Create a new project inside a workspace',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          workspaceIdOrName: { type: Type.STRING, description: 'Workspace ID or Name' },
                          name: { type: Type.STRING, description: 'Name of the project' },
                          description: { type: Type.STRING, description: 'Optional description' },
                          memberEmails: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Optional member emails to assign to project',
                          },
                        },
                        required: ['name'],
                      },
                    },
                    {
                      name: 'updateProject',
                      description: 'Update project title, description, or status',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID' },
                          name: { type: Type.STRING, description: 'New project title' },
                          description: { type: Type.STRING, description: 'New project description' },
                          status: { type: Type.STRING, enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] },
                        },
                        required: ['projectNameOrId'],
                      },
                    },
                    {
                      name: 'deleteProject',
                      description: 'Delete a project and its tasks',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID' },
                        },
                        required: ['projectNameOrId'],
                      },
                    },
                    {
                      name: 'addProjectMembers',
                      description: 'Add members to a project',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID' },
                          memberEmailsOrNames: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'List of member emails or names to assign',
                          },
                        },
                        required: ['projectNameOrId', 'memberEmailsOrNames'],
                      },
                    },
                    {
                      name: 'createTask',
                      description: 'Create a task inside a project with priority and optional assignee',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID' },
                          title: { type: Type.STRING, description: 'Task topic/title' },
                          description: { type: Type.STRING, description: 'Task message/content' },
                          priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                          assigneeNameOrEmail: { type: Type.STRING, description: 'User name or email to assign' },
                        },
                        required: ['title'],
                      },
                    },
                    {
                      name: 'updateTask',
                      description: 'Update task title, description, priority, status, or assignee',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          taskTitleOrId: { type: Type.STRING, description: 'Target task title or ID' },
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID (optional)' },
                          title: { type: Type.STRING, description: 'New task title' },
                          description: { type: Type.STRING, description: 'New task description' },
                          priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                          status: { type: Type.STRING, enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
                          assigneeNameOrEmail: { type: Type.STRING, description: 'User name or email to assign' },
                        },
                        required: ['taskTitleOrId'],
                      },
                    },
                    {
                      name: 'deleteTask',
                      description: 'Delete a task from a project',
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          taskTitleOrId: { type: Type.STRING, description: 'Target task title or ID' },
                          projectNameOrId: { type: Type.STRING, description: 'Target project name or ID (optional)' },
                        },
                        required: ['taskTitleOrId'],
                      },
                    },
                  ],
                },
              ],
            },
          });

          const candidates = response.candidates || [];
          if (candidates.length > 0 && candidates[0].content?.parts) {
            for (const part of candidates[0].content.parts) {
              if ((part as any).functionCall) {
                const fn = (part as any).functionCall;
                toolCalls.push({ tool: fn.name, args: fn.args });
              }
            }
          }
        } catch (apiError) {
          this.logger.warn('[AiService] Gemini API call failed, using fallback parser', apiError);
        }
      }

      if (toolCalls.length === 0) {
        toolCalls = this.parseFallbackPrompt(prompt, activeWorkspaceId);
      }

      parsedIntent = toolCalls;

      if (toolCalls.length === 0) {
        const auditLog = await this.aiAuditLogModel.create({
          userId: userObjectId,
          workspaceId: activeWorkspaceId && Types.ObjectId.isValid(activeWorkspaceId) ? new Types.ObjectId(activeWorkspaceId) : undefined,
          rawPrompt: prompt,
          parsedIntent: null,
          actionsExecuted: [],
          status: AiAuditLogStatus.SUCCESS,
        });

        return {
          summary: `AI Assistant: No executable actions detected in prompt "${prompt}". Try: "Create project Mobile Launch" or "Create urgent task Fix Auth assigned to Alex".`,
          actionsExecuted: [],
          auditLogId: auditLog._id.toString(),
        };
      }

      // Helper to find workspace by ID or name
      const findWorkspace = async (wsIdOrName?: string) => {
        let wsId = activeWorkspaceId;
        if (wsIdOrName) {
          if (Types.ObjectId.isValid(wsIdOrName)) {
            wsId = wsIdOrName;
          } else {
            const found = await this.workspaceModel.findOne({
              $or: [
                { name: new RegExp(`^${wsIdOrName}$`, 'i') },
                { slug: wsIdOrName.toLowerCase() },
              ],
            }).exec();
            if (found) wsId = found._id.toString();
          }
        }
        return wsId;
      };

      // Helper to find project by name or ID
      const findProject = async (targetWsId: string, projIdOrName?: string) => {
        if (!projIdOrName) {
          // Default to latest created project in workspace if not specified
          return this.projectModel.findOne({ workspaceId: new Types.ObjectId(targetWsId) }).sort({ createdAt: -1 }).exec();
        }
        if (Types.ObjectId.isValid(projIdOrName)) {
          return this.projectModel.findById(projIdOrName).exec();
        }
        return this.projectModel.findOne({
          workspaceId: new Types.ObjectId(targetWsId),
          $or: [
            { name: new RegExp(`^${projIdOrName}$`, 'i') },
            { slug: projIdOrName.toLowerCase() },
          ],
        }).exec();
      };

      // Helper to find user by name or email
      const findUserByNameOrEmail = async (identifier?: string) => {
        if (!identifier || !identifier.trim()) return null;
        const cleaned = identifier.trim();
        return this.userModel.findOne({
          $or: [
            { email: cleaned.toLowerCase() },
            { name: new RegExp(`^${cleaned}$`, 'i') },
          ],
        }).exec();
      };

      // Helper to find task by title or ID
      const findTaskByTitleOrId = async (targetWsId: string, taskTitleOrId: string, projectId?: string) => {
        if (Types.ObjectId.isValid(taskTitleOrId)) {
          return this.taskModel.findById(taskTitleOrId).exec();
        }
        const query: any = {
          workspaceId: new Types.ObjectId(targetWsId),
          title: new RegExp(`^${taskTitleOrId}$`, 'i'),
        };
        if (projectId && Types.ObjectId.isValid(projectId)) {
          query.projectId = new Types.ObjectId(projectId);
        }
        return this.taskModel.findOne(query).exec();
      };

      // Tool Call Execution Loop
      for (const call of toolCalls) {
        if (call.tool === 'createWorkspace') {
          const newWs = await this.workspacesService.createWorkspace(userId, {
            name: call.args.name,
            description: call.args.description,
          });
          createdWorkspaceSlug = newWs.slug;
          actionsExecuted.push({
            actionType: 'CREATE_WORKSPACE',
            targetId: newWs._id.toString(),
            summary: `Created workspace "${newWs.name}"`,
          });
        } else if (call.tool === 'sendWorkspaceInvite') {
          const targetWsId = await findWorkspace(call.args.workspaceIdOrName);
          if (!targetWsId) throw new NotFoundException('Target workspace not found for invite.');

          const invite = await this.workspacesService.inviteMember(userId, targetWsId, {
            email: call.args.email,
            role: call.args.role || 'MEMBER',
          });

          actionsExecuted.push({
            actionType: 'SEND_INVITE',
            targetId: invite.workspaceId.toString(),
            summary: `Sent email invitation to ${call.args.email}`,
          });
        } else if (call.tool === 'createProject') {
          const targetWsId = await findWorkspace(call.args.workspaceIdOrName);
          if (!targetWsId) throw new NotFoundException('Active workspace not found to create project.');

          const memberIds: string[] = [];
          if (call.args.memberEmails && Array.isArray(call.args.memberEmails)) {
            for (const email of call.args.memberEmails) {
              const u = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
              if (u) memberIds.push(u._id.toString());
            }
          }

          const project = await this.projectsService.createProject(userId, targetWsId, {
            name: call.args.name,
            description: call.args.description,
            memberIds,
          });

          actionsExecuted.push({
            actionType: 'CREATE_PROJECT',
            targetId: project._id.toString(),
            summary: `Created project "${project.name}"`,
          });
        } else if (call.tool === 'updateProject') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to update project.');

          const proj = await findProject(targetWsId, call.args.projectNameOrId);
          if (!proj) throw new NotFoundException(`Project "${call.args.projectNameOrId}" not found.`);

          const updated = await this.projectsService.updateProject(userId, proj._id.toString(), {
            name: call.args.name,
            description: call.args.description,
            status: call.args.status,
          });

          actionsExecuted.push({
            actionType: 'UPDATE_PROJECT',
            targetId: updated._id.toString(),
            summary: `Updated project "${updated.name}"`,
          });
        } else if (call.tool === 'deleteProject') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to delete project.');

          const proj = await findProject(targetWsId, call.args.projectNameOrId);
          if (!proj) throw new NotFoundException(`Project "${call.args.projectNameOrId}" not found.`);

          await this.projectsService.deleteProject(userId, proj._id.toString());

          actionsExecuted.push({
            actionType: 'DELETE_PROJECT',
            targetId: proj._id.toString(),
            summary: `Deleted project "${proj.name}"`,
          });
        } else if (call.tool === 'addProjectMembers') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to add project members.');

          const proj = await findProject(targetWsId, call.args.projectNameOrId);
          if (!proj) throw new NotFoundException(`Project "${call.args.projectNameOrId}" not found.`);

          const memberIds: string[] = [];
          if (call.args.memberEmailsOrNames && Array.isArray(call.args.memberEmailsOrNames)) {
            for (const item of call.args.memberEmailsOrNames) {
              const u = await findUserByNameOrEmail(item);
              if (u) memberIds.push(u._id.toString());
            }
          }

          if (memberIds.length > 0) {
            await this.projectsService.addMembersToProject(userId, proj._id.toString(), { memberIds });
          }

          actionsExecuted.push({
            actionType: 'ADD_PROJECT_MEMBERS',
            targetId: proj._id.toString(),
            summary: `Added members to project "${proj.name}"`,
          });
        } else if (call.tool === 'createTask') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to create task.');

          const proj = await findProject(targetWsId, call.args.projectNameOrId);
          if (!proj) throw new NotFoundException('Project not found to create task.');

          let assigneeId: string | undefined = undefined;
          if (call.args.assigneeNameOrEmail) {
            const assigneeUser = await findUserByNameOrEmail(call.args.assigneeNameOrEmail);
            if (assigneeUser) assigneeId = assigneeUser._id.toString();
          }

          const createdTask = await this.tasksService.createTask(userId, proj._id.toString(), {
            title: call.args.title,
            description: call.args.description,
            priority: call.args.priority,
            assigneeId,
          });

          actionsExecuted.push({
            actionType: 'CREATE_TASK',
            targetId: createdTask._id.toString(),
            summary: `Created task "${createdTask.title}" in project "${proj.name}"`,
          });
        } else if (call.tool === 'updateTask') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to update task.');

          const proj = call.args.projectNameOrId ? await findProject(targetWsId, call.args.projectNameOrId) : null;
          const targetTask = await findTaskByTitleOrId(targetWsId, call.args.taskTitleOrId, proj?._id?.toString());
          if (!targetTask) throw new NotFoundException(`Task "${call.args.taskTitleOrId}" not found.`);

          let assigneeId: string | undefined = undefined;
          if (call.args.assigneeNameOrEmail) {
            const assigneeUser = await findUserByNameOrEmail(call.args.assigneeNameOrEmail);
            if (assigneeUser) assigneeId = assigneeUser._id.toString();
          }

          const updatedTask = await this.tasksService.updateTask(userId, targetTask._id.toString(), {
            title: call.args.title,
            description: call.args.description,
            priority: call.args.priority,
            status: call.args.status,
            assigneeId,
          });

          actionsExecuted.push({
            actionType: 'UPDATE_TASK',
            targetId: updatedTask._id.toString(),
            summary: `Updated task "${updatedTask.title}"`,
          });
        } else if (call.tool === 'deleteTask') {
          const targetWsId = await findWorkspace();
          if (!targetWsId) throw new NotFoundException('Active workspace required to delete task.');

          const proj = call.args.projectNameOrId ? await findProject(targetWsId, call.args.projectNameOrId) : null;
          const targetTask = await findTaskByTitleOrId(targetWsId, call.args.taskTitleOrId, proj?._id?.toString());
          if (!targetTask) throw new NotFoundException(`Task "${call.args.taskTitleOrId}" not found.`);

          await this.tasksService.deleteTask(userId, targetTask._id.toString());

          actionsExecuted.push({
            actionType: 'DELETE_TASK',
            targetId: targetTask._id.toString(),
            summary: `Deleted task "${targetTask.title}"`,
          });
        }
      }

      // Save audit log entry
      const auditLog = await this.aiAuditLogModel.create({
        userId: userObjectId,
        workspaceId: activeWorkspaceId && Types.ObjectId.isValid(activeWorkspaceId) ? new Types.ObjectId(activeWorkspaceId) : undefined,
        rawPrompt: prompt,
        parsedIntent,
        actionsExecuted,
        status: AiAuditLogStatus.SUCCESS,
      });

      const summaryText = actionsExecuted.map((a) => a.summary).join(' and ');

      return {
        summary: `AI Prompt Executed: Successfully ${summaryText}.`,
        actionsExecuted,
        auditLogId: auditLog._id.toString(),
        createdWorkspaceSlug,
      };
    } catch (error: any) {
      this.logger.error(`[AiService] Failed to execute AI prompt: ${error?.message || error}`);

      await this.aiAuditLogModel.create({
        userId: userObjectId,
        workspaceId: activeWorkspaceId && Types.ObjectId.isValid(activeWorkspaceId) ? new Types.ObjectId(activeWorkspaceId) : undefined,
        rawPrompt: prompt,
        parsedIntent,
        actionsExecuted,
        status: AiAuditLogStatus.FAILED,
        errorMessage: error?.message || String(error),
      });

      throw new BadRequestException(`AI Execution Error: ${error?.message || 'Failed to process prompt'}`);
    }
  }

  async getAuditLogs(userId: string, workspaceId?: string) {
    const userObjectId = new Types.ObjectId(userId);
    const filter: any = { userId: userObjectId };
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
      filter.workspaceId = new Types.ObjectId(workspaceId);
    }
    return this.aiAuditLogModel.find(filter).sort({ createdAt: -1 }).limit(20).exec();
  }
}
