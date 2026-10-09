import "server-only";
import { requireEventAccess } from "@/src/features/events/access";
import { eventTransaction } from "@/src/features/events/transaction";
import type { ManageMemberInput, MemberDetailsInput } from "./schemas";

export class MemberError extends Error {}
const conflict = () => new MemberError("Membership changed. Reload the page and try again.");
export async function manageMember(userId: string, input: ManageMemberInput) {
  return eventTransaction(async (tx) => {
    const trip = await requireEventAccess(input.tripId, userId, input.operation === "LEAVE" ? "member" : "admin", tx);
    const target = await tx.eventMember.findFirst({ where: { id: input.memberId, tripId: input.tripId } });
    if (!target || target.version !== input.version) throw conflict();
    if (target.userId === trip.organizerId) throw new MemberError("The event owner cannot leave, be removed, or change their own role.");
    const isOwner = userId === trip.organizerId;
    const operation = input.operation;
    if (operation === "LEAVE" && target.userId !== userId) throw new MemberError("You can only leave for yourself.");
    if (operation !== "LEAVE" && (operation === "PROMOTE" || operation === "DEMOTE" || target.role === "ADMIN") && !isOwner) {
      throw new MemberError("Only the event owner can manage admin roles or remove an admin.");
    }
    if (operation === "RESTORE" ? target.status !== "REMOVED" : target.status !== "ACTIVE") throw conflict();
    if (operation === "PROMOTE" && target.role !== "MEMBER" || operation === "DEMOTE" && target.role !== "ADMIN") throw conflict();
    const data = operation === "PROMOTE" ? { role: "ADMIN" as const }
      : operation === "DEMOTE" ? { role: "MEMBER" as const }
      : operation === "RESTORE" ? { role: "MEMBER" as const, status: "ACTIVE" as const, endedAt: null, joinedAt: new Date(), revision: { increment: 1 } }
      : { status: operation === "LEAVE" ? "LEFT" as const : "REMOVED" as const, endedAt: new Date(), revision: { increment: 1 } };
    const updated = await tx.eventMember.updateMany({ where: { id: target.id, tripId: trip.id, version: input.version }, data: { ...data, version: { increment: 1 } } });
    if (!updated.count) throw conflict();
  });
}
export async function updateMemberDetails(userId: string, input: MemberDetailsInput) {
  return eventTransaction(async (tx) => {
    await requireEventAccess(input.tripId, userId, "member", tx);
    const updated = await tx.eventMember.updateMany({
      where: { id: input.memberId, tripId: input.tripId, userId, status: "ACTIVE", version: input.version },
      data: { relationship: input.relationship || null, title: input.title || null, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
  });
}
