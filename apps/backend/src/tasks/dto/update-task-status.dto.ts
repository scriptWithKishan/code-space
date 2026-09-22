import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../schemas/task.schema.js';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
