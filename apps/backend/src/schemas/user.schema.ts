import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ required: true, enum: ['local', 'google'], default: 'local' })
  provider: string;

  @Prop({ required: false })
  googleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
