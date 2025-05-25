import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'El número debe contener solo dígitos' })
  to: string; // Ejemplo: "5511999999999"

  @IsString()
  @IsNotEmpty()
  text: string;
}