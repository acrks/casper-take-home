import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p role="status">Loading sign in...</p>}>
        <SignIn />
      </Suspense>
    </main>
  );
}
