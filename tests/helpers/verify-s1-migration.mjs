import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { testDatabaseEnvironment } from "./test-environment.mjs";

Object.assign(process.env, testDatabaseEnvironment());
const { prisma } = await import("../../src/lib/prisma");
const snapshotFile = "/private/tmp/evter-s1-before.json";
const select = { id: true, name: true, destination: true, startDate: true, endDate: true, description: true, organizerId: true, createdAt: true, updatedAt: true };
try {
  const trips = await prisma.trip.findMany({ select, orderBy: { id: "asc" } });
  if (process.argv[2] === "before") {
    writeFileSync(snapshotFile, JSON.stringify(trips), { mode: 0o600, flag: "wx" });
    console.log(`Recorded ${trips.length} existing trips for migration preservation checks.`);
  } else {
    assert.deepEqual(JSON.parse(JSON.stringify(trips)), JSON.parse(readFileSync(snapshotFile)));
    for (const trip of trips) {
      const saved = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id }, include: { members: true, organizer: true } });
      assert.equal(saved.planningStatus, "FINALIZED");
      assert.equal(saved.timeZone, null);
      assert.ok(saved.members.some((member) => member.userId === trip.organizerId && member.role === "ADMIN" && member.status === "ACTIVE"));
      assert.equal(saved.organizer.displayName, null);
    }
    console.log(`PASS: ${trips.length} existing trips and timestamps preserved; profiles/owner memberships backfilled.`);
  }
} finally { await prisma.$disconnect(); }
