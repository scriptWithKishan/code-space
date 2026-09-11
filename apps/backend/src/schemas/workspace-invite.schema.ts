import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WorkspaceRole } from './workspace.schema.js';

export type WorkspaceInviteDocument = WorkspaceInvite & Document;

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class WorkspaceInvite {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ required: true, enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  role: string;

  @Prop({ required: true, enum: InviteStatus, default: InviteStatus.PENDING })
  status: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const WorkspaceInviteSchema = SchemaFactory.createForClass(WorkspaceInvite);
