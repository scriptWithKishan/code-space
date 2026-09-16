import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, enum: TaskStatus, default: TaskStatus.TODO })
  status: string;

  @Prop({ required: true, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assigneeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: Date, required: false })
  dueDate?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
