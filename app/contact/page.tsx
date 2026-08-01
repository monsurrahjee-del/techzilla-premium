import type { Metadata } from "next";
import SectionRedirect from "@/components/ui/SectionRedirect";

export const metadata: Metadata = {
  title: "Contact Techzilla Inc | Start a Project",
  description:
    "Ready to build something great? Get in touch with Techzilla Inc to discuss your next website, mobile app, or digital product. We work with startups, businesses, and visionaries worldwide.",
  keywords: [
    "contact Techzilla Inc",
    "hire web developer",
    "hire web designer",
    "start a project",
    "get a website quote",
    "web design inquiry",
    "mobile app development inquiry",
    "work with Techzilla",
    "digital product consultation",
    "Techzilla contact",
  ],
  openGraph: {
    title: "Contact Techzilla Inc | Start a Project",
    description:
      "Ready to build something great? Get in touch with Techzilla Inc to discuss your next website or digital product.",
    url: "https://techzilla.studio/contact",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Contact Techzilla Inc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Techzilla Inc | Start a Project",
    description:
      "Ready to build something great? Get in touch with Techzilla Inc.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://techzilla.studio/contact",
  },
};

export default function ContactPage() {
  return <SectionRedirect section="contact" />;
}
