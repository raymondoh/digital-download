import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAdminAuth } from "@/lib/firebase/admin/init";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          return null;
        }

        try {
          // 1. Verify the Firebase token securely on the server
          const adminAuth = getAdminAuth();
          const decodedToken = await adminAuth.verifyIdToken(credentials.idToken);

          // 2. Return the user object to NextAuth
          return {
            id: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
            image: decodedToken.picture,
            role: decodedToken.role || "user" // Default to 'user'
          };
        } catch (error) {
          console.error("❌ Firebase ID Token verification failed:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, attach the user data to the token
      if (user) {
        token.uid = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the token data into the browser session object
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login" // Custom login page route
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: env.NEXTAUTH_SECRET
};
