import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { testDatabaseEnvironment } from "../helpers/test-environment.mjs";
Object.assign(process.env, testDatabaseEnvironment());
mock.module("server-only", () => ({}));
const { prisma } = await import("../../src/lib/prisma");
const { createOwnedTrip } = await import("../../src/features/trips/persistence");
const { findAccessibleTrip } = await import("../../src/features/events/access");
const { manageMember, updateMemberDetails } = await import("../../src/features/members/persistence");
const suffix = randomUUID();
const owner = `members-owner-${suffix}`, admin = `members-admin-${suffix}`, member = `members-member-${suffix}`, outsider = `members-outsider-${suffix}`;
let trip, other;
const key = userId => ({ tripId_userId: { tripId: trip.id, userId } });
async function input(userId, operation) {
  const target = await prisma.eventMember.findUniqueOrThrow({ where: key(userId) });
  return { tripId: trip.id, memberId: target.id, version: target.version, operation };
}
beforeAll(async () => {
  const details = { name: "Member management", displayName: "Taylor", planningStatus: "PLANNING" };
  trip = await createOwnedTrip(owner, details); other = await createOwnedTrip(outsider, details);
  for (const [userId, role] of [[admin, "ADMIN"], [member, "MEMBER"]]) {
    await prisma.userProfile.create({ data: { clerkUserId: userId, displayName: role } });
    await prisma.eventMember.create({ data: { tripId: trip.id, userId, role } });
  }
}, 20000);
afterAll(async () => {
  const users = [owner, admin, member, outsider];
  await prisma.eventMember.deleteMany({ where: { userId: { in: users } } });
  await prisma.trip.deleteMany({ where: { organizerId: { in: users } } });
  await prisma.userProfile.deleteMany({ where: { clerkUserId: { in: users } } });
  await prisma.$disconnect();
});
test("owner cannot leave, be removed or demoted", async () => {
  for (const operation of ["LEAVE", "REMOVE", "DEMOTE"]) {
    await expect(manageMember(owner, await input(owner, operation))).rejects.toThrow("owner cannot");
  }
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(owner) })).status).toBe("ACTIVE");
});
test("only owner changes admin roles; stale operations fail", async () => {
  const promote = await input(member, "PROMOTE");
  for (const actor of [member, admin, outsider]) await expect(manageMember(actor, promote)).rejects.toThrow();
  await manageMember(owner, promote);
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(member) })).role).toBe("ADMIN");
  await expect(manageMember(owner, promote)).rejects.toThrow("Reload");
  await expect(manageMember(admin, await input(member, "REMOVE"))).rejects.toThrow("Only the event owner");
  await manageMember(owner, await input(member, "DEMOTE"));
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(member) })).role).toBe("MEMBER");
});
test("admin removes/restores ordinary member without deleting history", async () => {
  const before = await prisma.eventMember.findUniqueOrThrow({ where: key(member) });
  await manageMember(admin, await input(member, "REMOVE"));
  expect(await findAccessibleTrip(trip.id, member)).toBeNull();
  await expect(updateMemberDetails(member, { ...await input(member, "LEAVE"), relationship: "Friend", title: "Best man" })).rejects.toThrow("permission");
  await manageMember(admin, await input(member, "RESTORE"));
  const restored = await prisma.eventMember.findUniqueOrThrow({ where: key(member) });
  expect(restored.id).toBe(before.id); expect(restored.status).toBe("ACTIVE"); expect(restored.revision).toBe(before.revision + 2);
  expect(restored.role).toBe("MEMBER"); expect(await findAccessibleTrip(trip.id, member)).not.toBeNull();
});
test("event details are self-only and titles never grant admin access", async () => {
  const details = { ...await input(member, "LEAVE"), relationship: "Friend", title: "Admin" };
  await expect(updateMemberDetails(admin, details)).rejects.toThrow("Reload");
  await updateMemberDetails(member, details);
  const saved = await prisma.eventMember.findUniqueOrThrow({ where: key(member) });
  expect(saved.relationship).toBe("Friend"); expect(saved.title).toBe("Admin"); expect(saved.role).toBe("MEMBER");
  await expect(updateMemberDetails(member, details)).rejects.toThrow("Reload");
  await updateMemberDetails(member, { ...details, version: saved.version, relationship: "", title: "" });
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(member) })).title).toBeNull();
});
test("cross-event targets are rejected even for another event owner", async () => {
  const target = await input(member, "REMOVE");
  await expect(manageMember(outsider, { ...target, tripId: other.id })).rejects.toThrow("Reload");
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(member) })).status).toBe("ACTIVE");
});
test("members and co-admins can leave only for themselves", async () => {
  await expect(manageMember(admin, await input(member, "LEAVE"))).rejects.toThrow("yourself");
  await manageMember(member, await input(member, "LEAVE"));
  await manageMember(admin, await input(admin, "LEAVE"));
  expect(await findAccessibleTrip(trip.id, member)).toBeNull(); expect(await findAccessibleTrip(trip.id, admin)).toBeNull();
  expect((await prisma.eventMember.findUniqueOrThrow({ where: key(admin) })).status).toBe("LEFT");
});
test("archived events reject membership changes", async () => {
  await prisma.trip.update({ where: { id: trip.id }, data: { archivedAt: new Date() } });
  await expect(manageMember(owner, await input(member, "RESTORE"))).rejects.toThrow("permission");
});
