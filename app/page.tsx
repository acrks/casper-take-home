import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="p-8">
      <h1>Evter</h1>
      <h3>The party before the ever after</h3>
      <header className="flex items-center justify-between">
        {/* <UserButton /> */}
      </header>
      <Link
        href="/trips/new"
        className="bg-purple-700 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
      >
        Get the Party Started!
      </Link>
    </main>
  );
}
