import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

let userId = "owner";
const create = mock(async () => ({ id: "cmg1test000000000000000001" }));
const upsert = mock(async () => ({}));
const updateMany = mock(async () => ({ count: 1 }));
const findFirst = mock(async () => ({ id: "cmg1test000000000000000001" }));
const findMany = mock(async () => []);
const revalidatePath = mock(() => {});
const db = { trip: { create, updateMany, findFirst, findMany }, userProfile: { upsert } };
mock.module("@clerk/nextjs/server", () => ({ auth: async () => ({ userId }) }));
mock.module("next/cache", () => ({ revalidatePath }));
mock.module("server-only", () => ({}));
mock.module("../../src/lib/prisma", () => ({ prisma: { ...db, $transaction: async (fn) => fn(db) } }));

const { createTrip, updateTrip } = await import("../../src/features/trips/actions");
const { getTripById, getTrips } = await import("../../src/features/trips/queries");
const errorLog = spyOn(console, "error").mockImplementation(() => {});
afterAll(() => errorLog.mockRestore());
const confirmed = { name: "  Denver weekend  ", displayName: "Taylor", planningStatus: "FINALIZED", destination: "  Denver  ", startDate: "2026-11-01", endDate: "2026-11-03", timeZone: "America/Denver", description: "Updated plans" };
const input = { tripId: "cmg1test000000000000000001", version: 0, name: "  Denver weekend  ", description: "Updated plans", timeZone: "America/Denver" };
beforeEach(() => {
  userId = "owner";
  for (const fn of [create, upsert, updateMany, findFirst, findMany, revalidatePath, errorLog]) fn.mockClear();
  create.mockResolvedValue({ id: input.tripId });
  updateMany.mockResolvedValue({ count: 1 });
  findFirst.mockResolvedValue({ id: input.tripId });
});

describe("event authentication and input boundaries", () => {
  test("signed-out reads and mutations cannot reach Prisma", async () => {
    userId = null;
    expect((await updateTrip(input)).success).toBe(false);
    expect((await createTrip(confirmed)).success).toBe(false);
    await expect(getTripById(input.tripId)).rejects.toThrow("Unauthorized");
    await expect(getTrips()).rejects.toThrow("Unauthorized");
    for (const fn of [create, upsert, updateMany, findFirst, findMany]) expect(fn).not.toHaveBeenCalled();
  });
  test("creation derives both owner and admin membership from session", async () => {
    expect((await createTrip({ ...confirmed, organizerId: "attacker", userId: "attacker" })).success).toBe(true);
    const data = create.mock.calls[0][0].data;
    expect(data.organizerId).toBe("owner");
    expect(data.members.create).toEqual({ userId: "owner", role: "ADMIN", status: "ACTIVE" });
    expect(data.startDate.toISOString()).toBe("2026-11-01T12:00:00.000Z");
    expect(data.name).toBe("Denver weekend");
    expect(upsert.mock.calls[0][0].where).toEqual({ clerkUserId: "owner" });
  });
  test("draft strips premature confirmed fields", async () => {
    expect((await createTrip({ ...confirmed, planningStatus: "PLANNING" })).success).toBe(true);
    const data = create.mock.calls[0][0].data;
    expect(data.destination).toBeUndefined();
    expect(data.startDate).toBeUndefined();
  });
  test("listing is scoped to active membership", async () => {
    await getTrips();
    expect(findMany.mock.calls[0][0].where).toEqual({ members: { some: { userId: "owner", status: "ACTIVE" } } });
  });
  test("edit whitelists metadata and checks admin, archive and version", async () => {
    expect((await updateTrip({ ...confirmed, ...input, organizerId: "attacker", planningStatus: "PLANNING" })).success).toBe(true);
    expect(updateMany.mock.calls[0][0]).toEqual({
      where: { id: input.tripId, version: 0, archivedAt: null, members: { some: { userId: "owner", status: "ACTIVE", role: "ADMIN" } } },
      data: { name: "Denver weekend", description: "Updated plans", timeZone: "America/Denver", version: { increment: 1 } },
    });
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(["/trips", `/trips/${input.tripId}`, `/trips/${input.tripId}/edit`]);
  });
  test("empty description and time zone clear to null", async () => {
    expect((await updateTrip({ ...input, description: "", timeZone: "" })).success).toBe(true);
    expect(updateMany.mock.calls[0][0].data.description).toBeNull();
    expect(updateMany.mock.calls[0][0].data.timeZone).toBeNull();
  });
  test("denied access never writes or revalidates", async () => {
    findFirst.mockResolvedValue(null);
    expect((await updateTrip(input)).success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await getTripById(input.tripId)).toBeNull();
  });
  test("stale edit returns conflict without revalidation", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    expect((await updateTrip(input)).message).toContain("Reload");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  test.each([new Error("private database failure"), { code: "P2034" }])("database failures are safe", async (error) => {
    updateMany.mockRejectedValue(error);
    const result = await updateTrip(input);
    expect(result.success).toBe(false);
    expect(result.message).not.toContain("private");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  test("creation failure returns structured error", async () => {
    create.mockRejectedValue(new Error("private connection"));
    expect((await createTrip(confirmed)).success).toBe(false);
    expect(errorLog).toHaveBeenCalledWith("Trip creation failed.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  test.each([{ destination: "x" }, { startDate: "2026-02-30" }, { endDate: "2026-10-31" }, { timeZone: "Mars/Olympus" }, { timeZone: "" }, { displayName: " " }, { name: "x".repeat(121) }, { description: "x".repeat(1001) }])("invalid creation cannot write: %j", async (invalid) => {
    const result = await createTrip({ ...confirmed, ...invalid });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(upsert).not.toHaveBeenCalled();
  });
  test.each([{ tripId: "invalid" }, { name: "  " }, { version: -1 }, { version: "0" }, { timeZone: "Bad/Zone" }])("invalid edit cannot write: %j", async (invalid) => {
    expect((await updateTrip({ ...input, ...invalid })).success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
  test("invalid read IDs do not reach database", async () => {
    expect(await getTripById("invalid")).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});

const { createInvitationAction, revokeInvitationAction, joinInvitationAction } = await import("../../src/features/invitations/actions");
const { joinInvitationSchema, invitationTokenSchema } = await import("../../src/features/invitations/schemas");
describe("invitation action boundaries", () => {
  test("all invitation actions authenticate before database operations", async () => {
    userId = null;
    expect((await createInvitationAction({ tripId: input.tripId })).success).toBe(false);
    expect((await revokeInvitationAction({ tripId: input.tripId, invitationId: input.tripId })).success).toBe(false);
    expect((await joinInvitationAction({ token: "a".repeat(43), displayName: "Alex" })).success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled();
  });
  test("invalid ids, tokens and names are rejected before persistence", async () => {
    expect((await createInvitationAction({ tripId: "bad" })).errors).toBeDefined();
    expect((await revokeInvitationAction({ tripId: input.tripId, invitationId: "bad" })).errors).toBeDefined();
    expect((await joinInvitationAction({ token: "bad", displayName: "Alex" })).errors).toBeDefined();
    expect((await joinInvitationAction({ token: "a".repeat(43), displayName: " " })).errors).toBeDefined();
    expect(findFirst).not.toHaveBeenCalled();
  });
  test("joining strips client identity and role; unsafe tokens are rejected", () => {
    expect(joinInvitationSchema.parse({ token: "a".repeat(43), displayName: " Alex ", role: "ADMIN", userId: "attacker" })).toEqual({ token: "a".repeat(43), displayName: "Alex" });
    expect(invitationTokenSchema.safeParse("../bad").success).toBe(false);
  });
});

const { manageMemberAction, updateMemberDetailsAction } = await import("../../src/features/members/actions");
describe("member action boundaries", () => {
  test("signed-out member operations cannot reach persistence", async () => {
    userId = null;
    expect((await manageMemberAction({})).success).toBe(false);
    expect((await updateMemberDetailsAction({})).success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
  test("invalid membership operations and oversized details fail validation", async () => {
    const ref = { tripId: input.tripId, memberId: input.tripId, version: 0 };
    expect((await manageMemberAction({ ...ref, operation: "OWNER" })).errors).toBeDefined();
    expect((await updateMemberDetailsAction({ ...ref, title: "x".repeat(81), relationship: "" })).errors).toBeDefined();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
