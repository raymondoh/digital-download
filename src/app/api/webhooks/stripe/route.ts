// src/app/api/webhooks/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getEnv } from "@/lib/env";
import { getAdminFirestore } from "@/lib/firebase/admin/init";
import { Resend } from "resend";

const env = getEnv();
const resend = new Resend(env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event;

  try {
    // 1. Verify the webhook signature securely
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET || "" // You'll get this secret when you run the Stripe CLI locally
    );
  } catch (error: any) {
    console.error("❌ Webhook signature verification failed.", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // 2. Handle the successful checkout event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    try {
      // We will pass the Firebase orderId to Stripe when the user clicks "Buy",
      // so Stripe passes it right back to us here in the metadata.
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        throw new Error("No order ID found in session metadata");
      }

      const db = getAdminFirestore();
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        throw new Error("Order not found in Firebase");
      }

      const orderData = orderSnap.data();

      // 3. Mark the Firebase order as paid
      await orderRef.update({
        status: "paid",
        stripeSessionId: session.id
      });

      // 4. Extract the digital deliverables to email
      const items = orderData?.items || [];
      const downloadLinksHtml = items
        .map(
          (item: any) =>
            `<li style="margin-bottom: 10px;">
          <a href="${item.deliverableUrl}" style="color: #2563eb; font-weight: bold; text-decoration: none;">
            Access ${item.title}
          </a>
        </li>`
        )
        .join("");

      // 5. Send the delivery email via Resend
      const customerEmail = session.customer_details?.email || orderData?.customerEmail;

      const emailResult = await resend.emails.send({
        from: env.SUPPORT_EMAIL, // Must be a verified domain in Resend
        to: customerEmail,
        subject: "Your Digital Downloads Are Here! 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #111827;">Thank you for your purchase!</h1>
            <p style="color: #4b5563; line-height: 1.5;">
              Your $1 templates are ready. Click the links below to instantly copy them into your workspace:
            </p>
            <ul style="padding-left: 20px;">
              ${downloadLinksHtml}
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any issues accessing your files, just reply directly to this email!
            </p>
          </div>
        `
      });

      if (emailResult.error) {
        console.error("❌ Failed to send email via Resend:", emailResult.error);
        // We log the error but don't throw, so Stripe still gets a 200 OK and doesn't infinitely retry
      } else {
        // 6. Mark delivery as sent in Firebase!
        await orderRef.update({ deliveryEmailSent: true });
        console.log(`✅ Order ${orderId} successfully fulfilled!`);
      }
    } catch (error: any) {
      console.error("❌ Error processing successful checkout:", error);
      return new NextResponse("Webhook handler failed", { status: 500 });
    }
  }

  // Always return a 200 to Stripe to acknowledge receipt of the event
  return new NextResponse(null, { status: 200 });
}
