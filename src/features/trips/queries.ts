import "server-only";
import { prisma } from "@/src/lib/prisma";

export async function getTrips() {
  return prisma.trip.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}
