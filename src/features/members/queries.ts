import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { findAccessibleTrip, EventAccessError } from "@/src/features/events/access";

export async function getPeople(tripId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return prisma.$transaction(async tx => {
    const trip = await findAccessibleTrip(tripId, userId, tx);
    if (!trip) throw new EventAccessError();
    const admin = trip.members[0]?.role === "ADMIN";
    const members = await tx.eventMember.findMany({
      where: { tripId, ...(admin ? {} : { status: "ACTIVE" }) },
      select: { id: true, userId: true, role: true, status: true, version: true, relationship: true, title: true, user: { select: { displayName: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return members.map(({ userId: memberUserId, user, ...member }) => ({ ...member, displayName: user.displayName ?? "Member", isSelf: memberUserId === userId, isOwner: memberUserId === trip.organizerId }));
  }, { isolationLevel: "RepeatableRead" });
}
