import { IsInt, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateMatchDto {
  @IsInt()
  sportId: number;

  // Joueurs de l'équipe A (1 ou 2 joueurs)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  teamAPlayerIds: number[];

  // Joueurs de l'équipe B (1 ou 2 joueurs)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  teamBPlayerIds: number[];

  @IsOptional()
  @IsInt()
  scoreTeamA?: number;

  @IsOptional()
  @IsInt()
  scoreTeamB?: number;
}
