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
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddMembersDto } from './dto/add-members.dto.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  private getUserId(req: any): string {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }

  @Post('workspaces/:workspaceId/projects')
  async createProject(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(this.getUserId(req), workspaceId, dto);
  }

  @Get('workspaces/:workspaceId/projects')
  async getWorkspaceProjects(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectsService.getWorkspaceProjects(this.getUserId(req), workspaceId);
  }

  @Get('projects/recent')
  async getRecentProjects(@Req() req: any) {
    return this.projectsService.getRecentProjects(this.getUserId(req));
  }

  @Get('projects/:projectId')
  async getProjectById(
    @Req() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProjectById(this.getUserId(req), projectId);
  }

  @Patch('projects/:projectId')
  async updateProject(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(this.getUserId(req), projectId, dto);
  }

  @Post('projects/:projectId/members')
  async addMembersToProject(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.projectsService.addMembersToProject(this.getUserId(req), projectId, dto);
  }

  @Delete('projects/:projectId/members/:memberUserId')
  async removeMemberFromProject(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.projectsService.removeMemberFromProject(this.getUserId(req), projectId, memberUserId);
  }

  @Get('projects/:projectId/stats')
  async getProjectStats(
    @Req() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProjectStats(this.getUserId(req), projectId);
  }

  @Delete('projects/:projectId')
  async deleteProject(
    @Req() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.deleteProject(this.getUserId(req), projectId);
  }
}
