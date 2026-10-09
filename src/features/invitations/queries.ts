import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { requireEventAccess } from "@/src/features/events/access";

export async function getInvitations(tripId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await requireEventAccess(tripId, userId, "admin");
  const invitations = await prisma.eventInvitation.findMany({
    where: { tripId, trip: { archivedAt: null, members: { some: { userId, status: "ACTIVE", role: "ADMIN" } } } },
    select: { id: true, createdAt: true, expiresAt: true, revokedAt: true }, orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  return invitations.map(invitation => ({ ...invitation, expired: invitation.expiresAt.getTime() <= now }));
}
