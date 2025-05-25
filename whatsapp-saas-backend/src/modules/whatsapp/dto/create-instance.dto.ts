// dto/create-instance.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}