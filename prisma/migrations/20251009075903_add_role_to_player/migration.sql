-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PLAYER';
