import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  // leaderboard public
  @Get('leaderboard/:sportId')
  leaderboard(@Param('sportId', ParseIntPipe) sportId: number) {
    return this.statsService.getLeaderboard(sportId);
  }

  // stats d'un joueur pour un sport (protégé)
  @Get('player/:playerId/sport/:sportId')
  @UseGuards(JwtAuthGuard)
  playerStats(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Param('sportId', ParseIntPipe) sportId: number,
  ) {
    return this.statsService.getPlayerStats(playerId, sportId);
  }

  // tous les stats d'un joueur (protégé)
  @Get('player/:playerId')
  @UseGuards(JwtAuthGuard)
  allPlayerStats(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.statsService.getAllStats(playerId);
  }
}
