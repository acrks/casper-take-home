"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { manageMemberAction, updateMemberDetailsAction } from "@/src/features/members/actions";
import type { ManageMemberInput } from "@/src/features/members/schemas";

type Member = { id: string; displayName: string; role: "ADMIN" | "MEMBER"; status: "ACTIVE" | "LEFT" | "REMOVED"; version: number; relationship: string | null; title: string | null; isSelf: boolean; isOwner: boolean };
export function MemberList({ tripId, members, isOwner, canManage, readOnly }: { tripId: string; members: Member[]; isOwner: boolean; canManage: boolean; readOnly: boolean }) {
  return <div className="space-y-4">{members.map(member => <MemberCard key={`${member.id}-${member.version}`} {...{ tripId, member, isOwner, canManage, readOnly }} />)}</div>;
}
function MemberCard({ tripId, member, isOwner, canManage, readOnly }: { tripId: string; member: Member; isOwner: boolean; canManage: boolean; readOnly: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [relationship, setRelationship] = useState(member.relationship ?? "");
  const [title, setTitle] = useState(member.title ?? "");
  async function manage(operation: ManageMemberInput["operation"]) {
    if ((operation === "REMOVE" || operation === "LEAVE") && !window.confirm(operation === "LEAVE" ? "Leave this event? You will lose access until you join again." : `Remove ${member.displayName} from this event? They will need an admin to restore access.`)) return;
    setPending(true); setError("");
    try {
      const result = await manageMemberAction({ tripId, memberId: member.id, version: member.version, operation });
      if (result.success) { if (operation === "LEAVE") router.push("/trips"); else router.refresh(); }
      else setError(("message" in result ? result.message : "Unable to update membership.") || "Unable to update membership.");
    } catch { setError("Unable to update membership. Please try again."); }
    finally { setPending(false); }
  }
  async function save() {
    setPending(true); setError(""); setMessage("");
    try {
      const result = await updateMemberDetailsAction({ tripId, memberId: member.id, version: member.version, relationship, title });
      if (result.success) { setMessage("Details saved."); router.refresh(); }
      else setError(("errors" in result ? Object.values(result.errors ?? {}).flat().join(", ") : result.message) || "Unable to save details.");
    } catch { setError("Unable to save details. Please try again."); }
    finally { setPending(false); }
  }
  return <Card aria-busy={pending}>
    <CardHeader><CardTitle>{member.displayName}{member.isSelf ? " (you)" : ""}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p>{member.isOwner ? "Owner" : member.role === "ADMIN" ? "Admin" : "Member"} · {member.status === "ACTIVE" ? "Active" : member.status === "LEFT" ? "Left" : "Removed"}</p>
      {member.isSelf && !readOnly ? <form action={save}>
        <fieldset disabled={pending} className="space-y-3">
          <Label htmlFor={`relationship-${member.id}`}>Relationship to the honoree</Label><Input id={`relationship-${member.id}`} value={relationship} onChange={e => setRelationship(e.target.value)} maxLength={120} />
          <Label htmlFor={`title-${member.id}`}>Wedding-party title</Label><Input id={`title-${member.id}`} value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
          <p className="text-sm text-muted-foreground">These details describe you; they do not change your permissions.</p>
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save my details"}</Button>
        </fieldset>
      </form> : <>{member.relationship && <p>{member.relationship}</p>}{member.title && <p>{member.title}</p>}</>}
      {!readOnly && !member.isOwner && <div className="flex flex-wrap gap-2">
        {isOwner && member.status === "ACTIVE" && <Button variant="outline" disabled={pending} onClick={() => manage(member.role === "ADMIN" ? "DEMOTE" : "PROMOTE")}>{member.role === "ADMIN" ? "Make member" : "Make admin"}</Button>}
        {canManage && !member.isSelf && (isOwner || member.role === "MEMBER") && member.status !== "LEFT" && <Button variant="outline" disabled={pending} onClick={() => manage(member.status === "REMOVED" ? "RESTORE" : "REMOVE")}>{member.status === "REMOVED" ? "Restore member" : "Remove member"}</Button>}
        {member.isSelf && member.status === "ACTIVE" && <Button variant="outline" disabled={pending} onClick={() => manage("LEAVE")}>Leave event</Button>}
      </div>}
      {message && <p role="status">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}
