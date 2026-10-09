import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { testDatabaseEnvironment } from "../helpers/test-environment.mjs";
Object.assign(process.env, testDatabaseEnvironment());
mock.module("server-only", () => ({}));
const { prisma } = await import("../../src/lib/prisma");
const { createOwnedTrip, updateAuthorizedTrip } = await import("../../src/features/trips/persistence");
const { findAccessibleTrip, requireEventAccess, memberScope } = await import("../../src/features/events/access");
const { createTripSchema, updateTripSchema } = await import("../../src/features/trips/schemas");
const suffix = randomUUID();
const owner = `evter-test-owner-${suffix}`;
const member = `evter-test-member-${suffix}`;
const outsider = `evter-test-outsider-${suffix}`;
const rollbackUser = `evter-test-rollback-${suffix}`;
let draft, confirmed, other;
const details = { name: "S1 draft", displayName: "Taylor", planningStatus: "PLANNING", description: "" };
beforeAll(async () => {
  draft = await createOwnedTrip(owner, createTripSchema.parse(details));
  confirmed = await createOwnedTrip(owner, createTripSchema.parse({ ...details, name: "S1 confirmed", planningStatus: "FINALIZED", destination: "Denver", startDate: "2026-11-01", endDate: "2026-11-03", timeZone: "America/Denver" }));
  other = await createOwnedTrip(outsider, createTripSchema.parse(details));
  await prisma.userProfile.create({ data: { clerkUserId: member, displayName: "Alex" } });
  await prisma.eventMember.create({ data: { tripId: draft.id, userId: member } });
}, 20000);
afterAll(async () => {
  const users = [owner, member, outsider, rollbackUser];
  await prisma.eventMember.deleteMany({ where: { userId: { in: users } } });
  await prisma.trip.deleteMany({ where: { organizerId: { in: users } } });
  await prisma.userProfile.deleteMany({ where: { clerkUserId: { in: users } } });
  await prisma.$disconnect();
});
const edit = (trip, changes = {}) => updateTripSchema.parse({ tripId: trip.id, version: trip.version, name: "Updated event", description: "New plans", timeZone: "America/Denver", ...changes });

test("draft and confirmed creation persist with owner/admin invariant", async () => {
  const saved = await findAccessibleTrip(draft.id, owner);
  expect(saved.destination).toBeNull(); expect(saved.startDate).toBeNull(); expect(saved.endDate).toBeNull();
  expect(saved.planningStatus).toBe("PLANNING"); expect(saved.members).toEqual([{ role: "ADMIN" }]);
  expect((await prisma.userProfile.findUniqueOrThrow({ where: { clerkUserId: owner } })).displayName).toBe("Taylor");
  const fixed = await findAccessibleTrip(confirmed.id, owner);
  expect(fixed.destination).toBe("Denver"); expect(fixed.planningStatus).toBe("FINALIZED");
  expect(fixed.startDate.toISOString()).toBe("2026-11-01T12:00:00.000Z");
  expect(fixed.endDate.toISOString()).toBe("2026-11-03T12:00:00.000Z");
  expect(fixed.timeZone).toBe("America/Denver");
});
test("active member can read but cannot edit; other events remain inaccessible", async () => {
  expect(await findAccessibleTrip(draft.id, member)).not.toBeNull();
  expect(await findAccessibleTrip(confirmed.id, member)).toBeNull();
  expect(await findAccessibleTrip(other.id, owner)).toBeNull();
  await expect(updateAuthorizedTrip(member, edit(draft))).rejects.toThrow("permission");
  await expect(updateAuthorizedTrip(outsider, edit(draft))).rejects.toThrow("permission");
  expect((await prisma.trip.findMany({ where: memberScope(member) })).map(t => t.id)).toEqual([draft.id]);
});
test("metadata persists, clears, and cannot overwrite confirmed planning fields", async () => {
  expect((await updateAuthorizedTrip(owner, edit(confirmed, { destination: "Paris", startDate: "2026-12-01", organizerId: outsider }))).count).toBe(1);
  const saved = await findAccessibleTrip(confirmed.id, owner);
  expect(saved.name).toBe("Updated event"); expect(saved.description).toBe("New plans");
  expect(saved.destination).toBe("Denver"); expect(saved.organizerId).toBe(owner); expect(saved.version).toBe(1);
  await expect(updateAuthorizedTrip(owner, edit(confirmed))).rejects.toThrow("Reload");
  await updateAuthorizedTrip(owner, edit(saved, { description: "" }));
  expect((await findAccessibleTrip(confirmed.id, owner)).description).toBeNull();
});
test("admin can edit but owner guard rejects co-admin; inactive member loses access", async () => {
  const key = { tripId_userId: { tripId: draft.id, userId: member } };
  await prisma.eventMember.update({ where: key, data: { role: "ADMIN" } });
  await requireEventAccess(draft.id, member, "admin");
  await expect(requireEventAccess(draft.id, member, "owner")).rejects.toThrow("permission");
  await updateAuthorizedTrip(member, edit(draft));
  for (const status of ["LEFT", "REMOVED"]) {
    await prisma.eventMember.update({ where: key, data: { status } });
    expect(await findAccessibleTrip(draft.id, member)).toBeNull();
    await expect(updateAuthorizedTrip(member, edit(draft))).rejects.toThrow("permission");
  }
});
test("creation rolls back profile when database rejects incomplete confirmation", async () => {
  // Deliberately bypass validation to exercise transactional rollback at the DB boundary.
  await expect(createOwnedTrip(rollbackUser, { ...details, planningStatus: "FINALIZED", destination: "", startDate: "2026-11-01", endDate: "2026-11-03", timeZone: "UTC" })).rejects.toThrow();
  expect(await prisma.userProfile.findUnique({ where: { clerkUserId: rollbackUser } })).toBeNull();
  expect(await prisma.trip.count({ where: { organizerId: rollbackUser } })).toBe(0);
});
test("concurrent saves do not lose an edit", async () => {
  const current = await findAccessibleTrip(confirmed.id, owner);
  const results = await Promise.allSettled([updateAuthorizedTrip(owner, edit(current, { name: "Concurrent A" })), updateAuthorizedTrip(owner, edit(current, { name: "Concurrent B" }))]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect((await findAccessibleTrip(confirmed.id, owner)).version).toBe(current.version + 1);
});
test("archived event remains readable but blocks edits", async () => {
  await prisma.trip.update({ where: { id: draft.id }, data: { archivedAt: new Date() } });
  expect(await findAccessibleTrip(draft.id, owner)).not.toBeNull();
  await expect(updateAuthorizedTrip(owner, edit(draft))).rejects.toThrow("permission");
});
