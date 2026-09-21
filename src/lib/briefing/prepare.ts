const HEAD_TAGS =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank">';

// The briefing HTML is untrusted (an agent builds it after reading email and
// web pages), so the framed document gets a CSP `sandbox` (opaque origin, no
// scripts, no forms) on top of the iframe's own sandbox attribute.
export const BRIEFING_CSP = [
  "sandbox allow-popups allow-popups-to-escape-sandbox",
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data:",
].join("; ");

export function isBriefingDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Adds a viewport tag (phone layout) and <base target="_blank"> (outbound
// links open in a new tab instead of navigating the framed document).
export function prepareBriefingHtml(html: string): string {
  const headOpen = /<head(\s[^>]*)?>/i;
  if (headOpen.test(html)) {
    return html.replace(headOpen, (match) => match + HEAD_TAGS);
  }

  // Inserting before a doctype would push the page into quirks mode.
  const doctype = html.match(/^\s*<!doctype[^>]*>/i);
  if (doctype) {
    return doctype[0] + HEAD_TAGS + html.slice(doctype[0].length);
  }

  return HEAD_TAGS + html;
}
