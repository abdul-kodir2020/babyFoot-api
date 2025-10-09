import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { updateElo } from '../common/utils/elo.utils';

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  // --- Création du match avec équipes automatiques ---
  async create(creatorId: number, dto: CreateMatchDto) {
  // Vérifier que le sport existe
  const sport = await this.prisma.sport.findUnique({ where: { id: dto.sportId } });
  if (!sport) throw new NotFoundException('Sport introuvable');

  // Créer ou récupérer les équipes
  const teamA = await this.findOrCreateTeam(dto.teamAPlayerIds);
  const teamB = await this.findOrCreateTeam(dto.teamBPlayerIds);

  if (teamA.id === teamB.id) throw new BadRequestException('Une équipe ne peut pas jouer contre elle-même');

  // Déterminer si le match est déjà joué
  const isFinished = dto.scoreTeamA != null && dto.scoreTeamB != null;
  const winnerTeam =
    isFinished
      ? (dto.scoreTeamA ?? 0) > (dto.scoreTeamB ?? 0)
        ? 'A'
        : (dto.scoreTeamB ?? 0) > (dto.scoreTeamA ?? 0)
        ? 'B'
        : 'DRAW'
      : '';

  // Créer le match
  const match = await this.prisma.match.create({
    data: {
      sportId: dto.sportId,
      creatorId,
      teamAId: teamA.id,
      teamBId: teamB.id,
      scoreTeamA: dto.scoreTeamA ?? 0,
      scoreTeamB: dto.scoreTeamB ?? 0,
      winnerTeam,
    },
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
    },
  });

  // Si le match est déjà joué, mettre à jour les stats/Elo
  if (isFinished) {
    await this.updateStatsAndElo(match, dto.scoreTeamA ?? 0, dto.scoreTeamB ?? 0);
  }

  return match;
}


  // --- Trouver ou créer une équipe ---
  private async findOrCreateTeam(playerIds: number[]) {
    if (!playerIds || playerIds.length === 0) throw new BadRequestException('Une équipe doit contenir au moins un joueur');
    if (playerIds.length > 2) throw new BadRequestException('Une équipe ne peut contenir que 1 ou 2 joueurs');

    // Recherche d'une équipe existante avec ces joueurs
    const existingTeams = await this.prisma.team.findMany({
      where: {
        OR: [
          { player1Id: playerIds[0], player2Id: playerIds[1] ?? null },
          { player1Id: playerIds[1] ?? null, player2Id: playerIds[0] },
        ],
      },
    });

    if (existingTeams.length > 0) return existingTeams[0];

    // Création d'une nouvelle équipe
    return this.prisma.team.create({
      data: {
        player1Id: playerIds[0],
        player2Id: playerIds[1] ?? null,
      },
    });
  }

  // --- Récupérer un match avec ses équipes et joueurs ---
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

  // --- Vérifier que l'utilisateur peut modifier le match ---
  private async checkMatchPermission(match: any, userId: number) {
    const teamAPlayers = [match.teamA.player1Id, match.teamA.player2Id].filter(Boolean);
    const teamBPlayers = [match.teamB.player1Id, match.teamB.player2Id].filter(Boolean);
    const allowedPlayers = [...teamAPlayers, ...teamBPlayers];

    if (!allowedPlayers.includes(userId)) {
      throw new ForbiddenException("Vous ne pouvez pas modifier ce match car vous n'y participez pas.");
    }
  }

  // --- Finir un match ---
  async finishMatch(userId: number, matchId: number, scoreTeamA: number, scoreTeamB: number) {
    const match = await this.findOne(matchId);

    // Vérifier les permissions
    await this.checkMatchPermission(match, userId);

    // Déterminer le vainqueur
    const winnerTeam =
      scoreTeamA > scoreTeamB ? 'A' : scoreTeamB > scoreTeamA ? 'B' : 'DRAW';

    // Mise à jour du match
    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: { scoreTeamA, scoreTeamB, winnerTeam },
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

  // --- Helpers pour récupérer les ids des joueurs ---
  private async getTeamPlayerIds(team: any): Promise<number[]> {
    const ids: number[] = [];
    if (team.player1Id) ids.push(team.player1Id);
    if (team.player2Id) ids.push(team.player2Id);
    return ids;
  }

  // --- Mise à jour des stats et Elo des joueurs ---
  private async updateStatsAndElo(match: any, scoreA: number, scoreB: number) {
    const sportId = match.sportId;

    const teamAPlayers = await this.getTeamPlayerIds(match.teamA);
    const teamBPlayers = await this.getTeamPlayerIds(match.teamB);

    const allPlayerIds = [...teamAPlayers, ...teamBPlayers];
    for (const pid of allPlayerIds) {
      await this.ensurePlayerStats(pid, sportId);
    }

    const statsA = await this.prisma.playerStats.findMany({ where: { playerId: { in: teamAPlayers }, sportId } });
    const statsB = await this.prisma.playerStats.findMany({ where: { playerId: { in: teamBPlayers }, sportId } });

    const avgA = statsA.reduce((sum, s) => sum + s.eloRating, 0) / (statsA.length || 1);
    const avgB = statsB.reduce((sum, s) => sum + s.eloRating, 0) / (statsB.length || 1);

    const resultA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
    const { newA, newB } = updateElo(avgA, avgB, resultA);
    const deltaA = newA - avgA;
    const deltaB = newB - avgB;

    await Promise.all([
      ...teamAPlayers.map((pid) => this.updatePlayerStats(pid, sportId, scoreA, scoreB, deltaA)),
      ...teamBPlayers.map((pid) => this.updatePlayerStats(pid, sportId, scoreB, scoreA, deltaB)),
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

  private async updatePlayerStats(playerId: number, sportId: number, teamScore: number, oppScore: number, deltaElo: number) {
    const isWin = teamScore > oppScore;
    const isDraw = teamScore === oppScore;
    const isLoss = teamScore < oppScore;

    const current = await this.prisma.playerStats.findUnique({ where: { playerId_sportId: { playerId, sportId } } });
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
