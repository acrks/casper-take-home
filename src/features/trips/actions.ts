"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { createTripSchema } from "./schemas";

export async function createTrip(input: unknown) {
  const result = createTripSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { startDate, endDate, ...details } = result.data;

  try {
    const trip = await prisma.trip.create({
      data: {
        ...details,
        startDate: new Date(`${startDate}T12:00:00Z`),
        endDate: new Date(`${endDate}T12:00:00Z`),
      },
    });

    revalidatePath("/trips");

    return {
      success: true as const,
      tripId: trip.id,
    };
  } catch (error) {
    console.error("Trip creation failed:", error);

    return {
      success: false as const,
      message: "Unable to create trip. Please try again.",
    };
  }
}
