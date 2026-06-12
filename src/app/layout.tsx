import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopLedger — your shop's digital notebook",
  description: "Record sales, expenses, stock, and profit in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      >
        {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) add
            attributes like cz-shortcut-listen to <body> before React hydrates.
            This only ignores attribute mismatches on <body> itself, not its
            children, so real hydration issues still surface. */}
        <body className="min-h-full" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
