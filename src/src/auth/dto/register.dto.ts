// src/articles/dto/create-article.dto.ts
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDTO {
  @IsNotEmpty()
  first_name: string;

  last_name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Matches(/^[6-9]\d{9}$/)
  mobile: number;

  email_id: string

  @IsNotEmpty()
  role: string

  @IsNotEmpty()
  role_fields: {}
    
}
