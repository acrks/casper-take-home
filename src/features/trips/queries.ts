import "server-only";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { tripIdSchema } from "./schemas";
import { findAccessibleTrip, memberScope } from "@/src/features/events/access";

export async function getTrips() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return prisma.trip.findMany({ where: memberScope(userId), orderBy: { createdAt: "desc" } });
}

export async function getTripById(tripId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const result = tripIdSchema.safeParse(tripId);
  if (!result.success) return null;
  const trip = await findAccessibleTrip(result.data, userId);
  if (!trip) return null;
  const { members, ...details } = trip;
  return { ...details, canManage: !trip.archivedAt && members[0]?.role === "ADMIN", isOwner: trip.organizerId === userId };
}
