-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_tokenHash_key" ON "EventInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "EventInvitation_tripId_createdAt_idx" ON "EventInvitation"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_tripId_creatorId_fkey" FOREIGN KEY ("tripId", "creatorId") REFERENCES "EventMember"("tripId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
