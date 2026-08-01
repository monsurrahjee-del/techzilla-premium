import type { Metadata, Viewport } from "next";
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

const SITE_URL = "https://techzilla.studio";

export const viewport: Viewport = {
  themeColor: "#06021a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Techzilla Inc — Where Design & Engineering Intersects",
    template: "%s | Techzilla Inc",
  },
  description:
    "Techzilla Inc is an independent design-engineering studio building premium websites, web apps, mobile apps, and AI tools. We turn bold ideas into exceptional digital products — fast, polished, and built to last.",
  keywords: [
    "Techzilla",
    "Techzilla Inc",
    "Techzilla Studio",
    "web design",
    "web development",
    "UI UX design",
    "digital products",
    "React developer",
    "Next.js developer",
    "mobile app development",
    "design engineering studio",
    "premium web design",
    "startup web development",
    "digital agency",
    "web design agency",
    "brand identity design",
    "GSAP animation",
    "Three.js developer",
    "fullstack developer",
    "TypeScript developer",
    "party rentals website",
    "travel agency website",
    "loan management system",
    "microfinance bank website",
    "restaurant website design",
    "church website design",
    "accommodation platform",
    "event rental platform",
    "digital banking dashboard",
    "Nigerian tech studio",
    "software engineering",
    "product design",
    "AI tools development",
    "custom software development",
  ],
  authors: [{ name: "Techzilla Inc", url: SITE_URL }],
  creator: "Techzilla Inc",
  publisher: "Techzilla Inc",
  category: "Technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Techzilla Inc",
    title: "Techzilla Inc — Where Design & Engineering Intersects",
    description:
      "Independent design-engineering studio building premium digital products, web apps, and AI tools for startups and businesses worldwide.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Techzilla Inc — Where Design & Engineering Intersects",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Techzilla Inc — Where Design & Engineering Intersects",
    description:
      "Independent design-engineering studio building premium digital products, web apps, and AI tools.",
    images: ["/opengraph-image"],
    creator: "@techzillainc",
    site: "@techzillainc",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico",                 sizes: "any" },
      { url: "/favicon-16x16.png",           type: "image/png", sizes: "16x16"  },
      { url: "/favicon-32x32.png",           type: "image/png", sizes: "32x32"  },
      { url: "/android-chrome-192x192.png",  type: "image/png", sizes: "192x192"},
      { url: "/android-chrome-512x512.png",  type: "image/png", sizes: "512x512"},
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  alternates: {
    canonical: SITE_URL,
  },
  manifest: "/site.webmanifest",
  other: {
    "google-site-verification": "",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Techzilla Inc",
  alternateName: ["Techzilla", "Techzilla Studio"],
  url: SITE_URL,
  logo: `${SITE_URL}/techzilla-icon.png`,
  image: `${SITE_URL}/techzilla-icon.png`,
  description:
    "Techzilla Inc is an independent design-engineering studio crafting premium digital products, websites, mobile apps, and AI tools for startups and businesses worldwide.",
  areaServed: "Worldwide",
  knowsAbout: [
    "Web Design",
    "Web Development",
    "UI/UX Design",
    "React.js",
    "Next.js",
    "TypeScript",
    "Mobile App Development",
    "AI Tools",
    "Digital Products",
    "Brand Identity",
    "GSAP Animation",
    "Three.js",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Digital Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Web Design & Development",
          description:
            "Premium website design and development using Next.js, React, TypeScript, and modern animation libraries.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "UI/UX Design",
          description:
            "User interface and experience design for web and mobile digital products.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Mobile App Development",
          description:
            "React Native and cross-platform mobile application development.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "AI Tools & Automation",
          description:
            "Custom AI-powered tools, dashboards, and workflow automation systems.",
        },
      },
    ],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Techzilla Inc",
  alternateName: "Techzilla Studio",
  url: SITE_URL,
  description:
    "Independent design-engineering studio building premium digital products.",
  inLanguage: "en-US",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const portfolioSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Techzilla Inc Portfolio",
  description: "Selected digital products built by Techzilla Inc",
  url: `${SITE_URL}/work`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "CreativeWork",
        name: "Party Place & Rentals",
        description: "Luxury Event Rental Platform built with Next.js, React, Node.js, and GSAP",
        url: "https://partyplaceandrentals.com",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "CreativeWork",
        name: "Maser Global Travels",
        description: "Travel & Visa Agency platform built with React, Firebase, and Framer Motion",
        url: "https://maser-global-travels.vercel.app",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "CreativeWork",
        name: "YCT Microfinance Bank",
        description: "Digital Banking Dashboard and Loan Management System built with Next.js and TypeScript",
        url: "https://pay.yctmicrofinancebank.com",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
    {
      "@type": "ListItem",
      position: 4,
      item: {
        "@type": "CreativeWork",
        name: "Malete Hostels",
        description: "Accommodation Platform built with React and Next.js",
        url: "https://malete-hostels.vercel.app",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
    {
      "@type": "ListItem",
      position: 5,
      item: {
        "@type": "CreativeWork",
        name: "Zennyola Foods",
        description: "Restaurant & Catering platform built with Next.js and React",
        url: "https://zennyola.vercel.app",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
    {
      "@type": "ListItem",
      position: 6,
      item: {
        "@type": "CreativeWork",
        name: "RCCG Living Word Forney",
        description: "Church & Ministry Platform built with Next.js, Tailwind CSS, and React",
        url: "https://rccglivingwordforney.org",
        creator: { "@type": "Organization", name: "Techzilla Inc" },
      },
    },
  ],
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
      <head>
        {/* ── Explicit favicon links — ?v=3 busts any browser/CDN cache ── */}
        <link rel="icon"             href="/favicon.ico?v=3"              sizes="any" />
        <link rel="icon"             href="/favicon-32x32.png?v=3"        type="image/png" sizes="32x32" />
        <link rel="icon"             href="/favicon-16x16.png?v=3"        type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3"     sizes="180x180" />
        <link rel="manifest"         href="/site.webmanifest?v=3" />
        <meta name="theme-color"     content="#06021a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(portfolioSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <HeroSplash />
        <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn hoverDuration={0.2} cursorColor="#ffffff" cursorColorOnTarget="#B497CF" />
        <Loader />
        <ScrollBar />
        {children}
      </body>
    </html>
  );
}
