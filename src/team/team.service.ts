import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeamDto) {
    // Vérifications : players length 1 ou 2 (DTO déjà valide), et existence des joueurs
    const players = await this.prisma.player.findMany({
      where: { id: { in: dto.players } },
    });
    if (players.length !== dto.players.length) {
      throw new BadRequestException('Au moins un joueur spécifié est introuvable');
    }

    // Si on veut contraindre maximum 2 joueurs : déjà assuré par DTO
    const data: any = {
      // on stockera players via player1Id / player2Id
      player1Id: dto.players[0],
      player2Id: dto.players[1] ?? null,
    };

    const team = await this.prisma.team.create({ data });
    return team;
  }

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        player1: true,
        player2: true,
      },
    });
  }

  async findOne(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { player1: true, player2: true },
    });
    if (!team) throw new NotFoundException('Équipe introuvable');
    return team;
  }

  async addPlayer(teamId: number, playerId: number) {
    const team = await this.findOne(teamId);
    if (team.player2Id) throw new BadRequestException('Équipe complète (2 joueurs max)');
    // éviter doublon
    if (team.player1Id === playerId) throw new BadRequestException('Le joueur est déjà dans l\'équipe');

    // vérifier existence du joueur
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Joueur introuvable');

    return this.prisma.team.update({
      where: { id: teamId },
      data: { player2Id: playerId },
      include: { player1: true, player2: true },
    });
  }

  async removePlayer(teamId: number, playerId: number) {
    const team = await this.findOne(teamId);
    if (team.player1Id === playerId) {
      // shift player2 to player1 if present, sinon supprimer player1
      if (team.player2Id) {
        return this.prisma.team.update({
          where: { id: teamId },
          data: {
            player1Id: team.player2Id,
            player2Id: null,
          },
          include: { player1: true, player2: true },
        });
      } else {
        // équipe devient vide ? on supprime l'équipe
        return this.prisma.team.delete({ where: { id: teamId } });
      }
    } else if (team.player2Id === playerId) {
      return this.prisma.team.update({
        where: { id: teamId },
        data: { player2Id: null },
        include: { player1: true, player2: true },
      });
    } else {
      throw new BadRequestException('Le joueur n\'appartient pas à cette équipe');
    }
  }
}
