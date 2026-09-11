import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecutePromptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt: string;

  @IsString()
  @IsOptional()
  workspaceId?: string;
}
