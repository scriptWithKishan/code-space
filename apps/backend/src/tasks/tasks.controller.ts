import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  private getUserId(req: any): string {
    return req.user._id ? req.user._id.toString() : req.user.id;
  }

  @Post('projects/:projectId/tasks')
  async createTask(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(this.getUserId(req), projectId, dto);
  }

  @Post('tasks')
  async createTaskDirect(
    @Req() req: any,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(this.getUserId(req), dto.projectId || '', dto);
  }

  @Get('projects/:projectId/tasks')
  async getProjectTasks(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query() query: GetTasksQueryDto,
  ) {
    return this.tasksService.getProjectTasks(this.getUserId(req), projectId, query);
  }

  @Get('tasks/:taskId')
  async getTaskById(
    @Req() req: any,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getTaskById(this.getUserId(req), taskId);
  }

  @Patch('tasks/:taskId/status')
  async updateTaskStatus(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateTaskStatus(this.getUserId(req), taskId, dto);
  }

  @Patch('tasks/:taskId')
  async updateTask(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(this.getUserId(req), taskId, dto);
  }

  @Delete('tasks/:taskId')
  async deleteTask(
    @Req() req: any,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.deleteTask(this.getUserId(req), taskId);
  }
}
