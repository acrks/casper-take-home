"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinInvitationAction } from "@/src/features/invitations/actions";

export function JoinInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setPending(true); setError("");
    try {
      const result = await joinInvitationAction({ token, displayName });
      if (result.success) router.push(`/trips/${result.tripId}`);
      else setError(("errors" in result ? Object.values(result.errors ?? {}).flat().join(", ") : result.message) || "Unable to join event.");
    } catch { setError("Unable to join event. Please try again."); }
    finally { setPending(false); }
  }
  return <form action={submit} aria-busy={pending}>
    <fieldset disabled={pending} className="space-y-4">
      <Label htmlFor="displayName">Your display name</Label>
      <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={2} maxLength={80} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Joining..." : "Join event"}</Button>
    </fieldset>
  </form>;
}
