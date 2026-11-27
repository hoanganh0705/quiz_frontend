export interface LegalCallout {
  label: string;
  body: string;
}

export interface LegalSection {
  id: string;
  number: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  callout?: LegalCallout;
}

export interface LegalRelatedLink {
  label: string;
  description: string;
  href: string;
}

export interface LegalDocument {
  id: "terms" | "privacy";
  badge: string;
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summaryPoints: readonly string[];
  sections: readonly LegalSection[];
  relatedLinks: readonly LegalRelatedLink[];
}
