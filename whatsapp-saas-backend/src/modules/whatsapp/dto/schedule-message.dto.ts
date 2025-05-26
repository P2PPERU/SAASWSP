import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class ScheduleMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsDateString()
  sendAt: string;
}