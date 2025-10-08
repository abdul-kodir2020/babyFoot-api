import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateSportDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  rules?: string;
}
