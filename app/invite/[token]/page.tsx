import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { invitationTokenSchema } from "@/src/features/invitations/schemas";
import { invitationPreview } from "@/src/features/invitations/persistence";
import { JoinInvitationForm } from "@/src/components/invitations/join-invitation-form";

export const metadata: Metadata = { title: "Event invitation | Evter", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  // Expiry must use the time of this request, including for signed-out visitors.
  await connection();
  const { token } = await params;
  const { userId } = await auth();
  const valid = invitationTokenSchema.safeParse(token);
  const invitation = valid.success ? await invitationPreview(valid.data) : null;
  if (!invitation) return <main className="mx-auto max-w-lg space-y-4 p-6"><h1 className="text-2xl font-bold">Invitation unavailable</h1><p>Ask an organizer for a new invitation link.</p></main>;
  return <main className="mx-auto max-w-lg space-y-6 p-6">
    <h1 className="text-3xl font-bold">Join {invitation.name}</h1>
    <p>You have been invited to plan this event with the group.</p>
    {userId ? <JoinInvitationForm token={token} /> : <SignInButton forceRedirectUrl={`/invite/${token}`} signUpForceRedirectUrl={`/invite/${token}`}><Button>Sign in to join</Button></SignInButton>}
  </main>;
}
