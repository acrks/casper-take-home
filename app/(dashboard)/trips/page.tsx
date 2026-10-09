import Link from "next/link";
import { getTrips } from "@/src/features/trips/queries";
import { TripCard } from "@/src/components/trips/trip-card";

export default async function TripsPage() {
  const trips = await getTrips();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Trips</h1>

        <Link
          href="/trips/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Create Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p>No trips yet. Create your first one!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  );
}
