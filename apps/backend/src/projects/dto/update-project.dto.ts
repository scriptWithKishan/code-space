import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '../../schemas/project.schema.js';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
