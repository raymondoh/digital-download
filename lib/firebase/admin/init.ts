import * as admin from "firebase-admin";
import { getEnv } from "@/lib/env";

export function getAdminApp() {
  const env = getEnv();

  // 1. If we are running the Next.js build step, return a dummy mock
  // to prevent the build from crashing while trying to parse empty credentials.
  const isBuildStep =
    process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

  if (isBuildStep) {
    console.warn("⚠️ [Firebase Admin] Build step detected. Using mock Admin instance.");
    return {} as admin.app.App;
  }

  // 2. Check if the app is already initialized to prevent duplicate initialization errors
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  // 3. Clean up the private key format.
  // Vercel and .env files often mess up the literal "\n" newline characters.
  const privateKey = env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined;

  if (!env.FIREBASE_CLIENT_EMAIL || !privateKey || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("❌ Firebase Admin initialization failed: Missing credentials.");
  }

  // 4. Initialize the secure Admin SDK
  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
    throw error;
  }
}

// Helper functions for easy imports in your API routes/Server Actions
export function getAdminAuth() {
  const app = getAdminApp();
  // Safe return if it's the mock build app
  if (!app.auth) return {} as admin.auth.Auth;
  return admin.auth(app);
}

export function getAdminFirestore() {
  const app = getAdminApp();
  if (!app.firestore) return {} as admin.firestore.Firestore;
  return admin.firestore(app);
}
