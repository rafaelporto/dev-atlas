import { splitFrontMatter } from "./markdown-regions.js";
import type { ReferenceRewriter, RewriteContext, RewriteOutcome } from "./reference-rewriter.js";

const RELATED_BLOCK_LIST_PATTERN = /^related:[ \t]*\r?\n((?:[ \t]+-[^\n]*\r?\n?)+)/m;
const RELATED_FLOW_LIST_PATTERN = /^related:[ \t]*\[([^\]\n]*)\]/m;
const BLOCK_LIST_ITEM_PATTERN = /^([ \t]+-[ \t]+)(["']?)([^"'\s#]+)\2/gm;
const FLOW_LIST_ITEM_PATTERN = /(["']?)([^"',\s\]]+)\1/g;

// Edits `related:` entries as text, so the rest of the YAML keeps its
// original formatting instead of being re-serialized.
export class RelatedFrontMatterRewriter implements ReferenceRewriter {
  readonly name = "related-front-matter";

  rewrite(content: string, context: RewriteContext): RewriteOutcome {
    const { frontMatter, body } = splitFrontMatter(content);
    if (frontMatter === "") return { content, replacementCount: 0 };

    let replacementCount = 0;
    const relocateArticleId = (articleId: string): string => {
      const relocatedArticleId = context.relocationMap.relocate(articleId);
      if (relocatedArticleId !== articleId) replacementCount += 1;
      return relocatedArticleId;
    };

    const rewrittenFrontMatter = frontMatter
      .replace(RELATED_BLOCK_LIST_PATTERN, (relatedBlock) =>
        relatedBlock.replace(
          BLOCK_LIST_ITEM_PATTERN,
          (_item, bulletPrefix: string, quote: string, articleId: string) =>
            `${bulletPrefix}${quote}${relocateArticleId(articleId)}${quote}`,
        ),
      )
      .replace(RELATED_FLOW_LIST_PATTERN, (relatedFlowList) =>
        relatedFlowList.replace(/\[([^\]]*)\]/, (_brackets, items: string) =>
          `[${items.replace(FLOW_LIST_ITEM_PATTERN, (_item, quote: string, articleId: string) => `${quote}${relocateArticleId(articleId)}${quote}`)}]`,
        ),
      );

    return { content: rewrittenFrontMatter + body, replacementCount };
  }
}
