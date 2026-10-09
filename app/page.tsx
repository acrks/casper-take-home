import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1>Bachelor Party Planner</h1>

      <Link href="/trips/new">Create a Trip</Link>
    </main>
  );
}
