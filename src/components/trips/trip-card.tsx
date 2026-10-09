import type { Trip } from "@/src/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{trip.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        <p>{trip.destination}</p>
        <p className="text-sm text-muted-foreground">
          {trip.startDate.toLocaleDateString("en-US", {
            timeZone: "UTC",
          })}
          {" - "}
          {trip.endDate.toLocaleDateString("en-US", {
            timeZone: "UTC",
          })}
        </p>
        {trip.description && <p>{trip.description}</p>}
      </CardContent>
    </Card>
  );
}
