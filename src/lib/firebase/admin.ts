import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { env } from "@/lib/env";

/**
 * Standardizes the private key format to handle
 * escaped newlines common in environment variables.
 */
const formatPrivateKey = (key: string) => {
  return key.replace(/\\n/g, "\n");
};

export function getFirebaseAdmin() {
  const currentApps = getApps();

  // Return the existing app if already initialized (Singleton)
  if (currentApps.length > 0) {
    return currentApps[0];
  }

  // Initialize a new instance using validated environment variables
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey(env.FIREBASE_PRIVATE_KEY)
    }),
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

/**
 * Exported helpers for common Admin services
 */
export const adminDb = admin.firestore(getFirebaseAdmin());
export const adminAuth = admin.auth(getFirebaseAdmin());
export const adminStorage = admin.storage(getFirebaseAdmin());
