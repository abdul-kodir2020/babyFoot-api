import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(username: string, email: string, password: string) {
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new BadRequestException('Utilisateur déjà existant');

    const hashedPassword = await bcrypt.hash(password, 10);
    const player = await this.prisma.player.create({
      data: { username, email, password: hashedPassword },
    });
    return { id: player.id, username: player.username, email: player.email };
  }

  async login(email: string, password: string) {
    const player = await this.prisma.player.findUnique({ where: { email } });
    if (!player) throw new UnauthorizedException('Email ou mot de passe invalide');

    const match = await bcrypt.compare(password, player.password);
    if (!match) throw new UnauthorizedException('Email ou mot de passe invalide');

    const token = this.jwtService.sign({ sub: player.id });
    return { accessToken: token };
  }
}
