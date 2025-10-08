import { IsNotEmpty, IsInt, IsOptional, ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

export class CreateTeamDto {
  // Un nom facultatif pour l'équipe
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  // Liste des IDs joueurs (1 ou 2 joueurs)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  players: number[];
}
