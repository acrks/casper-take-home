"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { EventAccessError } from "@/src/features/events/access";
import { issueInvitationSchema, revokeInvitationSchema, joinInvitationSchema } from "./schemas";
import { issueInvitation, revokeInvitation, joinInvitation, InvitationError } from "./persistence";

function failure(error: unknown) {
  if (error instanceof EventAccessError || error instanceof InvitationError) return { success: false as const, message: error.message };
  console.error("Invitation operation failed.");
  return { success: false as const, message: "Unable to update invitation. Please try again." };
}

export async function createInvitationAction(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "Sign in to invite people." };
  const result = issueInvitationSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try {
    const invitation = await issueInvitation(result.data.tripId, userId);
    revalidatePath(`/trips/${result.data.tripId}/people`);
    return { success: true as const, ...invitation };
  } catch (error) { return failure(error); }
}

export async function revokeInvitationAction(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "Sign in to manage invitations." };
  const result = revokeInvitationSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try {
    await revokeInvitation(result.data.tripId, result.data.invitationId, userId);
    revalidatePath(`/trips/${result.data.tripId}/people`);
    return { success: true as const };
  } catch (error) { return failure(error); }
}

export async function joinInvitationAction(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "Sign in before joining this event." };
  const result = joinInvitationSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try {
    const tripId = await joinInvitation(result.data.token, userId, result.data.displayName);
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}/people`);
    return { success: true as const, tripId };
  } catch (error) { return failure(error); }
}
