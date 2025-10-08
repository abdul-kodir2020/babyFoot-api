import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { updateElo } from '../common/utils/elo.utils';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  async create(creatorId: number, dto: CreateMatchDto) {
    // Vérifier que le sport existe
    const sport = await this.prisma.sport.findUnique({ where: { id: dto.sportId } });
    if (!sport) throw new NotFoundException('Sport introuvable');

    // Vérifier les équipes
    const teamA = await this.prisma.team.findUnique({ where: { id: dto.teamAId } });
    const teamB = await this.prisma.team.findUnique({ where: { id: dto.teamBId } });
    if (!teamA || !teamB) throw new NotFoundException('Une des équipes est introuvable');
    if (teamA.id === teamB.id) throw new BadRequestException('Une équipe ne peut pas jouer contre elle-même');

    // Créer le match
    return this.prisma.match.create({
      data: {
        sportId: dto.sportId,
        creatorId,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        scoreTeamA: dto.scoreTeamA ?? 0,
        scoreTeamB: dto.scoreTeamB ?? 0,
        winnerTeam: '', // défini à la fin du match
      },
    });
  }

  async findOne(id: number) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        sport: true,
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
      },
    });
    if (!match) throw new NotFoundException('Match introuvable');
    return match;
  }

  async finishMatch(id: number, scoreTeamA: number, scoreTeamB: number) {
    const match = await this.findOne(id);

    // Déterminer le vainqueur
    const winnerTeam =
      scoreTeamA > scoreTeamB ? 'A' : scoreTeamB > scoreTeamA ? 'B' : 'DRAW';

    // Mise à jour du match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        scoreTeamA,
        scoreTeamB,
        winnerTeam,
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        sport: true,
      },
    });

    // Mise à jour des stats et du Elo
    await this.updateStatsAndElo(updatedMatch, scoreTeamA, scoreTeamB);

    return updatedMatch;
  }

  private async getTeamPlayerIds(team: any): Promise<number[]> {
    const ids: number[] = [];
    if (team.player1Id) ids.push(team.player1Id);
    if (team.player2Id) ids.push(team.player2Id);
    return ids;
  }

  private async updateStatsAndElo(match: any, scoreA: number, scoreB: number) {
    const sportId = match.sportId;

    // Récupérer les joueurs de chaque équipe
    const teamAPlayers = await this.getTeamPlayerIds(match.teamA);
    const teamBPlayers = await this.getTeamPlayerIds(match.teamB);

    // S'assurer que chaque joueur a des stats initialisées
    const allPlayerIds = [...teamAPlayers, ...teamBPlayers];
    for (const playerId of allPlayerIds) {
      await this.ensurePlayerStats(playerId, sportId);
    }

    // Calculer les Elo moyens
    const statsA = await this.prisma.playerStats.findMany({
      where: { playerId: { in: teamAPlayers }, sportId },
    });
    const statsB = await this.prisma.playerStats.findMany({
      where: { playerId: { in: teamBPlayers }, sportId },
    });

    const avgA =
      statsA.reduce((sum, s) => sum + s.eloRating, 0) / (statsA.length || 1);
    const avgB =
      statsB.reduce((sum, s) => sum + s.eloRating, 0) / (statsB.length || 1);

    // Calcul du résultat (1 = victoire, 0.5 = nul, 0 = défaite)
    const resultA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
    const resultB = 1 - resultA;

    // Calcul Elo
    const { newA, newB } = updateElo(avgA, avgB, resultA);
    const deltaA = newA - avgA;
    const deltaB = newB - avgB;

    // Mise à jour des stats des joueurs
    await Promise.all([
      ...teamAPlayers.map((pid) =>
        this.updatePlayerStats(pid, sportId, scoreA, scoreB, deltaA),
      ),
      ...teamBPlayers.map((pid) =>
        this.updatePlayerStats(pid, sportId, scoreB, scoreA, deltaB),
      ),
    ]);
  }

  private async ensurePlayerStats(playerId: number, sportId: number) {
    const exists = await this.prisma.playerStats.findUnique({
      where: { playerId_sportId: { playerId, sportId } },
    });
    if (!exists) {
      await this.prisma.playerStats.create({
        data: {
          playerId,
          sportId,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          goalsScored: 0,
          assists: 0,
          winRate: 0,
          eloRating: 1000,
        },
      });
    }
  }

  private async updatePlayerStats(
    playerId: number,
    sportId: number,
    teamScore: number,
    oppScore: number,
    deltaElo: number,
  ) {
    const isWin = teamScore > oppScore;
    const isDraw = teamScore === oppScore;
    const isLoss = teamScore < oppScore;

    const current = await this.prisma.playerStats.findUnique({
      where: { playerId_sportId: { playerId, sportId } },
    });

    if (!current) return;

    const totalMatches = current.matchesPlayed + 1;
    const totalWins = current.wins + (isWin ? 1 : 0);
    const winRate = totalWins / totalMatches;

    await this.prisma.playerStats.update({
      where: { playerId_sportId: { playerId, sportId } },
      data: {
        matchesPlayed: totalMatches,
        wins: totalWins,
        losses: current.losses + (isLoss ? 1 : 0),
        winRate,
        eloRating: current.eloRating + deltaElo,
        lastUpdated: new Date(),
      },
    });
  }
}
