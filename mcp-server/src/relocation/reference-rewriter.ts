import type { PathRelocationMap } from "./path-relocation-map.js";

export interface RewriteContext {
  readonly originalDocumentPath: string;
  readonly relocatedDocumentPath: string;
  readonly relocationMap: PathRelocationMap;
}

export interface RewriteOutcome {
  readonly content: string;
  readonly replacementCount: number;
}

export interface ReferenceRewriter {
  readonly name: string;
  rewrite(content: string, context: RewriteContext): RewriteOutcome;
}

export interface CompositeRewriteOutcome extends RewriteOutcome {
  readonly replacementCountByRewriter: ReadonlyMap<string, number>;
}

// Each rewriter owns a disjoint region of the document (front matter, link
// targets, prose), so the order of application does not change the result.
export class CompositeReferenceRewriter implements ReferenceRewriter {
  readonly name = "composite";

  constructor(private readonly rewriters: readonly ReferenceRewriter[]) {}

  rewrite(content: string, context: RewriteContext): CompositeRewriteOutcome {
    const replacementCountByRewriter = new Map<string, number>();
    let rewrittenContent = content;
    let replacementCount = 0;

    for (const rewriter of this.rewriters) {
      const outcome = rewriter.rewrite(rewrittenContent, context);
      rewrittenContent = outcome.content;
      replacementCount += outcome.replacementCount;
      if (outcome.replacementCount > 0) {
        replacementCountByRewriter.set(rewriter.name, outcome.replacementCount);
      }
    }

    return { content: rewrittenContent, replacementCount, replacementCountByRewriter };
  }
}
