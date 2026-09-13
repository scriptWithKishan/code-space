import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  private getUserId(req: any): string {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }

  @Get('workspace/:workspaceIdOrSlug')
  async getWorkspaceGroups(
    @Req() req: any,
    @Param('workspaceIdOrSlug') workspaceIdOrSlug: string,
  ) {
    return this.conversationsService.getWorkspaceGroups(
      this.getUserId(req),
      workspaceIdOrSlug,
    );
  }

  @Post('workspace/:workspaceId')
  async createGroup(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.conversationsService.createGroup(
      this.getUserId(req),
      workspaceId,
      dto,
    );
  }

  @Get('workspace/:workspaceSlug/group/:groupSlug')
  async getGroupBySlug(
    @Req() req: any,
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('groupSlug') groupSlug: string,
  ) {
    return this.conversationsService.getGroupBySlug(
      this.getUserId(req),
      workspaceSlug,
      groupSlug,
    );
  }

  @Get('group/:groupId/messages')
  async getGroupMessages(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ) {
    return this.conversationsService.getGroupMessages(
      this.getUserId(req),
      groupId,
    );
  }

  @Post('group/:groupId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(
      this.getUserId(req),
      groupId,
      dto,
    );
  }

  @Delete('group/:groupId')
  async deleteGroup(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ) {
    return this.conversationsService.deleteGroup(
      this.getUserId(req),
      groupId,
    );
  }
}
