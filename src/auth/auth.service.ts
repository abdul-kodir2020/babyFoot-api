import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(username: string, email: string, password: string) {
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new BadRequestException('Utilisateur déjà existant.');

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Créer le joueur avec le rôle PLAYER
    const player = await this.prisma.player.create({
      data: { username, email, password: hashedPassword, role: Role.PLAYER },
    });

    try {
      // 🔹 Créer automatiquement les PlayerStats pour chaque sport
      const sports = await this.prisma.sport.findMany();

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
    } catch (error) {
      throw new InternalServerErrorException(
        'Erreur lors de la création des statistiques du joueur.',
      );
    }

    return {
      id: player.id,
      username: player.username,
      email: player.email,
      role: player.role,
    };
  }

  async login(email: string, password: string) {
    const player = await this.prisma.player.findUnique({ where: { email } });
    if (!player) throw new UnauthorizedException('Email ou mot de passe invalide.');

    const match = await bcrypt.compare(password, player.password);
    if (!match) throw new UnauthorizedException('Email ou mot de passe invalide.');

    const token = this.jwtService.sign({
      sub: player.id,
      role: player.role,
    });

    return { accessToken: token };
  }
}
