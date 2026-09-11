import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AiService } from './ai.service.js';
import { ExecutePromptDto } from './dto/execute-prompt.dto.js';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  private getUserId(req: any): string {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }

  @Post('execute')
  async executePrompt(@Req() req: any, @Body() dto: ExecutePromptDto) {
    return this.aiService.executePrompt(
      this.getUserId(req),
      dto.prompt,
      dto.workspaceId,
    );
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Req() req: any,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.aiService.getAuditLogs(this.getUserId(req), workspaceId);
  }
}
