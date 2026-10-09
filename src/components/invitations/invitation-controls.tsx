"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvitationAction, revokeInvitationAction } from "@/src/features/invitations/actions";

type Invitation = { id: string; createdAt: string; expiresAt: string; revokedAt: string | null; expired: boolean };
export function InvitationControls({ tripId, invitations }: { tripId: string; invitations: Invitation[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ id: string; url: string } | null>(null);
  async function issue() {
    setPending(true); setError(""); setMessage("");
    try {
      const result = await createInvitationAction({ tripId });
      if (result.success) {
        setIssued({ id: result.invitationId, url: `${window.location.origin}/invite/${result.token}` });
        setMessage("Link created. Copy it now; it cannot be recovered after leaving this page.");
        router.refresh();
      } else setError(("message" in result ? result.message : "Unable to create invitation.") || "Unable to create invitation.");
    } catch { setError("Unable to create invitation. Please try again."); }
    finally { setPending(false); }
  }
  async function revoke(invitationId: string) {
    setPending(true); setError(""); setMessage("");
    try {
      const result = await revokeInvitationAction({ tripId, invitationId });
      if (result.success) {
        if (issued?.id === invitationId) setIssued(null);
        setMessage("Link revoked. People who already joined keep their membership."); router.refresh();
      } else setError(("message" in result ? result.message : "Unable to revoke invitation.") || "Unable to revoke invitation.");
    } catch { setError("Unable to revoke invitation. Please try again."); }
    finally { setPending(false); }
  }
  return <section className="space-y-4" aria-labelledby="invitations-heading" aria-busy={pending}>
    <h2 id="invitations-heading" className="text-xl font-semibold">Invitation links</h2>
    <p className="text-sm text-muted-foreground">Anyone with an active link can join as a member. Links expire in seven days. Share them with your group privately.</p>
    <Button onClick={issue} disabled={pending}>{pending ? "Working..." : "Create invitation link"}</Button>
    {issued && <div className="space-y-2">
      <Label htmlFor="invitation-url">New invitation link</Label><Input id="invitation-url" value={issued.url} readOnly />
      <Button variant="outline" onClick={async () => {
        try { await navigator.clipboard.writeText(issued.url); setMessage("Invitation link copied."); }
        catch { setError("Unable to copy automatically. Select and copy the link above."); }
      }}>Copy link</Button>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {invitations.length === 0 ? <p>No invitation links yet.</p> : <ul className="space-y-3">
      {invitations.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <span className="text-sm">Created {invite.createdAt.slice(0, 16).replace("T", " ") + " UTC"} · {invite.revokedAt ? "Revoked" : invite.expired ? "Expired" : `Expires ${invite.expiresAt.slice(0, 16).replace("T", " ") + " UTC"}`}</span>
        {!invite.revokedAt && !invite.expired && <Button variant="outline" disabled={pending} onClick={() => revoke(invite.id)}>Revoke link</Button>}
      </li>)}
    </ul>}
  </section>;
}
