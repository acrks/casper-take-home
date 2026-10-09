import "server-only";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";

export async function getTrips() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return prisma.trip.findMany({
    where: {
      organizerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
