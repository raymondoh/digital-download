import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* PRODUCT SCHEMA                                                             */
/* -------------------------------------------------------------------------- */

export const productSchema = z.object({
  id: z.string().optional(), // Optional when creating a new product before Firebase assigns an ID
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),

  // Store all prices in cents! $1.00 = 100. $3.50 = 350.
  price: z.number().min(0, "Price cannot be negative"),

  // Digital Delivery
  deliverableUrl: z.string().url("Must be a valid Canva, Google Drive, or Notion URL"),
  imageUrl: z.string().url("Must be a valid image URL").optional(),

  // Bundle Logic
  isBundle: z.boolean().default(false),
  includedProductIds: z.array(z.string()).default([]), // Empty if it's a single item

  // Store settings
  active: z.boolean().default(true), // Easy way to hide a product without deleting it

  // Timestamps (Using Date.now() numbers for easy Next.js serialization)
  createdAt: z.number(),
  updatedAt: z.number()
});

export type Product = z.infer<typeof productSchema>;

/* -------------------------------------------------------------------------- */
/* ORDER SCHEMA                                                               */
/* -------------------------------------------------------------------------- */

export const orderItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  price: z.number(), // Capture the price AT THE TIME OF SALE
  deliverableUrl: z.string() // Save the link they bought so they can access it from their dashboard later
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(), // Links to your NextAuth/Firebase user
  customerEmail: z.string().email(), // Where the Resend email goes

  // Stripe references
  stripeSessionId: z.string(),
  amountTotal: z.number(), // Total paid in cents

  // What they bought
  items: z.array(orderItemSchema),

  // Fulfillment tracking
  status: z.enum(["pending", "paid", "failed"]),
  deliveryEmailSent: z.boolean().default(false), // Webhook flips this to true once Resend fires

  createdAt: z.number()
});

export type Order = z.infer<typeof orderSchema>;
