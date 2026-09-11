import {
  BadRequestException,
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
import { Workspace, WorkspaceDocument } from '../schemas/workspace.schema.js';
import { EventsGateway } from '../websockets/events.gateway.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private aiClient: GoogleGenAI | null = null;

  constructor(
    @InjectModel(AiAuditLog.name) private readonly aiAuditLogModel: Model<AiAuditLogDocument>,
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<WorkspaceDocument>,
    private readonly workspacesService: WorkspacesService,
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
    const lower = prompt.toLowerCase();

    // Match "create workspace [name]"
    const createWsMatch = prompt.match(/create\s+(?:a\s+)?workspace\s+(?:named\s+|called\s+)?["']?([^"',.]+?)["']?(?:\s+with\s+description\s+["']?([^"']+)["']?)?$/i) ||
                          prompt.match(/create\s+workspace\s+([a-zA-Z0-9\s-_]+)/i);

    if (createWsMatch) {
      const name = createWsMatch[1].trim();
      const description = createWsMatch[2]?.trim();
      actions.push({
        tool: 'createWorkspace',
        args: { name, description },
      });
    }

    // Match "invite [email] to [workspace]" or "invite [email]"
    const inviteMatch = prompt.match(/invite\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+to\s+(?:workspace\s+)?["']?([^"']+)["']?)?/i);
    if (inviteMatch) {
      const email = inviteMatch[1].trim();
      const targetWs = inviteMatch[2]?.trim() || defaultWorkspaceId;
      actions.push({
        tool: 'sendWorkspaceInvite',
        args: { email, workspaceIdOrName: targetWs },
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
          summary: `AI Assistant: No executable workspace or invitation actions detected in prompt "${prompt}". You can try: "Create workspace Mobile App" or "Invite alex@company.com".`,
          actionsExecuted: [],
          auditLogId: auditLog._id.toString(),
        };
      }

      // Execute tool actions
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
          let targetWsId = activeWorkspaceId;
          if (call.args.workspaceIdOrName) {
            if (Types.ObjectId.isValid(call.args.workspaceIdOrName)) {
              targetWsId = call.args.workspaceIdOrName;
            } else {
              const ws = await this.workspaceModel.findOne({
                $or: [
                  { name: new RegExp(`^${call.args.workspaceIdOrName}$`, 'i') },
                  { slug: call.args.workspaceIdOrName.toLowerCase() },
                ],
              }).exec();
              if (ws) {
                targetWsId = ws._id.toString();
              }
            }
          }

          if (!targetWsId) {
            throw new NotFoundException('Target workspace not specified or found for sending invitation.');
          }

          const invite = await this.workspacesService.inviteMember(userId, targetWsId, {
            email: call.args.email,
            role: call.args.role || 'MEMBER',
          });

          actionsExecuted.push({
            actionType: 'SEND_INVITE',
            targetId: invite.workspaceId.toString(),
            summary: `Sent email invitation to ${call.args.email}`,
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
