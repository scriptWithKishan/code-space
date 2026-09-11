import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { WorkspaceInvite, WorkspaceInviteSchema } from '../schemas/workspace-invite.schema.js';
import { ConversationGroup, ConversationGroupSchema } from '../schemas/conversation-group.schema.js';
import { User, UserSchema } from '../schemas/user.schema.js';
import { MailModule } from '../mail/mail.module.js';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: WorkspaceInvite.name, schema: WorkspaceInviteSchema },
      { name: ConversationGroup.name, schema: ConversationGroupSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
