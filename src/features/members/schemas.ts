import { z } from "zod";
import { tripIdSchema } from "@/src/features/trips/schemas";
const memberReference = { tripId: tripIdSchema, memberId: z.cuid(), version: z.number().int().nonnegative() };
export const manageMemberSchema = z.object({ ...memberReference, operation: z.enum(["PROMOTE", "DEMOTE", "REMOVE", "RESTORE", "LEAVE"]) });
export const updateMemberDetailsSchema = z.object({ ...memberReference, relationship: z.string().trim().max(120), title: z.string().trim().max(80) });
export type ManageMemberInput = z.infer<typeof manageMemberSchema>;
export type MemberDetailsInput = z.infer<typeof updateMemberDetailsSchema>;
