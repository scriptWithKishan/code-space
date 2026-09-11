import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationGroup, ConversationGroupSchema } from '../schemas/conversation-group.schema.js';
import { Message, MessageSchema } from '../schemas/message.schema.js';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationGroup.name, schema: ConversationGroupSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
