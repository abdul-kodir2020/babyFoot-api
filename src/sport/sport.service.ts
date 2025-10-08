import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSportDto } from './dto/create-sport.dto';

@Injectable()
export class SportService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSportDto) {
    const existing = await this.prisma.sport.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Un sport avec ce nom existe déjà');

    const sport = await this.prisma.sport.create({
      data: { name: dto.name, /* rules optional */ },
    });

    // Initialiser les statistiques pour tous les joueurs existants
    const players = await this.prisma.player.findMany();
    const statsCreates = players.map(p => ({
      playerId: p.id,
      sportId: sport.id,
      eloRating: 1000,
    }));
    if (statsCreates.length) {
      await this.prisma.playerStats.createMany({ data: statsCreates, skipDuplicates: true });
    }

    return sport;
  }

  async findAll() {
    return this.prisma.sport.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const sport = await this.prisma.sport.findUnique({ where: { id } });
    if (!sport) throw new NotFoundException('Sport introuvable');
    return sport;
  }

  async update(id: number, dto: Partial<CreateSportDto>) {
    await this.findOne(id);
    return this.prisma.sport.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Optionnel : vérifier s'il y a des matchs liés avant suppression
    const matchesCount = await this.prisma.match.count({ where: { sportId: id } });
    if (matchesCount > 0) {
      throw new BadRequestException('Impossible de supprimer : des matchs existent pour ce sport');
    }
    return this.prisma.sport.delete({ where: { id } });
  }
}
