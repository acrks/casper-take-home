import Link from "next/link";
import type { Trip } from "@/src/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card>
      <CardHeader><CardTitle>{trip.name}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">{trip.archivedAt ? "Archived" : trip.planningStatus === "FINALIZED" ? "Confirmed" : "Still planning"}</p>
        <p>{trip.destination ?? "Destination undecided"}</p>
        <p className="text-sm text-muted-foreground">
          {trip.startDate && trip.endDate ? `${trip.startDate.toLocaleDateString("en-US", { timeZone: "UTC" })} – ${trip.endDate.toLocaleDateString("en-US", { timeZone: "UTC" })}` : "Dates undecided"}
        </p>
        {trip.description && <p className="whitespace-pre-wrap">{trip.description}</p>}
        <Link href={`/trips/${trip.id}`} className="inline-block text-sm font-medium text-primary underline underline-offset-4" aria-label={`Open ${trip.name}`}>Open trip</Link>
      </CardContent>
    </Card>
  );
}
