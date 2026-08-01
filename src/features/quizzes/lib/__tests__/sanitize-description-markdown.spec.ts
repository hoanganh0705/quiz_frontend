/**
 * `sanitize-description-markdown.spec.ts` — locks the C4
 * sanitizer contract. Node-environment tests only; the file
 * lives under `src/features/quizzes/lib/__tests__/` so it
 * runs under vitest's `node` project.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C4.
 */

import { describe, expect, it } from 'vitest';

import {
  renderDescription,
  sanitizeMarkdown,
  sanitizeUrl,
  splitInline,
} from '@/features/quizzes/lib/sanitize-description-markdown';

describe('sanitizeUrl', () => {
  it('keeps http and https URLs intact', () => {
    expect(sanitizeUrl('https://example.test/path?q=1')).toBe(
      'https://example.test/path?q=1',
    );
    expect(sanitizeUrl('http://example.test')).toBe('http://example.test');
  });

  it('keeps mailto URLs intact', () => {
    expect(sanitizeUrl('mailto:support@quizhub.com')).toBe(
      'mailto:support@quizhub.com',
    );
  });

  it('keeps relative URLs intact', () => {
    expect(sanitizeUrl('/quizzes/abc')).toBe('/quizzes/abc');
    expect(sanitizeUrl('#anchor')).toBe('#anchor');
  });

  it('rejects javascript: URLs (case and whitespace variants)', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull();
    expect(sanitizeUrl('java\tscript:alert(1)')).toBeNull();
    expect(sanitizeUrl('java\nscript:alert(1)')).toBeNull();
  });

  it('rejects vbscript:, data:, and file: URLs', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects empty and whitespace-only URLs', () => {
    expect(sanitizeUrl('')).toBeNull();
    expect(sanitizeUrl('   ')).toBeNull();
  });
});

describe('sanitizeMarkdown', () => {
  it('strips <script> tags outright (with their contents)', () => {
    const input = 'Hello <script>alert(1)</script> world';
    // The script tag and its contents are removed; the
    // surrounding text is preserved.
    expect(sanitizeMarkdown(input)).toBe('Hello  world');
  });

  it('strips <script> tags with attributes and content', () => {
    const input =
      '<script type="text/javascript">evil()</script>Safe text';
    const out = sanitizeMarkdown(input);
    expect(out).not.toContain('<script');
    expect(out).not.toContain('evil');
    expect(out).toContain('Safe text');
  });

  it('strips <iframe>, <object>, <embed>, <style>, <svg>, and <math>', () => {
    for (const tag of ['iframe', 'object', 'embed', 'style', 'svg', 'math']) {
      const input = `before <${tag}>payload</${tag}> after`;
      const out = sanitizeMarkdown(input);
      expect(out).not.toContain(`<${tag}`);
      expect(out).not.toContain(`</${tag}`);
      // The payload inside the forbidden tag is also stripped
      // because the tag and its body are removed together.
      expect(out).not.toContain('payload');
      expect(out).toContain('before');
      expect(out).toContain('after');
    }
  });

  it('drops inline event-handler attributes on surviving tags', () => {
    const input = '<a href="https://example.test" onclick="evil()">click</a>';
    const out = sanitizeMarkdown(input);
    expect(out).not.toContain('onclick');
    // The <a> tag itself is dropped at the raw-HTML stage
    // because markdown links are the supported way to render
    // anchors; the label survives as plain text.
    expect(out).toContain('click');
  });

  it('rejects markdown image syntax entirely', () => {
    const input = '![alt text](javascript:alert(1))';
    expect(sanitizeMarkdown(input)).not.toContain('javascript:');
    expect(sanitizeMarkdown(input)).not.toContain('![alt');
  });

  it('drops the URL of a markdown link whose scheme is forbidden', () => {
    const input = '[label](javascript:alert(1))';
    const out = sanitizeMarkdown(input);
    expect(out).not.toContain('javascript:');
    expect(out).toContain('label');
  });

  it('keeps the URL of a markdown link with an allowed scheme', () => {
    const input = '[docs](https://example.test/docs)';
    expect(sanitizeMarkdown(input)).toContain('https://example.test/docs');
  });
});

describe('renderDescription — safe markdown', () => {
  it('renders a heading, paragraph, and list', () => {
    const md = [
      '## What this quiz is about',
      '',
      'A short paragraph that introduces the topic.',
      '',
      '- First bullet',
      '- Second bullet',
      '',
      '1. Step one',
      '2. Step two',
    ].join('\n');

    const nodes = renderDescription(md);
    expect(nodes).toHaveLength(4);

    const [heading, paragraph, ul, ol] = nodes;
    expect(heading?.type).toBe('heading');
    if (heading?.type === 'heading') {
      expect(heading.level).toBe(2);
      expect(heading.text).toBe('What this quiz is about');
    }
    expect(paragraph?.type).toBe('paragraph');
    if (paragraph?.type === 'paragraph') {
      expect(paragraph.text).toContain('short paragraph');
    }
    expect(ul?.type).toBe('list');
    if (ul?.type === 'list') {
      expect(ul.ordered).toBe(false);
      expect(ul.items).toEqual(['First bullet', 'Second bullet']);
    }
    expect(ol?.type).toBe('list');
    if (ol?.type === 'list') {
      expect(ol.ordered).toBe(true);
      expect(ol.items).toEqual(['Step one', 'Step two']);
    }
  });

  it('renders ### as a level-3 heading', () => {
    const nodes = renderDescription('### Subsection\n\nBody');
    expect(nodes[0]?.type).toBe('heading');
    if (nodes[0]?.type === 'heading') {
      expect(nodes[0].level).toBe(3);
      expect(nodes[0].text).toBe('Subsection');
    }
  });

  it('returns an empty list for null / empty input', () => {
    expect(renderDescription('')).toEqual([]);
  });

  it('filters paragraphs that sanitize to empty content', () => {
    const nodes = renderDescription('<script>evil()</script>\n\n## Heading');
    // The script becomes an empty line, which the parser drops.
    expect(nodes.find((n) => n.type === 'paragraph')).toBeUndefined();
    expect(nodes.some((n) => n.type === 'heading')).toBe(true);
  });
});

describe('renderDescription — XSS fixtures', () => {
  it('does not let a <script> tag through to any node', () => {
    const input = '## Topic\n\n<script>alert(1)</script>\n\nBody';
    const nodes = renderDescription(input);
    const serialized = JSON.stringify(nodes);
    expect(serialized).not.toContain('<script');
    expect(serialized).not.toContain('alert(1)');
  });

  it('does not let an inline event handler through', () => {
    const input = '## Topic\n\n<img src=x onerror="alert(1)" />';
    const nodes = renderDescription(input);
    const serialized = JSON.stringify(nodes);
    expect(serialized).not.toContain('onerror');
    expect(serialized).not.toContain('alert(1)');
  });

  it('does not let a javascript: link through', () => {
    const input = '[click](javascript:alert(1))';
    const segments = splitInline(input);
    // The link survives with no href; the visible text is kept.
    const link = segments.find((s) => s.kind === 'link');
    expect(link).toBeUndefined();
    const text = segments.find((s) => s.kind === 'text');
    expect(text?.text).toBe('click');
  });

  it('does not let a data: image URL through', () => {
    const input = '![alt](data:text/html,<script>alert(1)</script>)';
    const out = sanitizeMarkdown(input);
    expect(out).not.toContain('data:');
    expect(out).not.toContain('<script');
  });
});
