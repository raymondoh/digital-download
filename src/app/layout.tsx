// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextAuthProvider } from "@/components/providers/session-provider";
import { Header } from "@/components/header/header";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dollar Download | Premium Business Templates",
  description: "Professional business templates. Just $1."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NextAuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {/* <-- ADD THE HEADER HERE --> */}
            <Navbar />

            {/* The rest of your pages will render below the header */}
            {children}
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
