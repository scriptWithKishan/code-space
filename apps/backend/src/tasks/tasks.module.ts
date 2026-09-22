import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../schemas/task.schema.js';
import { Project, ProjectSchema } from '../schemas/project.schema.js';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { User, UserSchema } from '../schemas/user.schema.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { WebSocketsModule } from '../websockets/websockets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WebSocketsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
