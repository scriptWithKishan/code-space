import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AiAuditLogDocument = AiAuditLog & Document;

export enum AiAuditLogStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

@Schema({ _id: false })
export class ExecutedAction {
  @Prop({ required: true })
  actionType: string;

  @Prop({ required: false })
  targetId?: string;

  @Prop({ required: true })
  summary: string;
}

const ExecutedActionSchema = SchemaFactory.createForClass(ExecutedAction);

@Schema({ timestamps: true })
export class AiAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: false, index: true })
  workspaceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  rawPrompt: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  parsedIntent: any;

  @Prop({ type: [ExecutedActionSchema], default: [] })
  actionsExecuted: ExecutedAction[];

  @Prop({ required: true, enum: AiAuditLogStatus, default: AiAuditLogStatus.SUCCESS })
  status: string;

  @Prop({ required: false })
  errorMessage?: string;
}

export const AiAuditLogSchema = SchemaFactory.createForClass(AiAuditLog);
