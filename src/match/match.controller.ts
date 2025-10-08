import { Controller, Post, Body, UseGuards, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { MatchService } from './match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { Request } from 'express';
import { JwtStrategy } from '../auth/jwt.strategy';
import { GetUser } from 'src/auth/get-user.decorator';

@Controller('matches')
export class MatchController {
  constructor(private matchService: MatchService) {}

  // create match (creator from token)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateMatchDto, @GetUser('userId') userId: number) {
    return this.matchService.create(userId, dto);
  }

  @Patch(':id/finish')
  @UseGuards(JwtAuthGuard)
  finish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { scoreTeamA: number; scoreTeamB: number },
  ) {
    return this.matchService.finishMatch(id, body.scoreTeamA, body.scoreTeamB);
  }
}
