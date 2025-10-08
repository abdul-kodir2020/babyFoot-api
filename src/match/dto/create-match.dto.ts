import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMatchDto {
  @IsInt()
  sportId: number;

  @IsInt()
  teamAId: number;

  @IsInt()
  teamBId: number;

  @IsOptional()
  scoreTeamA?: number;

  @IsOptional()
  scoreTeamB?: number;
}
