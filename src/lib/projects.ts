export interface Project {
  title: string;
  category: string;
  tech: string[];
  image: string;
  url: string;
  accent: string;
  glow: string;
}

export const projects: Project[] = [
  {
    title: "Party Place & Rentals",
    category: "Luxury Event Rental Platform",
    tech: ["Next.js", "React", "Node.js", "GSAP"],
    image: "/portfolio/party-place/home.png",
    url: "partyplaceandrentals.com",
    accent: "#FF7A00",
    glow: "rgba(255,122,0,0.35)",
  },

  {
    title: "Maser Global Travels",
    category: "Travel & Visa Agency",
    tech: ["React", "Firebase", "Framer Motion"],
    image: "/portfolio/travel/home.png",
    url: "maser-global-travels.vercel.app",
    accent: "#00C9FF",
    glow: "rgba(0,201,255,0.35)",
  },

  {
    title: "Loan Management System",
    category: "Financial Platform",
    tech: ["Next.js", "TypeScript", "GSAP"],
    image: "/portfolio/loan/home.png",
    url: "yctmicrofinancebank.com",
    accent: "#4D7CFE",
    glow: "rgba(77,124,254,0.35)",
  },

  {
    title: "YCT Microfinance",
    category: "Digital Banking Dashboard",
    tech: ["React", "Next.js", "Dashboard"],
    image: "/portfolio/yct/home.png",
    url: "pay.yctmicrofinancebank.com",
    accent: "#00C853",
    glow: "rgba(0,200,83,0.35)",
  },

  {
    title: "Malete Hostels",
    category: "Accommodation Platform",
    tech: ["React", "Next.js"],
    image: "/portfolio/malete/home.png",
    url: "malete-hostels.vercel.app",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.35)",
  },

  {
    title: "Zennyola Foods",
    category: "Restaurant & Catering",
    tech: ["Next.js", "React"],
    image: "/portfolio/food/home.png",
    url: "zennyola.vercel.app",
    accent: "#F43F5E",
    glow: "rgba(244,63,94,0.35)",
  },

  {
    title: "RCCG Living Word Forney",
    category: "Church & Ministry Platform",
    tech: ["Next.js", "Tailwind CSS", "React"],
    image: "/portfolio/church/home.png",
    url: "rccglivingwordforney.org",
    accent: "#7C3AED",
    glow: "rgba(124,58,237,0.35)",
  },
];