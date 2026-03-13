import Stripe from "stripe";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover", // Updated to match your fresh SDK
  typescript: true,
  appInfo: {
    name: "Digital Template Store"
  }
});
