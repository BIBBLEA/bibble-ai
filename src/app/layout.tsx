import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bibble AI - Générateur de Vidéos Publicitaires IA",
  description:
    "Créez des vidéos publicitaires ultra-réalistes avec des avatars IA en quelques secondes. Hooks & Ads pour TikTok, YouTube Shorts, Reels et Facebook Ads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
