export interface Project {
  title: string;
  category: string;
  tech: string[];
  image: string;
  url: string;
  accent: string;
  glow: string;
  /** Scroll multiplier — adjusts how fast the viewport image scrolls (1 = default) */
  scrollMult?: number;
  /** Maximum tilt angle in degrees for the 3D perspective effect */
  tiltMax?: number;
  /** Transition entrance easing — GSAP ease string, varies per project to avoid robotic uniformity */
  enterEase?: string;
  /** How long the reading pause at the top is (seconds) */
  pauseTop?: number;
  /** Glass tint — applied to the browser chrome to give each project a unique atmosphere */
  glassTint?: string;
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
    scrollMult: 0.85,
    tiltMax: 16,
    enterEase: "back.out(1.4)",
    pauseTop: 1.8,
    glassTint: "rgba(40,18,6,0.12)",
  },

  {
    title: "Maser Global Travels",
    category: "Travel & Visa Agency",
    tech: ["React", "Firebase", "Framer Motion"],
    image: "/portfolio/travel/home.png",
    url: "maser-global-travels.vercel.app",
    accent: "#00C9FF",
    glow: "rgba(0,201,255,0.35)",
    scrollMult: 1.1,
    tiltMax: 20,
    enterEase: "power3.out",
    pauseTop: 1.2,
    glassTint: "rgba(0,40,60,0.10)",
  },

  {
    title: "Loan Management System",
    category: "Financial Platform",
    tech: ["Next.js", "TypeScript", "GSAP"],
    image: "/portfolio/loan/home.png",
    url: "yctmicrofinancebank.com",
    accent: "#4D7CFE",
    glow: "rgba(77,124,254,0.35)",
    scrollMult: 0.95,
    tiltMax: 14,
    enterEase: "power2.out",
    pauseTop: 1.5,
    glassTint: "rgba(10,20,50,0.12)",
  },

  {
    title: "YCT Microfinance",
    category: "Digital Banking Dashboard",
    tech: ["React", "Next.js", "Dashboard"],
    image: "/portfolio/yct/home.png",
    url: "pay.yctmicrofinancebank.com",
    accent: "#00C853",
    glow: "rgba(0,200,83,0.35)",
    scrollMult: 1.05,
    tiltMax: 18,
    enterEase: "power4.out",
    pauseTop: 1.0,
    glassTint: "rgba(0,30,15,0.10)",
  },

  {
    title: "Malete Hostels",
    category: "Accommodation Platform",
    tech: ["React", "Next.js"],
    image: "/portfolio/malete/home.png",
    url: "malete-hostels.vercel.app",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.35)",
    scrollMult: 0.9,
    tiltMax: 22,
    enterEase: "back.out(1.2)",
    pauseTop: 2.0,
    glassTint: "rgba(30,10,50,0.12)",
  },

  {
    title: "Zennyola Foods",
    category: "Restaurant & Catering",
    tech: ["Next.js", "React"],
    image: "/portfolio/food/home.png",
    url: "zennyola.vercel.app",
    accent: "#F43F5E",
    glow: "rgba(244,63,94,0.35)",
    scrollMult: 1.15,
    tiltMax: 17,
    enterEase: "power3.out",
    pauseTop: 1.3,
    glassTint: "rgba(50,10,15,0.10)",
  },

  {
    title: "RCCG Living Word Forney",
    category: "Church & Ministry Platform",
    tech: ["Next.js", "Tailwind CSS", "React"],
    image: "/portfolio/church/home.png",
    url: "rccglivingwordforney.org",
    accent: "#7C3AED",
    glow: "rgba(124,58,237,0.35)",
    scrollMult: 0.88,
    tiltMax: 15,
    enterEase: "power4.out",
    pauseTop: 1.6,
    glassTint: "rgba(20,8,40,0.12)",
  },
];
