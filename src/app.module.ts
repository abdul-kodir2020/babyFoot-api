import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { PlayerModule } from './player/player.module';
import { SportModule } from './sport/sport.module';
import { TeamModule } from './team/team.module';
import { MatchModule } from './match/match.module';
import { StatsModule } from './stats/stats.module';
import { RolesGuard } from './auth/roles.guard';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlayerModule,
    SportModule,
    TeamModule,
    MatchModule,
    StatsModule,
  ],
  providers: [
    { provide: 'APP_GUARD', useClass: RolesGuard }
  ],
})
export class AppModule {}
