"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createTripSchema, updateTripSchema } from "./schemas";
import { createOwnedTrip, updateAuthorizedTrip, TripConflictError } from "./persistence";
import { EventAccessError } from "@/src/features/events/access";

export async function createTrip(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "You must be signed in to create a trip." };
  const result = createTripSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try {
    const trip = await createOwnedTrip(userId, result.data);
    revalidatePath("/trips");
    return { success: true as const, tripId: trip.id };
  } catch {
    // Do not log database error payloads, which may contain user input or credentials.
    console.error("Trip creation failed.");
    return { success: false as const, message: "Unable to create trip. Please try again." };
  }
}

export async function updateTrip(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "You must be signed in to edit a trip." };
  const result = updateTripSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try {
    await updateAuthorizedTrip(userId, result.data);
    revalidatePath("/trips");
    revalidatePath(`/trips/${result.data.tripId}`);
    revalidatePath(`/trips/${result.data.tripId}/edit`);
    return { success: true as const, tripId: result.data.tripId };
  } catch (error) {
    if (error instanceof EventAccessError || error instanceof TripConflictError) {
      return { success: false as const, message: error.message };
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return { success: false as const, message: "Another change was saved at the same time. Reload and try again." };
    }
    console.error("Trip update failed.");
    return { success: false as const, message: "Unable to save trip. Please try again." };
  }
}
