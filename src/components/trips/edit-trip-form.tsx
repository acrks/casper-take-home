"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateTrip } from "@/src/features/trips/actions";
import type { CreateTripInput } from "@/src/features/trips/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditTripForm({
  tripId,
  initialValues,
}: {
  tripId: string;
  initialValues: CreateTripInput;
}) {
  const router = useRouter();
  // Controlled inputs preserve edits when a form action returns an error.
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");

    try {
      const result = await updateTrip({
        tripId,
        name: formData.get("name"),
        destination: formData.get("destination"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        description: formData.get("description"),
      });

      if (result.success) {
        router.push("/trips");
      } else {
        const message =
          "errors" in result
            ? Object.values(result.errors ?? {}).flat().join(", ")
            : result.message;

        setError(message || "Unable to save trip.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit trip</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} aria-busy={pending}>
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trip name</Label>
              <Input
                id="name"
                name="name"
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                name="destination"
                value={values.destination}
                onChange={(event) => setValues({ ...values, destination: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={values.startDate}
                  onChange={(event) => setValues({ ...values, startDate: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={values.endDate}
                  onChange={(event) => setValues({ ...values, endDate: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={values.description ?? ""}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
              <Link href="/trips" className="text-sm underline underline-offset-4">
                Cancel
              </Link>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
