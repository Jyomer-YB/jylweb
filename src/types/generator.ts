// src/types/generator.ts

export type SiteTone = "serieux" | "friendly" | "luxe" | "minimal";
export type SiteType =
  | "landing"
  | "portfolio"
  | "restaurant"
  | "ecommerce"
  | "blog"
  | "autre";

export interface SiteFormInput {
  siteType: SiteType;
  brandName: string;
  slogan?: string;
  goal: string;
  tone: SiteTone;
  targetAudience: string;
  sectionsWanted: string[];
  logoUrl?: string;
  imageUrls?: string[];
  colorNotes?: string;
  locale: "fr" | "en";
}

export interface SitePageSpec {
  slug: string;
  title: string;
  sections: string[];
}

export interface SiteBrief {
  elevatorPitch: string;
  keyBenefits: string[];
  mainCTA: string;
  navItems: string[];
  pages: SitePageSpec[];
  seoKeywords: string[];
  brandVoice: string;
}
