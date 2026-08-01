import type { Metadata } from "next";
import SectionRedirect from "@/components/ui/SectionRedirect";

export const metadata: Metadata = {
  title: "About Techzilla Inc | Design-Engineering Studio",
  description:
    "Meet Techzilla Inc — an independent design-engineering studio with a craft-first mindset. We combine deep engineering and tasteful design to build digital products that stand out and last.",
  keywords: [
    "about Techzilla Inc",
    "design engineering studio",
    "who is Techzilla",
    "independent studio",
    "web design team",
    "software engineering team",
    "digital product studio",
  ],
  openGraph: {
    title: "About Techzilla Inc | Design-Engineering Studio",
    description:
      "Meet Techzilla Inc — an independent design-engineering studio with a craft-first mindset.",
    url: "https://techzilla.studio/about",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "About Techzilla Inc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Techzilla Inc | Design-Engineering Studio",
    description:
      "Meet Techzilla Inc — an independent design-engineering studio with a craft-first mindset.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://techzilla.studio/about",
  },
};

export default function AboutPage() {
  return <SectionRedirect section="about" />;
}
