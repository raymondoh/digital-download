"use server";

import { stripe } from "@/lib/stripe";
import { getAdminFirestore } from "@/lib/firebase/admin/init";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnv } from "@/lib/env";

const env = getEnv();

export async function createCheckoutSession(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("You must be logged in to purchase templates.");
    }

    const db = getAdminFirestore();

    // 1. Fetch the real product data from Firebase
    const productSnap = await db.collection("products").doc(productId).get();
    if (!productSnap.exists) {
      throw new Error("Product not found.");
    }

    const productData = productSnap.data()!;

    // 2. Create a "pending" Order in Firebase
    // We do this BEFORE calling Stripe so we have an ID to pass to the webhook
    const orderRef = db.collection("orders").doc();
    const orderId = orderRef.id;

    await orderRef.set({
      id: orderId,
      userId: session.user.id,
      customerEmail: session.user.email,
      amountTotal: productData.price,
      status: "pending",
      deliveryEmailSent: false,
      createdAt: Date.now(),
      items: [
        {
          productId: productId,
          title: productData.title,
          price: productData.price,
          deliverableUrl: productData.deliverableUrl
        }
      ]
    });

    // 3. Create the Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: session.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productData.title,
              description: productData.description
              // You can add an images array here if you want a thumbnail in checkout
            },
            unit_amount: productData.price // in cents!
          },
          quantity: 1
        }
      ],
      metadata: {
        orderId: orderId // THIS is how the webhook knows what to fulfill!
      },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/product/${productId}`
    });

    if (!stripeSession.url) {
      throw new Error("Failed to generate Stripe checkout URL.");
    }

    return { url: stripeSession.url };
  } catch (error: any) {
    console.error("Checkout Action Error:", error);
    return { error: error.message };
  }
}
