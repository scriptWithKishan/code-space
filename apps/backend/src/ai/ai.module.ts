import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiAuditLog, AiAuditLogSchema } from '../schemas/ai-audit-log.schema.js';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { Project, ProjectSchema } from '../schemas/project.schema.js';
import { User, UserSchema } from '../schemas/user.schema.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { MailModule } from '../mail/mail.module.js';
import { WebSocketsModule } from '../websockets/websockets.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiAuditLog.name, schema: AiAuditLogSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WorkspacesModule,
    ProjectsModule,
    MailModule,
    WebSocketsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
