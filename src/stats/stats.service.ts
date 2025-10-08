import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  // Leaderboard par sport (ordre décroissant de eloRating)
  async getLeaderboard(sportId: number, limit = 50) {
    // vérifier sport existant
    const sport = await this.prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) throw new NotFoundException('Sport introuvable');

    return this.prisma.playerStats.findMany({
      where: { sportId },
      include: { player: true },
      orderBy: { eloRating: 'desc' },
      take: limit,
    });
  }

  async getPlayerStats(playerId: number, sportId: number) {
    const stats = await this.prisma.playerStats.findUnique({
      where: { playerId_sportId: { playerId, sportId } },
      include: { player: true, sport: true },
    });
    if (!stats) throw new NotFoundException('Stats introuvables pour ce joueur/sport');
    return stats;
  }

  // récupérer stats globales
  async getAllStats(playerId: number) {
    return this.prisma.playerStats.findMany({
      where: { playerId },
      include: { sport: true },
    });
  }
}
