import type { Metadata } from "next";
import TargetCursor from "@/components/ui/TargetCursor";
import ScrollBar from "@/components/ui/ScrollBar/ScrollBar";
import HeroSplash from "@/components/ui/SplashCursor/HeroSplash";
import { Geist, Geist_Mono, Instrument_Serif, Pacifico, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Loader from "@/components/ui/Loader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const pacifico = Pacifico({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Techzilla — Craft & Taste for Digital Work",
  description:
    "Techzilla is an independent design-engineering studio crafting premium digital products, interfaces, and AI tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${pacifico.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HeroSplash />
        <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn hoverDuration={0.2} cursorColor="#ffffff" cursorColorOnTarget="#B497CF" />
        <Loader />
        <ScrollBar />
      {children}</body>
    </html>
  );
}
