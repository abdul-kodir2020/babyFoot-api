import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards, Patch, Delete } from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('teams')
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTeamDto) {
    return this.teamService.create(dto);
  }

  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findOne(id);
  }

  @Patch(':id/add/:playerId')
  @UseGuards(JwtAuthGuard)
  addPlayer(@Param('id', ParseIntPipe) id: number, @Param('playerId', ParseIntPipe) playerId: number) {
    return this.teamService.addPlayer(id, playerId);
  }

  @Patch(':id/remove/:playerId')
  @UseGuards(JwtAuthGuard)
  removePlayer(@Param('id', ParseIntPipe) id: number, @Param('playerId', ParseIntPipe) playerId: number) {
    return this.teamService.removePlayer(id, playerId);
  }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  // remove(@Param('id', ParseIntPipe) id: number) {
  //   return this.teamService.remove(id);
  // }
}
