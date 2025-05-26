// Archivo: src/modules/whatsapp/dto/bulk-message.dto.ts
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsOptional, Min, IsNumber } from 'class-validator';

export class BulkMessageDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsNumber()
  @Min(1000) // Mínimo 1 segundo entre mensajes
  delayBetweenMessages?: number;
}