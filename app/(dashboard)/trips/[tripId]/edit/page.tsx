import { notFound } from "next/navigation";
import { EditTripForm } from "@/src/components/trips/edit-trip-form";
import { getTripById } from "@/src/features/trips/queries";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);

  if (!trip) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <EditTripForm
        tripId={trip.id}
        initialValues={{
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate.toISOString().slice(0, 10),
          endDate: trip.endDate.toISOString().slice(0, 10),
          description: trip.description ?? "",
        }}
      />
    </main>
  );
}
