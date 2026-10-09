import Link from "next/link";

export default function TripNotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Trip not found</h1>
      <p>This trip does not exist or is no longer available.</p>
      <Link href="/trips" className="text-primary underline underline-offset-4">
        Back to trips
      </Link>
    </main>
  );
}
