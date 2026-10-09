import { notFound } from "next/navigation";
import { EditTripForm } from "@/src/components/trips/edit-trip-form";
import { getTripById } from "@/src/features/trips/queries";

export default async function EditTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);
  if (!trip || !trip.canManage) notFound();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <EditTripForm key={`${trip.id}-${trip.version}`} initialValues={{
        tripId: trip.id, version: trip.version, name: trip.name,
        timeZone: trip.timeZone ?? "", description: trip.description ?? "",
      }} />
    </main>
  );
}
