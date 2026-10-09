"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { EventAccessError } from "@/src/features/events/access";
import { manageMemberSchema, updateMemberDetailsSchema } from "./schemas";
import { manageMember, updateMemberDetails, MemberError } from "./persistence";

function failure(error: unknown) {
  if (error instanceof MemberError || error instanceof EventAccessError) return { success: false as const, message: error.message };
  console.error("Membership update failed.");
  return { success: false as const, message: "Unable to save membership. Reload and try again." };
}
function refreshEvent(tripId: string) {
  revalidatePath("/trips"); revalidatePath(`/trips/${tripId}`, "layout");
}
export async function manageMemberAction(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "Sign in to manage membership." };
  const result = manageMemberSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try { await manageMember(userId, result.data); refreshEvent(result.data.tripId); return { success: true as const }; }
  catch (error) { return failure(error); }
}
export async function updateMemberDetailsAction(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { success: false as const, message: "Sign in to edit your details." };
  const result = updateMemberDetailsSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: result.error.flatten().fieldErrors };
  try { await updateMemberDetails(userId, result.data); refreshEvent(result.data.tripId); return { success: true as const }; }
  catch (error) { return failure(error); }
}
