import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Calcule le nouveau score Elo d’un joueur après un match
 */
function calculateElo(
  currentElo: number,
  opponentElo: number,
  score: number, // 1 = victoire, 0 = défaite, 0.5 = nul
  k = 32,
) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
  return Math.round(currentElo + k * (score - expectedScore));
}

async function main() {
  console.log('🚀 Seeding database avec mise à jour des ELO...');

  // --- Sports ---
  const babyfoot = await prisma.sport.upsert({
    where: { name: 'Baby-foot' },
    update: {},
    create: { name: 'Baby-foot' },
  });

  const pingpong = await prisma.sport.upsert({
    where: { name: 'Tennis de table' },
    update: {},
    create: { name: 'Tennis de table' },
  });

  // --- Joueurs ---
  const alice = await prisma.player.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: {
      username: 'Alice',
      email: 'alice@test.com',
      password: 'hashed_password_1',
    },
  });

  const bob = await prisma.player.upsert({
    where: { email: 'bob@test.com' },
    update: {},
    create: {
      username: 'Bob',
      email: 'bob@test.com',
      password: 'hashed_password_2',
    },
  });

  const charlie = await prisma.player.upsert({
    where: { email: 'charlie@test.com' },
    update: {},
    create: {
      username: 'Charlie',
      email: 'charlie@test.com',
      password: 'hashed_password_3',
    },
  });

  const diana = await prisma.player.upsert({
    where: { email: 'diana@test.com' },
    update: {},
    create: {
      username: 'Diana',
      email: 'diana@test.com',
      password: 'hashed_password_4',
    },
  });

  // --- Équipes ---
  const team1 = await prisma.team.create({
    data: { player1Id: alice.id, player2Id: bob.id },
  });

  const team2 = await prisma.team.create({
    data: { player1Id: charlie.id, player2Id: diana.id },
  });

  const soloTeam = await prisma.team.create({
    data: { player1Id: alice.id }, // équipe solo
  });

  // --- Stats initiales pour chaque joueur et sport ---
  const sports = [babyfoot, pingpong];
  const players = [alice, bob, charlie, diana];

  for (const sport of sports) {
    for (const player of players) {
      await prisma.playerStats.upsert({
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
  }

  // --- Matchs ---
  const match1 = await prisma.match.create({
    data: {
      sportId: babyfoot.id,
      creatorId: alice.id,
      teamAId: team1.id,
      teamBId: team2.id,
      scoreTeamA: 10,
      scoreTeamB: 7,
      winnerTeam: 'A',
    },
  });

  const match2 = await prisma.match.create({
    data: {
      sportId: pingpong.id,
      creatorId: charlie.id,
      teamAId: soloTeam.id,
      teamBId: team2.id,
      scoreTeamA: 3,
      scoreTeamB: 11,
      winnerTeam: 'B',
    },
  });

  // --- Mise à jour des ELO ---
  async function updateEloForMatch(matchId: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sport: true,
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
      },
    });

    if (!match) return;

    const sportId = match.sportId;
    const teamAPlayers = [match.teamA.player1, match.teamA.player2].filter(
      (p): p is NonNullable<typeof p> => p != null,
    );
    const teamBPlayers = [match.teamB.player1, match.teamB.player2].filter(
      (p): p is NonNullable<typeof p> => p != null,
    );

    // Calcul de la moyenne des ELO pour chaque équipe
    const avgA =
      (await Promise.all(
        teamAPlayers.map(async (p) =>
          prisma.playerStats.findUnique({
            where: { playerId_sportId: { playerId: p.id, sportId } },
          }),
        ),
      )).reduce((sum, s) => sum + (s?.eloRating ?? 1000), 0) / teamAPlayers.length;

    const avgB =
      (await Promise.all(
        teamBPlayers.map(async (p) =>
          prisma.playerStats.findUnique({
            where: { playerId_sportId: { playerId: p.id, sportId } },
          }),
        ),
      )).reduce((sum, s) => sum + (s?.eloRating ?? 1000), 0) / teamBPlayers.length;

    const resultA = match.winnerTeam === 'A' ? 1 : 0;
    const resultB = 1 - resultA;

    // Mise à jour ELO pour chaque joueur
    for (const p of teamAPlayers) {
      const stat = await prisma.playerStats.findUnique({
        where: { playerId_sportId: { playerId: p.id, sportId } },
      });
      if (!stat) continue;
      const newElo = calculateElo(stat.eloRating, avgB, resultA);
      await prisma.playerStats.update({
        where: { playerId_sportId: { playerId: p.id, sportId } },
        data: { eloRating: newElo },
      });
      console.log(`⚽ ${p.username} (${match.sport.name}) : ${stat.eloRating} → ${newElo}`);
    }

    for (const p of teamBPlayers) {
      const stat = await prisma.playerStats.findUnique({
        where: { playerId_sportId: { playerId: p.id, sportId } },
      });
      if (!stat) continue;
      const newElo = calculateElo(stat.eloRating, avgA, resultB);
      await prisma.playerStats.update({
        where: { playerId_sportId: { playerId: p.id, sportId } },
        data: { eloRating: newElo },
      });
      console.log(`🏓 ${p.username} (${match.sport.name}) : ${stat.eloRating} → ${newElo}`);
    }
  }

  await updateEloForMatch(match1.id);
  await updateEloForMatch(match2.id);

  console.log('✅ Seed terminé avec mise à jour des ELO !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
