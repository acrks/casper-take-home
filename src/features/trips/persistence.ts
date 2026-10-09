import "server-only";

import { prisma } from "@/src/lib/prisma";
import { memberScope, requireEventAccess } from "@/src/features/events/access";
import type { CreateTripInput, UpdateTripInput } from "./schemas";

export class TripConflictError extends Error {
  constructor() { super("This event changed since you opened it. Reload before saving again."); }
}

export function createOwnedTrip(userId: string, input: CreateTripInput) {
  return prisma.$transaction(async (tx) => {
    await tx.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName: input.displayName },
      update: { displayName: input.displayName },
    });
    return tx.trip.create({ data: {
      name: input.name, description: input.description || null,
      organizerId: userId, planningStatus: input.planningStatus,
      ...(input.planningStatus === "FINALIZED" ? {
        destination: input.destination,
        startDate: new Date(`${input.startDate}T12:00:00Z`),
        endDate: new Date(`${input.endDate}T12:00:00Z`),
        timeZone: input.timeZone,
      } : {}),
      members: { create: { userId, role: "ADMIN", status: "ACTIVE" } },
    } });
  });
}

export function updateAuthorizedTrip(userId: string, input: UpdateTripInput) {
  return prisma.$transaction(async (tx) => {
    await requireEventAccess(input.tripId, userId, "admin", tx);
    const updated = await tx.trip.updateMany({
      where: { id: input.tripId, version: input.version, archivedAt: null, ...memberScope(userId, "admin") },
      data: {
        name: input.name, description: input.description || null,
        timeZone: input.timeZone || null, version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new TripConflictError();
    return updated;
  }, { isolationLevel: "Serializable" });
}
