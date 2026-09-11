import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationGroupDocument = ConversationGroup & Document;

@Schema({ timestamps: true })
export class ConversationGroup {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const ConversationGroupSchema = SchemaFactory.createForClass(ConversationGroup);

ConversationGroupSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
