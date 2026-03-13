import { z } from "zod";

const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";

/* -------------------------------------------------------------------------- */
/* SCHEMAS                                                                    */
/* -------------------------------------------------------------------------- */

// 1. Client-side variables (Must start with NEXT_PUBLIC_)
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1)
});

// 2. Server-side variables (Strictly hidden from the browser)
const serverSchema = z.object({
  // NextAuth
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1),

  // Firebase Admin
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(), // Optional locally until you run stripe:listen

  // Resend (For delivering digital products)
  RESEND_API_KEY: z.string().startsWith("re_"),
  SUPPORT_EMAIL: z.string().email().default("support@yourstore.com") // The "From" address for your delivery emails
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
export type Env = PublicEnv & ServerEnv;

/* -------------------------------------------------------------------------- */
/* STATE                                                                      */
/* -------------------------------------------------------------------------- */

let parsedPublic: PublicEnv | null = null;
let parsedServer: ServerEnv | null = null;
let publicValidated = false;
let serverValidated = false;

/* -------------------------------------------------------------------------- */
/* VALIDATORS                                                                 */
/* -------------------------------------------------------------------------- */

export function validatePublicEnv() {
  if (publicValidated) return true;

  const result = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });

  if (!result.success) {
    console.error("❌ Invalid PUBLIC environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid PUBLIC environment variables");
  }

  parsedPublic = result.data;
  publicValidated = true;
  return true;
}

export function validateEnv() {
  if (!isServer) return validatePublicEnv();
  if (serverValidated) return true;

  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const missing = Object.keys(result.error.flatten().fieldErrors);

    // Detect if Next.js is running the build step
    const isBuildStep =
      process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

    // Skip the hard crash if we are in development OR building
    if (!isProduction || isBuildStep) {
      console.warn("⚠️ [env] Missing/invalid SERVER env vars (development/build):", missing.join(", "));
      serverValidated = true;
      return true;
    }

    throw new Error(`❌ Missing or invalid SERVER environment variables:\n${missing.map(k => `- ${k}`).join("\n")}`);
  }

  parsedServer = result.data;
  serverValidated = true;
  return true;
}

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export function getEnv(): Env {
  if (isServer) {
    if (!publicValidated) validatePublicEnv();
    if (!serverValidated) validateEnv();

    const envData = {
      ...(parsedPublic || process.env),
      ...(parsedServer || process.env)
    };

    const isBuildStep =
      process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

    if (isBuildStep) {
      // The Magic Proxy to prevent build crashes
      return new Proxy(envData, {
        get(target, prop) {
          const value = target[prop as keyof typeof target];
          if (value !== undefined && value !== null && value !== "") return value;

          if (typeof prop === "string") {
            if (prop.includes("EMAIL")) return "dummy@example.com";
            if (prop.includes("URL")) return "http://localhost:3000";
            if (prop.includes("STRIPE_SECRET")) return "sk_test_dummy";
            if (prop.includes("RESEND_API")) return "re_dummy";
            return "dummy_build_value";
          }
          return value;
        }
      }) as unknown as Env;
    }

    return envData as unknown as Env;
  }

  if (!publicValidated) validatePublicEnv();
  return (parsedPublic || process.env) as unknown as Env;
}
