import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="p-8">
      <h1>Bachelor Party Planner</h1>
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Trips</h1>
        {/* <UserButton /> */}
      </header>
      <Link href="/trips/new">Create a Trip</Link>
    </main>
  );
}
