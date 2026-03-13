import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CheckoutButton } from "@/components/checkout-button";
import { GoogleSignInButton } from "@/components/google-signin-button";

export default async function Home() {
  // Fetch the secure session on the server
  const session = await getServerSession(authOptions);

  // Our hardcoded Firebase product test ID
  const testProductId = "test-proposal-123";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Business Proposal Template</h1>
        <p className="text-lg text-zinc-600">
          Close more clients with this high-end, professionally structured Canva template.
        </p>

        <div className="pt-6 space-y-4">
          {session ? (
            <>
              <p className="text-sm font-medium text-emerald-600">Welcome back, {session.user.name}!</p>
              <CheckoutButton productId={testProductId} />
            </>
          ) : (
            <GoogleSignInButton />
          )}
        </div>
      </div>
    </main>
  );
}
