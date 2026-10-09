import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { requireEventAccess } from "@/src/features/events/access";
import { eventTransaction } from "@/src/features/events/transaction";

export class InvitationError extends Error {}
const unavailable = () => new InvitationError("This invitation is unavailable. Ask an organizer for a new link.");
export function hashInvitationToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function issueInvitation(tripId: string, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await eventTransaction(async (tx) => {
    await requireEventAccess(tripId, userId, "admin", tx);
    const creator = await tx.eventMember.findUniqueOrThrow({ where: { tripId_userId: { tripId, userId } } });
    return tx.eventInvitation.create({ data: { tripId, creatorId: creator.id, tokenHash: hashInvitationToken(token), expiresAt } });
  });
  return { invitationId: invitation.id, token, expiresAt: expiresAt.toISOString() };
}

export async function revokeInvitation(tripId: string, invitationId: string, userId: string) {
  return eventTransaction(async (tx) => {
    await requireEventAccess(tripId, userId, "admin", tx);
    const result = await tx.eventInvitation.updateMany({
      where: { id: invitationId, tripId, revokedAt: null },
      data: { revokedAt: new Date(), revision: { increment: 1 } },
    });
    if (!result.count) throw unavailable();
  });
}

export async function invitationPreview(token: string) {
  const invite = await prisma.eventInvitation.findFirst({
    where: { tokenHash: hashInvitationToken(token), revokedAt: null, expiresAt: { gt: new Date() }, trip: { archivedAt: null } },
    select: { trip: { select: { name: true } } },
  });
  return invite ? { name: invite.trip.name } : null;
}

export async function joinInvitation(token: string, userId: string, displayName: string) {
  return eventTransaction(async (tx) => {
    const tokenHash = hashInvitationToken(token);
    // Joining and revoking both write this row. Retrying a serialization conflict
    // rechecks expiry, revocation and membership instead of accepting a stale token.
    const claimed = await tx.eventInvitation.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() }, trip: { archivedAt: null } },
      data: { revision: { increment: 1 } },
    });
    if (!claimed.count) throw unavailable();
    const invite = await tx.eventInvitation.findUniqueOrThrow({ where: { tokenHash }, select: { tripId: true } });
    const key = { tripId_userId: { tripId: invite.tripId, userId } };
    const existing = await tx.eventMember.findUnique({ where: key });
    if (existing?.status === "REMOVED") throw new InvitationError("An organizer must restore your membership before you can return.");
    if (existing?.status === "ACTIVE") return invite.tripId;
    await tx.userProfile.upsert({ where: { clerkUserId: userId }, create: { clerkUserId: userId, displayName }, update: { displayName } });
    if (existing) {
      await tx.eventMember.update({ where: key, data: { status: "ACTIVE", role: "MEMBER", revision: { increment: 1 }, version: { increment: 1 }, joinedAt: new Date(), endedAt: null } });
    } else {
      await tx.eventMember.create({ data: { tripId: invite.tripId, userId, role: "MEMBER" } });
    }
    return invite.tripId;
  });
}
