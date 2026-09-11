import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiAuditLog, AiAuditLogSchema } from '../schemas/ai-audit-log.schema.js';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { MailModule } from '../mail/mail.module.js';
import { WebSocketsModule } from '../websockets/websockets.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiAuditLog.name, schema: AiAuditLogSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
    WorkspacesModule,
    MailModule,
    WebSocketsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
