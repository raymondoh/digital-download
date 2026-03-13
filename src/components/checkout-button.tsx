"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/app/actions/checkout";

export function CheckoutButton({ productId }: { productId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      // Call the Server Action we built earlier
      const result = await createCheckoutSession(productId);

      if (result.error) {
        // In a production app, you'd use a nice Shadcn toast here instead of an alert!
        alert(result.error);
        setIsLoading(false);
        return;
      }

      if (result.url) {
        // Redirect the user to the secure Stripe hosted checkout page
        router.push(result.url);
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className="w-full max-w-sm rounded-md bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
      {isLoading ? "Preparing secure checkout..." : "$1 - Buy Now"}
    </button>
  );
}
