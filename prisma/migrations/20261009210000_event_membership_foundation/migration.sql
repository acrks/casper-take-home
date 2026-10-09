BEGIN;

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('PLANNING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "EventRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "planningStatus" "PlanningStatus" NOT NULL DEFAULT 'PLANNING',
ADD COLUMN     "timeZone" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "destination" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserProfile" (
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("clerkUserId")
);

-- CreateTable
CREATE TABLE "EventMember" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EventRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMember_userId_status_idx" ON "EventMember"("userId", "status");

-- CreateIndex
CREATE INDEX "EventMember_tripId_status_role_idx" ON "EventMember"("tripId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_tripId_userId_key" ON "EventMember"("tripId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_tripId_id_key" ON "EventMember"("tripId", "id");

-- Preserve existing trips and their timestamps; only mark their known plans confirmed.
INSERT INTO "UserProfile" ("clerkUserId", "createdAt", "updatedAt")
SELECT "organizerId", MIN("createdAt"), MAX("updatedAt") FROM "Trip" GROUP BY "organizerId";

INSERT INTO "EventMember" ("id", "tripId", "userId", "role", "status", "joinedAt", "createdAt", "updatedAt")
SELECT 'c' || SUBSTRING(MD5("id" || ':' || "organizerId"), 1, 24), "id", "organizerId", 'ADMIN', 'ACTIVE', "createdAt", "createdAt", "updatedAt" FROM "Trip";

UPDATE "Trip" SET "planningStatus" = 'FINALIZED';

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_date_pair_check" CHECK (("startDate" IS NULL) = ("endDate" IS NULL));
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_date_order_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_confirmed_details_check" CHECK (
  "planningStatus" <> 'FINALIZED' OR ("destination" IS NOT NULL AND length(btrim("destination")) >= 2 AND "startDate" IS NOT NULL AND "endDate" IS NOT NULL)
);

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "UserProfile"("clerkUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("clerkUserId") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
