import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PlayerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlayerDto) {
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) throw new BadRequestException('Email ou username déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.player.create({
      data: { username: dto.username, email: dto.email, password: hashedPassword },
    });
  }

  async findAll() {
    return this.prisma.player.findMany();
  }

  async findOne(id: number) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Joueur non trouvé');
    return player;
  }

  async update(id: number, dto: UpdatePlayerDto) {
    const player = await this.findOne(id);
    const data: any = {};
    if (dto.username) data.username = dto.username;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.player.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.player.delete({ where: { id } });
  }
}
