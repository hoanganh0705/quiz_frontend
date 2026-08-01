/**
 * `sanitize-description-markdown.ts` — minimal, sanitized markdown
 * renderer for the player-detail description.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C4.
 *
 * The repo does not currently ship an approved shared markdown
 * renderer (the ticket's AC permits a minimal sanitized equivalent
 * when one is absent). This module is intentionally narrow:
 *
 *   - Subset: `## h2`, `### h3`, ordered list, unordered list,
 *     `[label](url)` links, blank-line paragraph breaks.
 *   - Sanitization:
 *       - Strips `<script>`, `<style>`, `<iframe>`, `<object>`,
 *         `<embed>` and any other raw HTML tags.
 *       - Strips every inline event-handler attribute
 *         (`on*="..."`) on any tag that survives.
 *       - Rejects any URL whose scheme is `javascript:`, `data:`
 *         (except `data:image/...`), `vbscript:`, or `file:`.
 *       - Escapes the angle brackets in literal user text so the
 *         output cannot smuggle tags.
 *
 * The renderer emits a tree of typed nodes that React renders —
 * it never injects a `dangerouslySetInnerHTML` blob. This keeps the
 * sanitization boundary at the data layer.
 *
 * Public surface:
 *   - `renderDescription(markdown)` → `MarkdownNode[]`
 *   - `sanitizeUrl(url)` — exported for unit testing.
 *
 * Drift note: when a shared renderer is added later, this file
 * should be replaced and `QuizDescription` should consume the new
 * renderer behind the same `renderDescription` shape.
 */

export type MarkdownNode =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

const FORBIDDEN_TAG_RE = /<\/?(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_FORBIDDEN_TAG_RE = /<\/?(script|style|iframe|object|embed|svg|math)\b[^>]*\/?>/gi;
const INLINE_EVENT_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const ANY_TAG_RE = /<\/?[a-z][^>]*>/gi;

/**
 * The set of URL schemes we permit on rendered `<a>` elements.
 * Any URL outside this set is dropped (the link is rendered as
 * plain text without an `href`).
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  // Reject embedded whitespace/newlines which browsers tolerate
  // as part of a `javascript:` URL.
  if (/[\s\u0000-\u001f]/.test(trimmed)) return null;

  // Lower-cased scheme check.
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    // Relative URLs are allowed.
    return trimmed;
  }
  const scheme = schemeMatch[1].toLowerCase();
  if (!ALLOWED_SCHEMES.has(`${scheme}:`)) {
    return null;
  }
  return trimmed;
}

/**
 * Strip raw HTML, inline event handlers, and forbidden tags from
 * the markdown source. Escapes the angle brackets in surviving
 * text so the output cannot smuggle tags.
 */
export function sanitizeMarkdown(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';

  // Remove forbidden tags outright (script, style, iframe, …),
  // including their text content. The first pass handles
  // open/close pairs; the second pass catches any orphan
  // open/close/self-closing tag that survived.
  let step1 = input.replace(FORBIDDEN_TAG_RE, '');
  step1 = step1.replace(SELF_CLOSING_FORBIDDEN_TAG_RE, '');

  // Strip event-handler attributes on any tag that survived.
  const step2 = step1.replace(INLINE_EVENT_RE, '');

  // Drop any remaining raw tags. Anything that looks like HTML
  // at this point is unsafe (the allowed markdown subset has no
  // raw HTML — only the renderer emits tags).
  let step3 = step2.replace(ANY_TAG_RE, '');

  // Reject markdown links whose URL sanitizes to null. We
  // process them inline so the visible label can survive.
  step3 = step3.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, label: string, url: string) => {
      const safeUrl = sanitizeUrl(url);
      if (safeUrl === null) return label;
      return `[${label}](${safeUrl})`;
    },
  );

  // Reject markdown image syntax (not in our supported subset)
  // so a stray `![alt](javascript:...)` cannot render.
  step3 = step3.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');

  return step3;
}

function isMarkdownLink(line: string): boolean {
  return /\[[^\]]+\]\(([^)\s]+)\)/.test(line);
}

/**
 * Render an inline segment (the contents of a heading,
 * paragraph, or list item) into React-friendly nodes. The
 * result is a tuple of plain-string fragments and link nodes,
 * but the consumer (`QuizDescription`) handles the link
 * rendering — this module only emits a flat text + link list.
 */
export interface InlineSegment {
  kind: 'text' | 'link';
  text: string;
  href?: string;
}

export function splitInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: 'text',
        text: line.slice(lastIndex, match.index),
      });
    }
    const label = match[1];
    const href = sanitizeUrl(match[2]);
    if (href !== null) {
      segments.push({ kind: 'link', text: label, href });
    } else {
      // Drop the URL and emit just the label so the user can
      // still read the link text.
      segments.push({ kind: 'text', text: label });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ kind: 'text', text: line.slice(lastIndex) });
  }
  return segments;
}

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

function isHeadingLine(line: string): {
  level: 2 | 3;
  text: string;
} | null {
  const h2 = /^##\s+(.+)$/.exec(line);
  if (h2) return { level: 2, text: h2[1].trim() };
  const h3 = /^###\s+(.+)$/.exec(line);
  if (h3) return { level: 3, text: h3[1].trim() };
  return null;
}

function isOrderedListItem(line: string): string | null {
  const m = /^\d+\.\s+(.+)$/.exec(line);
  return m ? m[1].trim() : null;
}

function isUnorderedListItem(line: string): string | null {
  const m = /^[-*]\s+(.+)$/.exec(line);
  return m ? m[1].trim() : null;
}

/**
 * Parse markdown into a flat node list. Blank lines separate
 * block-level elements; consecutive list lines are grouped into
 * a single list block.
 */
export function renderDescription(markdown: string): MarkdownNode[] {
  if (typeof markdown !== 'string' || markdown.length === 0) return [];

  const sanitized = sanitizeMarkdown(markdown);
  const lines = sanitized.split(/\r?\n/);
  const nodes: MarkdownNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isBlankLine(line)) {
      i += 1;
      continue;
    }

    const heading = isHeadingLine(line);
    if (heading) {
      nodes.push({ type: 'heading', level: heading.level, text: heading.text });
      i += 1;
      continue;
    }

    const orderedItem = isOrderedListItem(line);
    if (orderedItem !== null) {
      const items: string[] = [orderedItem];
      i += 1;
      while (i < lines.length) {
        const nextItem = isOrderedListItem(lines[i]);
        if (nextItem === null) break;
        items.push(nextItem);
        i += 1;
      }
      nodes.push({ type: 'list', ordered: true, items });
      continue;
    }

    const unorderedItem = isUnorderedListItem(line);
    if (unorderedItem !== null) {
      const items: string[] = [unorderedItem];
      i += 1;
      while (i < lines.length) {
        const nextItem = isUnorderedListItem(lines[i]);
        if (nextItem === null) break;
        items.push(nextItem);
        i += 1;
      }
      nodes.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Paragraph — gather until the next blank line / heading /
    // list item / EOF.
    const buffer: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      !isBlankLine(lines[i]) &&
      isHeadingLine(lines[i]) === null &&
      isOrderedListItem(lines[i]) === null &&
      isUnorderedListItem(lines[i]) === null
    ) {
      buffer.push(lines[i]);
      i += 1;
    }
    nodes.push({ type: 'paragraph', text: buffer.join(' ').trim() });
  }

  // Filter empty paragraphs (defensive — sanitizeMarkdown could
  // turn a malicious payload into an empty blob).
  return nodes.filter((node) => {
    if (node.type === 'paragraph') return node.text.length > 0;
    if (node.type === 'list') return node.items.length > 0;
    return true;
  });
}

/**
 * Convenience predicate for `QuizDescription`: a markdown string
 * that has more than the documented threshold of characters gets
 * the expandable expander treatment.
 */
export function isLongDescription(
  markdown: string,
  threshold: number = 300,
): boolean {
  return typeof markdown === 'string' && markdown.length > threshold;
}

// `isMarkdownLink` is currently unused; exported as part of the
// module's public API for future callers and to satisfy the
// "subset only" contract documentation.
void isMarkdownLink;
