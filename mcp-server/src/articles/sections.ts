// Body-region extraction helpers.
//
// Articles follow a fixed template (see `_templates/concept.md` and
// `_templates/how-to.md`) where each section is delimited by an H2 heading.
// Tools that surface a specific section (`get_article` with `include:
// "when-not"`, the antipattern fallback ranker) all need the same primitive:
// "give me the text that lives under H2 `X`". This module is the canonical
// place for that primitive.

// Returns the body region under a given H2 heading, from the end of the
// heading line up to the next H2 heading or end-of-body. Returns `null`
// when no heading matches.
//
// Matching rules:
// - Case-insensitive.
// - Whitespace between tokens in `headingText` matches one or more
//   whitespace characters in the body, so "When NOT to use" matches even if
//   the article writes "When  NOT  to  use".
// - Trailing prose on the heading line is tolerated and discarded
//   (e.g. `## When NOT to use — exceptions`).
export function extractH2Section(
  body: string,
  headingText: string,
): string | null {
  const escaped = headingText
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const headingPattern = new RegExp(`^##\\s+${escaped}[^\\n]*$`, "im");
  const match = headingPattern.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const tail = body.slice(start);
  const nextHeading = /^##\s+/m.exec(tail);
  const end = nextHeading ? nextHeading.index : tail.length;
  return tail.slice(0, end).trim();
}
