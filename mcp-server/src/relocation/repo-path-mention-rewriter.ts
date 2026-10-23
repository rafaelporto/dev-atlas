import { replaceOutsideLinkTargets, splitFrontMatter } from "./markdown-regions.js";
import type { ReferenceRewriter, RewriteContext, RewriteOutcome } from "./reference-rewriter.js";

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A mention is repo-relative only when nothing path-like precedes it
// (`../languages/x` is a relative link, `foo/languages/x` another tree), and it
// ends at a segment boundary (`languages/react` never matches `languages/react-native`).
function repoPathMentionPattern(sources: readonly string[]): RegExp {
  const alternatives = sources.map(escapeForRegExp).join("|");
  return new RegExp(`(?<![\\w./-])(?:${alternatives})(?![\\w-])`, "g");
}

// Rewrites repo-relative paths written in prose, tables, and code spans.
// Link targets are left to InlineLinkRewriter and front matter to
// RelatedFrontMatterRewriter.
export class RepoPathMentionRewriter implements ReferenceRewriter {
  readonly name = "repo-path-mention";

  rewrite(content: string, context: RewriteContext): RewriteOutcome {
    const { frontMatter, body } = splitFrontMatter(content);
    const mentionPattern = repoPathMentionPattern(context.relocationMap.sources);
    let replacementCount = 0;

    const rewrittenBody = replaceOutsideLinkTargets(body, (prose) =>
      prose.replace(mentionPattern, (mentionedSource) => {
        replacementCount += 1;
        return context.relocationMap.relocate(mentionedSource);
      }),
    );

    return { content: frontMatter + rewrittenBody, replacementCount };
  }
}
