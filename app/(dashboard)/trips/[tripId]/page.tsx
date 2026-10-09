import Link from "next/link";
import { notFound } from "next/navigation";
import { getTripById, getTrips } from "@/src/features/trips/queries";
import { TripCard } from "@/src/components/trips/trip-card";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);
  if (!trip) notFound();
  const trips = await getTrips();
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <nav aria-label="Your events" className="flex flex-wrap gap-4 text-sm">
        <Link href="/trips" className="underline">All trips</Link>
        {trips.map((event) => <Link key={event.id} href={`/trips/${event.id}`} aria-current={event.id === trip.id ? "page" : undefined} className="underline aria-[current=page]:font-bold">{event.name}</Link>)}
      </nav>
      <h1 className="text-3xl font-bold">{trip.name}</h1>
      <p>{trip.isOwner ? "You own this event." : trip.canManage ? "You are an event admin." : "You are an event member."}</p>
      <TripCard trip={trip} />
      <p className="text-sm text-muted-foreground">{trip.timeZone ? `Event time zone: ${trip.timeZone}` : "Time zone not chosen. An admin must choose it before scheduling."}</p>
      <Link href={`/trips/${trip.id}/people`} className="mr-6 inline-block font-medium underline">People</Link>
      {trip.canManage && <Link href={`/trips/${trip.id}/edit`} className="inline-block font-medium underline">Edit trip</Link>}
    </main>
  );
}
