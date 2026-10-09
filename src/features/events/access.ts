import "server-only";

import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";

export class EventAccessError extends Error {
  constructor() { super("This event is unavailable or you do not have permission."); }
}

export function memberScope(userId: string, permission: "member" | "admin" | "owner" = "member") {
  return {
    ...(permission === "owner" ? { organizerId: userId } : {}),
    members: { some: {
      userId, status: "ACTIVE" as const,
      ...(permission !== "member" ? { role: "ADMIN" as const } : {}),
    } },
  };
}

// Caller supplies a Clerk-authenticated identity, never a request ownership field.
export function findAccessibleTrip(tripId: string, userId: string, db: Prisma.TransactionClient = prisma) {
  return db.trip.findFirst({
    where: { id: tripId, ...memberScope(userId) },
    include: { members: { where: { userId, status: "ACTIVE" }, select: { role: true } } },
  });
}

export async function requireEventAccess(
  tripId: string, userId: string, permission: "member" | "admin" | "owner",
  db: Prisma.TransactionClient = prisma,
) {
  const trip = await db.trip.findFirst({ where: { id: tripId, archivedAt: null, ...memberScope(userId, permission) } });
  if (!trip) throw new EventAccessError();
  return trip;
}
