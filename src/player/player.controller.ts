import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('players')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePlayerDto, @Req() req: any) {
    return this.playerService.create(dto, req.user);
  }

  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlayerDto) {
    return this.playerService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.remove(id);
  }
}
