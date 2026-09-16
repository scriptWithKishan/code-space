import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../schemas/project.schema.js';
import { Task, TaskSchema } from '../schemas/task.schema.js';
import { Workspace, WorkspaceSchema } from '../schemas/workspace.schema.js';
import { User, UserSchema } from '../schemas/user.schema.js';
import { WebSocketsModule } from '../websockets/websockets.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WebSocketsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
