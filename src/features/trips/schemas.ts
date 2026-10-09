import { z } from "zod";

export const createTripSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    destination: z.string().trim().min(2, "Destination is required"),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    description: z.string().max(1000).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const tripIdSchema = z.cuid("Invalid trip ID");

export const updateTripSchema = createTripSchema.safeExtend({
  tripId: tripIdSchema,
});
