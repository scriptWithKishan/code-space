import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  private getUserId(req: any): string {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createWorkspace(@Req() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(this.getUserId(req), dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserWorkspaces(@Req() req: any) {
    return this.workspacesService.getUserWorkspaces(this.getUserId(req));
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceBySlug(@Req() req: any, @Param('slug') slug: string) {
    return this.workspacesService.getWorkspaceBySlug(this.getUserId(req), slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateWorkspace(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateWorkspace(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteWorkspace(@Req() req: any, @Param('id') id: string) {
    return this.workspacesService.deleteWorkspace(this.getUserId(req), id);
  }

  @Post(':id/invites')
  @UseGuards(JwtAuthGuard)
  async inviteMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(this.getUserId(req), id, dto);
  }

  @Get('invites/:token')
  async getInviteDetails(@Param('token') token: string) {
    return this.workspacesService.getInviteDetails(token);
  }

  @Post('invites/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Req() req: any, @Body() dto: AcceptInviteDto) {
    return this.workspacesService.acceptInvite(this.getUserId(req), dto.token);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceMembers(@Req() req: any, @Param('id') id: string) {
    return this.workspacesService.getWorkspaceMembers(this.getUserId(req), id);
  }

  @Delete(':id/members/:memberUserId')
  @UseGuards(JwtAuthGuard)
  async removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.workspacesService.removeMember(this.getUserId(req), id, memberUserId);
  }
}
