// import { NextResponse } from "next/server";
// import { stripe } from "@/lib/stripe";
// import { adminDb } from "@/lib/firebase/admin";
// import { Order } from "@/lib/schemas";
// import { Resend } from "resend";
// import { ReceiptEmail } from "@/components/emails/receipt-email";
// import { env } from "@/lib/env";

// const resend = new Resend(env.RESEND_API_KEY);
// const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

// export async function POST(req: Request) {
//   try {
//     // 1. Get the raw body and signature for security verification
//     const body = await req.text();
//     const signature = req.headers.get("stripe-signature");

//     if (!signature || !endpointSecret) {
//       return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
//     }

//     // 2. Verify the event came from Stripe
//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
//     } catch (err: any) {
//       console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
//       return NextResponse.json({ error: err.message }, { status: 400 });
//     }

//     // 3. Handle the successful checkout event
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;

//       // Grab the database Order ID we passed through our Checkout Action
//       const orderId = session.metadata?.orderId;

//       if (!orderId) {
//         throw new Error("No orderId found in Stripe metadata");
//       }

//       // 4. Fetch the pending order from Firestore
//       const orderRef = adminDb.collection("orders").doc(orderId);
//       const orderSnap = await orderRef.get();

//       if (!orderSnap.exists) {
//         throw new Error(`Order ${orderId} not found in database`);
//       }

//       const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;

//       // 5. Send the fulfillment email via Resend
//       const emailResult = await resend.emails.send({
//         from: "Dollar Download <no-reply@plumbersportal.com>", // Update with your verified Resend domain
//         to: session.customer_details?.email || orderData.customerEmail,
//         subject: "Your Templates are Ready | Dollar Download",
//         react: ReceiptEmail({ order: orderData })
//       });

//       if (emailResult.error) {
//         console.error("❌ Failed to send Resend email:", emailResult.error);
//         // We don't throw here, because we still want to mark the order as paid!
//       }

//       // 6. Mark the order as completely fulfilled in your database
//       await orderRef.update({
//         status: "paid",
//         deliveryEmailSent: !emailResult.error, // True if email sent successfully
//         updatedAt: Date.now()
//       });

//       console.log(`✅ Order ${orderId} fulfilled successfully!`);
//     }

//     // Return a 200 response to acknowledge receipt of the event
//     return NextResponse.json({ received: true }, { status: 200 });
//   } catch (error: any) {
//     console.error("❌ Webhook Error:", error.message);
//     return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
//   }
// }
import * as React from "react";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase/admin";
import { Order } from "@/lib/schemas";
import { Resend } from "resend";
import { ReceiptEmail } from "@/components/emails/receipt-email";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);
const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature || !endpointSecret) {
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        throw new Error("No orderId found in Stripe metadata");
      }

      const orderRef = adminDb.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;

      const emailResult = await resend.emails.send({
        from: "Dollar Download <no-reply@plumbersportal.com>",
        to: session.customer_details?.email || orderData.customerEmail,
        subject: "Your Templates are Ready | Dollar Download",
        react: React.createElement(ReceiptEmail, { order: orderData })
      });

      if (emailResult.error) {
        console.error("❌ Failed to send Resend email:", emailResult.error);
      }

      await orderRef.update({
        status: "paid",
        deliveryEmailSent: !emailResult.error,
        updatedAt: Date.now()
      });

      console.log(`✅ Order ${orderId} fulfilled successfully!`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Webhook Error:", error.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
