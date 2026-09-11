import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { WorkspaceRole } from '../../schemas/workspace.schema.js';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(WorkspaceRole)
  @IsOptional()
  role?: WorkspaceRole = WorkspaceRole.MEMBER;
}
