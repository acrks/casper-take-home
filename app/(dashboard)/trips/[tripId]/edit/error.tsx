"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditTripError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unable to load trip for editing:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Unable to load trip</h1>
      <p role="alert">Please try again in a moment.</p>
      <div className="flex items-center gap-4">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/trips" className="text-sm underline underline-offset-4">
          Back to trips
        </Link>
      </div>
    </main>
  );
}
