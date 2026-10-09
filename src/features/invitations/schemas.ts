import { z } from "zod";
import { tripIdSchema } from "@/src/features/trips/schemas";

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "This invitation is unavailable.");
export const issueInvitationSchema = z.object({ tripId: tripIdSchema });
export const revokeInvitationSchema = issueInvitationSchema.extend({ invitationId: z.cuid() });
export const joinInvitationSchema = z.object({
  token: invitationTokenSchema,
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(80),
});
