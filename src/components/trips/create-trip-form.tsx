"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/src/features/trips/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateTripForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", displayName: "", destination: "", startDate: "", endDate: "", description: "", timeZone: "" });
  const [planningStatus, setPlanningStatus] = useState("PLANNING");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const field = (name: keyof typeof values) => ({
    id: name, name, value: values[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [name]: event.target.value }),
  });

  async function handleSubmit() {
    setPending(true);
    setError("");
    try {
      const result = await createTrip({ ...values, planningStatus });
      if (result.success) {
        router.push(`/trips/${result.tripId}`);
      } else {
        setError(("errors" in result ? Object.values(result.errors ?? {}).flat().join(", ") : result.message) || "Unable to create trip.");
      }
    } catch { setError("An unexpected error occurred. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Get the party started</CardTitle></CardHeader>
      <CardContent>
        <form action={handleSubmit} aria-busy={pending}>
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your display name</Label>
              <Input {...field("displayName")} required minLength={2} maxLength={80} autoComplete="nickname" />
              <p className="text-sm text-muted-foreground">The name your group will see. Contact details are optional.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Trip name</Label>
              <Input {...field("name")} placeholder="Denver Bachelor Weekend" required minLength={3} maxLength={120} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Have you decided where and when?</legend>
              <label className="flex items-center gap-2"><input type="radio" name="planningStatus" value="PLANNING" checked={planningStatus === "PLANNING"} onChange={() => setPlanningStatus("PLANNING")} />Still planning</label>
              <label className="flex items-center gap-2"><input type="radio" name="planningStatus" value="FINALIZED" checked={planningStatus === "FINALIZED"} onChange={() => setPlanningStatus("FINALIZED")} />Dates and destination confirmed</label>
            </fieldset>
            {planningStatus === "FINALIZED" && <>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input {...field("destination")} placeholder="Denver, Colorado" required minLength={2} maxLength={160} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="startDate">Start date</Label><Input {...field("startDate")} type="date" required /></div>
                <div className="space-y-2"><Label htmlFor="endDate">End date</Label><Input {...field("endDate")} type="date" required /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone">Event time zone</Label>
                <Input {...field("timeZone")} placeholder="America/Denver" required maxLength={100} aria-describedby="zone-help" />
                <p id="zone-help" className="text-sm text-muted-foreground">Use the destination’s time zone, for example America/Denver or Europe/London.</p>
              </div>
            </>}
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea {...field("description")} maxLength={1000} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create trip"}</Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
