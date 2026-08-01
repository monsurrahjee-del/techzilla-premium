import type { Metadata } from "next";
import SectionRedirect from "@/components/ui/SectionRedirect";

export const metadata: Metadata = {
  title: "Services | Web Design, App Development & AI Tools — Techzilla Inc",
  description:
    "Techzilla Inc offers premium web design, web development, mobile app development, UI/UX design, and custom AI tools. We build fast, polished digital products using React, Next.js, TypeScript, and GSAP.",
  keywords: [
    "web design services",
    "web development services",
    "mobile app development",
    "UI UX design services",
    "Next.js development",
    "React development",
    "AI tools development",
    "custom software development",
    "digital product design",
    "Techzilla services",
    "hire web developer",
    "hire designer",
    "digital agency services",
  ],
  openGraph: {
    title: "Services | Web Design, App Development & AI Tools — Techzilla Inc",
    description:
      "Premium web design, app development, and AI tools. We build fast, polished digital products using React, Next.js, and TypeScript.",
    url: "https://techzilla.studio/services",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Services — Techzilla Inc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Services | Web Design, App Development & AI Tools — Techzilla Inc",
    description:
      "Premium web design, app development, and AI tools by Techzilla Inc.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://techzilla.studio/services",
  },
};

export default function ServicesPage() {
  return <SectionRedirect section="services" />;
}
