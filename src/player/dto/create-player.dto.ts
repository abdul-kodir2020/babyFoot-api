import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class CreatePlayerDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
