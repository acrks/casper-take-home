import { z } from "zod";

export const tripIdSchema = z.cuid("Invalid trip ID");
export const timeZoneSchema = z.string().trim().max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; }
  catch { return false; }
}, "Choose a valid time zone, such as America/Los_Angeles");

const metadata = {
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
  description: z.string().trim().max(1000).optional(),
};
const onboarding = {
  ...metadata,
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(80),
};

export const createTripSchema = z.discriminatedUnion("planningStatus", [
  z.object({ ...onboarding, planningStatus: z.literal("PLANNING") }),
  z.object({
    ...onboarding,
    planningStatus: z.literal("FINALIZED"),
    destination: z.string().trim().min(2, "Destination is required").max(160),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    timeZone: timeZoneSchema,
  }).refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date", path: ["endDate"],
  }),
]);

// Confirmed dates and destination change through the planning/reopening workflow.
export const updateTripSchema = z.object({
  ...metadata,
  tripId: tripIdSchema,
  version: z.number().int().nonnegative(),
  timeZone: z.union([z.literal(""), timeZoneSchema]),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
