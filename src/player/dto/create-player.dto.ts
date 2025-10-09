import { Role } from '@prisma/client';
import { IsNotEmpty, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';

export class CreatePlayerDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
