export interface FrontMatterSplit {
  readonly frontMatter: string;
  readonly body: string;
}

const FRONT_MATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function splitFrontMatter(content: string): FrontMatterSplit {
  const match = FRONT_MATTER_PATTERN.exec(content);
  if (!match) return { frontMatter: "", body: content };
  return { frontMatter: match[0], body: content.slice(match[0].length) };
}

// Captures `](target "optional title")`: group 1 is the target, group 2 the rest.
export const INLINE_LINK_TARGET_PATTERN = /\]\(([^)\s]+)((?:\s+"[^"]*")?\))/g;

export function replaceOutsideLinkTargets(body: string, replaceProse: (prose: string) => string): string {
  let rewritten = "";
  let proseStart = 0;
  for (const match of body.matchAll(INLINE_LINK_TARGET_PATTERN)) {
    rewritten += replaceProse(body.slice(proseStart, match.index)) + match[0];
    proseStart = match.index + match[0].length;
  }
  return rewritten + replaceProse(body.slice(proseStart));
}
