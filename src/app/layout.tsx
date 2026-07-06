import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skillet — Recipes & Meal Prep",
  description:
    "Personal recipe box, meal planner, macro tracker, and smart shopping list.",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <Nav />
        {/* Offset for sidebar (desktop) / bottom bar (mobile) */}
        <main className="md:pl-60 pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
