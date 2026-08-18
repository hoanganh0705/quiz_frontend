

export type MarkdownNode =
| { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

const FORBIDDEN_TAG_RE = /<\/?(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_FORBIDDEN_TAG_RE = /<\/?(script|style|iframe|object|embed|svg|math)\b[^>]*\/?>/gi;
const INLINE_EVENT_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const ANY_TAG_RE = /<\/?[a-z][^>]*>/gi;

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function sanitizeUrl(url: string): string | null {
const trimmed = url.trim();
if (trimmed.length === 0) return null;

if (/[\s\u0000-\u001f]/.test(trimmed)) return null;

const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
if (!schemeMatch) {

return trimmed;
  }
const scheme = schemeMatch[1].toLowerCase();
if (!ALLOWED_SCHEMES.has(`${scheme}:`)) {
return null;
  }
return trimmed;
}

export function sanitizeMarkdown(input: string): string {
if (typeof input !== 'string' || input.length === 0) return '';

let step1 = input.replace(FORBIDDEN_TAG_RE, '');
step1 = step1.replace(SELF_CLOSING_FORBIDDEN_TAG_RE, '');

const step2 = step1.replace(INLINE_EVENT_RE, '');

let step3 = step2.replace(ANY_TAG_RE, '');

step3 = step3.replace(
/\[([^\]]+)\]\(([^)\s]+)\)/g,
(match, label: string, url: string) => {
const safeUrl = sanitizeUrl(url);
if (safeUrl === null) return label;
return `[${label}](${safeUrl})`;
    },
  );

step3 = step3.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');

return step3;
}

function isMarkdownLink(line: string): boolean {
return /\[[^\]]+\]\(([^)\s]+)\)/.test(line);
}

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

return nodes.filter((node) => {
if (node.type === 'paragraph') return node.text.length > 0;
if (node.type === 'list') return node.items.length > 0;
return true;
  });
}

export function isLongDescription(
markdown: string,
threshold: number = 300,
): boolean {
return typeof markdown === 'string' && markdown.length > threshold;
}

void isMarkdownLink;
