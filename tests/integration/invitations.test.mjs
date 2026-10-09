import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { testDatabaseEnvironment } from "../helpers/test-environment.mjs";
Object.assign(process.env, testDatabaseEnvironment());
mock.module("server-only", () => ({}));
const { prisma } = await import("../../src/lib/prisma");
const { createOwnedTrip } = await import("../../src/features/trips/persistence");
const { issueInvitation, revokeInvitation, invitationPreview, joinInvitation, hashInvitationToken } = await import("../../src/features/invitations/persistence");
const suffix = randomUUID();
const owner = `invite-owner-${suffix}`, member = `invite-member-${suffix}`, otherOwner = `invite-other-${suffix}`;
const raceMember = `invite-race-${suffix}`;
let trip, other, link;
beforeAll(async () => {
  const input = { name: "Invitation test", displayName: "Taylor", planningStatus: "PLANNING" };
  trip = await createOwnedTrip(owner, input); other = await createOwnedTrip(otherOwner, input);
  link = await issueInvitation(trip.id, owner);
}, 20000);
afterAll(async () => {
  const users = [owner, member, otherOwner, raceMember];
  await prisma.eventInvitation.deleteMany({ where: { tripId: { in: [trip?.id, other?.id].filter(Boolean) } } });
  await prisma.eventMember.deleteMany({ where: { userId: { in: users } } });
  await prisma.trip.deleteMany({ where: { organizerId: { in: users } } });
  await prisma.userProfile.deleteMany({ where: { clerkUserId: { in: users } } });
  await prisma.$disconnect();
});

test("only hash is persisted and preview contains only event name", async () => {
  const stored = await prisma.eventInvitation.findUniqueOrThrow({ where: { id: link.invitationId } });
  expect(stored.tokenHash).toBe(hashInvitationToken(link.token)); expect(stored.tokenHash).not.toBe(link.token);
  expect(JSON.stringify(stored)).not.toContain(link.token);
  expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBeGreaterThan(6.9 * 86400000);
  expect(await invitationPreview(link.token)).toEqual({ name: trip.name });
});
test("joining is idempotent and creates only MEMBER; outsider cannot issue/revoke", async () => {
  const joined = await Promise.all([joinInvitation(link.token, member, "Alex"), joinInvitation(link.token, member, "Alex")]);
  expect(joined).toEqual([trip.id, trip.id]);
  expect(await prisma.eventMember.count({ where: { tripId: trip.id, userId: member } })).toBe(1);
  const membership = await prisma.eventMember.findUniqueOrThrow({ where: { tripId_userId: { tripId: trip.id, userId: member } } });
  expect(membership.role).toBe("MEMBER");
  await expect(issueInvitation(trip.id, member)).rejects.toThrow("permission");
  await expect(issueInvitation(trip.id, otherOwner)).rejects.toThrow("permission");
  await expect(revokeInvitation(trip.id, link.invitationId, member)).rejects.toThrow("permission");
  await expect(revokeInvitation(other.id, link.invitationId, otherOwner)).rejects.toThrow("unavailable");
}, 15000);
test("removed members require restoration; voluntary leavers can rejoin with new revision", async () => {
  const where = { tripId_userId: { tripId: trip.id, userId: member } };
  await prisma.eventMember.update({ where, data: { status: "REMOVED" } });
  await expect(joinInvitation(link.token, member, "Alex")).rejects.toThrow("restore");
  await prisma.eventMember.update({ where, data: { status: "LEFT", role: "ADMIN", endedAt: new Date() } });
  await joinInvitation(link.token, member, "Alex");
  const saved = await prisma.eventMember.findUniqueOrThrow({ where });
  expect(saved.status).toBe("ACTIVE"); expect(saved.role).toBe("MEMBER"); expect(saved.revision).toBe(2); expect(saved.endedAt).toBeNull();
});
test("revoked and expired links deny preview/join without ejecting joined members", async () => {
  await revokeInvitation(trip.id, link.invitationId, owner);
  expect(await invitationPreview(link.token)).toBeNull();
  await expect(joinInvitation(link.token, otherOwner, "Outsider")).rejects.toThrow("unavailable");
  expect((await prisma.eventMember.findUniqueOrThrow({ where: { tripId_userId: { tripId: trip.id, userId: member } } })).status).toBe("ACTIVE");
  const expired = await issueInvitation(trip.id, owner);
  await prisma.eventInvitation.update({ where: { id: expired.invitationId }, data: { expiresAt: new Date(0) } });
  expect(await invitationPreview(expired.token)).toBeNull();
  await expect(joinInvitation(expired.token, otherOwner, "Outsider")).rejects.toThrow("unavailable");
});
test("concurrent revoke/join serializes and all later joins fail", async () => {
  const race = await issueInvitation(trip.id, owner);
  const results = await Promise.allSettled([revokeInvitation(trip.id, race.invitationId, owner), joinInvitation(race.token, raceMember, "Race tester")]);
  expect(results[0].status).toBe("fulfilled");
  expect((await prisma.eventInvitation.findUniqueOrThrow({ where: { id: race.invitationId } })).revokedAt).not.toBeNull();
  await expect(joinInvitation(race.token, otherOwner, "Later member")).rejects.toThrow("unavailable");
  // A join may finish before revocation, but never produces duplicate membership.
  expect(await prisma.eventMember.count({ where: { tripId: trip.id, userId: raceMember } })).toBeLessThanOrEqual(1);
}, 15000);
test("archived events disable invitation issue, preview and join", async () => {
  const current = await issueInvitation(trip.id, owner);
  await prisma.trip.update({ where: { id: trip.id }, data: { archivedAt: new Date() } });
  expect(await invitationPreview(current.token)).toBeNull();
  await expect(joinInvitation(current.token, otherOwner, "Outsider")).rejects.toThrow("unavailable");
  await expect(issueInvitation(trip.id, owner)).rejects.toThrow("permission");
});
