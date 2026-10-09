"use client";
import { Button } from "@/components/ui/button";
export default function InvitationError({ retry }: { retry: () => void }) {
  return <main className="mx-auto max-w-lg space-y-4 p-6"><h1 className="text-2xl font-bold">Unable to load invitation</h1><p>Please try again.</p><Button onClick={retry}>Try again</Button></main>;
}
