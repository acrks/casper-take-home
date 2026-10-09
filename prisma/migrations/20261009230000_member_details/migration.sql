-- AlterTable
ALTER TABLE "EventMember" ADD COLUMN     "relationship" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;
