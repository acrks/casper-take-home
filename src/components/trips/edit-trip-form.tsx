"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateTrip } from "@/src/features/trips/actions";
import type { UpdateTripInput } from "@/src/features/trips/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditTripForm({ initialValues }: { initialValues: UpdateTripInput }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setPending(true);
    setError("");
    try {
      const result = await updateTrip(values);
      if (result.success) {
        router.push(`/trips/${result.tripId}`);
      } else {
        setError(("errors" in result ? Object.values(result.errors ?? {}).flat().join(", ") : result.message) || "Unable to save trip.");
      }
    } catch { setError("An unexpected error occurred. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Edit trip</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} aria-busy={pending}>
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trip name</Label>
              <Input id="name" name="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required minLength={3} maxLength={120} />
            </div>
            <p className="text-sm text-muted-foreground">Dates and destination are managed through group planning. This form updates the event details.</p>
            <div className="space-y-2">
              <Label htmlFor="timeZone">Event time zone</Label>
              <Input id="timeZone" name="timeZone" value={values.timeZone} onChange={(event) => setValues({ ...values, timeZone: event.target.value })} placeholder="America/Los_Angeles" maxLength={100} />
              <p className="text-sm text-muted-foreground">Choose the destination’s time zone before scheduling an itinerary.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={values.description ?? ""} onChange={(event) => setValues({ ...values, description: event.target.value })} maxLength={1000} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error} <Link href={`/trips/${values.tripId}/edit`} onClick={() => window.location.reload()} className="underline">Reload event</Link></p>}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save changes"}</Button>
              <Link href={`/trips/${values.tripId}`} className="text-sm underline underline-offset-4">Cancel</Link>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
