import Link from "next/link";
import { notFound } from "next/navigation";
import { getTripById } from "@/src/features/trips/queries";
import { getInvitations } from "@/src/features/invitations/queries";
import { getPeople } from "@/src/features/members/queries";
import { InvitationControls } from "@/src/components/invitations/invitation-controls";
import { MemberList } from "@/src/components/members/member-list";

export default async function PeoplePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);
  if (!trip) notFound();
  const [members, invitations] = await Promise.all([getPeople(tripId), trip.canManage ? getInvitations(tripId) : Promise.resolve([])]);
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <Link href={`/trips/${tripId}`} className="underline">Back to {trip.name}</Link>
    <h1 className="text-3xl font-bold">Your group</h1>
    <MemberList {...{ tripId, members }} isOwner={trip.isOwner} canManage={trip.canManage} readOnly={!!trip.archivedAt} />
    {trip.canManage && <InvitationControls tripId={tripId} invitations={invitations.map(i => ({ id: i.id, createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString(), revokedAt: i.revokedAt?.toISOString() ?? null, expired: i.expired }))} />}
  </main>;
}
