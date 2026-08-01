import type { Metadata } from "next";
import SectionRedirect from "@/components/ui/SectionRedirect";

export const metadata: Metadata = {
  title: "Our Work | Portfolio of Digital Products — Techzilla Inc",
  description:
    "Explore Techzilla Inc's portfolio — event rental platforms, travel agency sites, digital banking dashboards, restaurant platforms, church websites, accommodation platforms, and more. Built with Next.js, React, and GSAP.",
  keywords: [
    "Techzilla portfolio",
    "web design portfolio",
    "digital products portfolio",
    "Party Place and Rentals website",
    "Maser Global Travels website",
    "YCT Microfinance Bank website",
    "loan management system",
    "Malete Hostels website",
    "Zennyola Foods restaurant website",
    "RCCG Living Word Forney church website",
    "event rental platform",
    "travel agency website",
    "microfinance bank web app",
    "digital banking dashboard",
    "Next.js project examples",
    "React portfolio",
  ],
  openGraph: {
    title: "Our Work | Portfolio of Digital Products — Techzilla Inc",
    description:
      "Event rental platforms, travel sites, banking dashboards, restaurant apps, and more — all built by Techzilla Inc.",
    url: "https://techzilla.studio/work",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Techzilla Inc Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Work | Portfolio — Techzilla Inc",
    description:
      "Event rental platforms, travel sites, banking dashboards, restaurant apps — built by Techzilla Inc.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://techzilla.studio/work",
  },
};

export default function WorkPage() {
  return <SectionRedirect section="work" />;
}
