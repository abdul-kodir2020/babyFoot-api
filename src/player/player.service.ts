import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PlayerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlayerDto, admin: any) {
    if (admin.role !== Role.ADMIN) {
      throw new ForbiddenException("Seul un administrateur peut créer des joueurs.");
    }

    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new BadRequestException('Email ou username déjà utilisé.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 🔹 Créer le joueur
    const player = await this.prisma.player.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? Role.PLAYER, // Par défaut PLAYER
      },
    });

    // 🔹 Récupérer tous les sports existants
    const sports = await this.prisma.sport.findMany();

    // 🔹 Créer automatiquement les PlayerStats
    for (const sport of sports) {
      await this.prisma.playerStats.upsert({
        where: {
          playerId_sportId: { playerId: player.id, sportId: sport.id },
        },
        update: {},
        create: {
          playerId: player.id,
          sportId: sport.id,
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

    return player;
  }

  async findAll() {
    return this.prisma.player.findMany();
  }

  async findOne(id: number) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Joueur non trouvé.');
    return player;
  }

  async update(id: number, dto: UpdatePlayerDto) {
    const player = await this.findOne(id);
    const data: any = {};
    if (dto.username) data.username = dto.username;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.player.update({ where: { id: player.id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.player.delete({ where: { id } });
  }
}
