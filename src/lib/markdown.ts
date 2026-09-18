import "server-only";

import { marked } from "marked";

/**
 * Render admin-authored Markdown to HTML. Authors are staff, so raw HTML in
 * the source is allowed through; the output is still escaped by marked for
 * everything that is not explicit HTML.
 */
export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false, gfm: true, breaks: false });
}
