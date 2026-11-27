import Link from "next/link";

import {
  ArrowRight,
  Calendar,
  FileText,
  Info,
  ShieldCheck,
} from "lucide-react";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import type { LegalDocument } from "../types/legal-document.types";

export interface LegalDocumentViewProps {
  document: LegalDocument;
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  const HeaderIcon = document.id === "privacy" ? ShieldCheck : FileText;

  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} space-y-8`}
      data-testid={`legal-page-${document.id}`}
    >
      {/* Semantic Page Header */}
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            <HeaderIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {document.badge}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-muted-foreground">
            {document.version}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            Effective {document.effectiveDate}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground">
            Updated {document.lastUpdated}
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {document.title}
          </h1>
          <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            {document.subtitle}
          </p>
        </div>
      </header>

      {/* Key Highlights Card */}
      <section
        aria-labelledby={`${document.id}-summary-heading`}
        className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-3"
      >
        <h2
          id={`${document.id}-summary-heading`}
          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          At a glance
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {document.summaryPoints.map((point, index) => (
            <li
              key={index}
              className="rounded-lg border border-border/70 bg-muted/30 p-3.5 text-sm leading-relaxed text-foreground"
            >
              <span className="mb-1 block font-mono text-xs font-semibold tabular-nums text-brand">
                0{index + 1}
              </span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Main Content + Sticky Table of Contents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <nav
            aria-label="Table of contents"
            className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"
            data-testid={`legal-toc-${document.id}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <ol className="space-y-1">
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono text-xs tabular-nums text-muted-foreground/70 group-hover:text-brand">
                      {section.number}
                    </span>
                    <span className="leading-snug">{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="space-y-6">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-24 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-baseline gap-3 border-b border-border/60 pb-3">
                <span className="font-mono text-xs font-semibold tabular-nums text-brand">
                  {section.number}
                </span>
                <h2
                  id={`${section.id}-heading`}
                  className="text-lg sm:text-xl font-semibold tracking-tight text-foreground"
                >
                  {section.title}
                </h2>
              </div>

              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {section.bullets && section.bullets.length > 0 ? (
                <ul className="space-y-2 pl-5 list-disc text-sm leading-relaxed text-muted-foreground marker:text-brand">
                  {section.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.callout ? (
                <div className="flex items-start gap-3 rounded-lg border border-brand/25 bg-brand/5 p-4 text-sm">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {section.callout.label}
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {section.callout.body}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ))}

          {/* Cross-navigation Footer */}
          <footer
            aria-label="Related legal and support pages"
            className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2"
          >
            {document.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-brand/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-foreground group-hover:text-brand transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {link.description}
                  </p>
                </div>
                <ArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </footer>
        </article>
      </div>
    </div>
  );
}
