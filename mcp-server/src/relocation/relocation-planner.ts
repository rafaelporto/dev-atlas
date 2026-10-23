import type { PathRelocation, PathRelocationMap } from "./path-relocation-map.js";
import type { CompositeReferenceRewriter } from "./reference-rewriter.js";

export interface MarkdownDocument {
  readonly repoRelativePath: string;
  readonly content: string;
}

export interface MarkdownDocumentSource {
  listDocuments(): readonly MarkdownDocument[];
}

export interface DocumentRewrite {
  readonly originalPath: string;
  readonly relocatedPath: string;
  readonly rewrittenContent: string;
  readonly replacementCountByRewriter: ReadonlyMap<string, number>;
}

export interface RelocationPlan {
  readonly relocations: readonly PathRelocation[];
  readonly relocatedDocumentCount: number;
  readonly documentRewrites: readonly DocumentRewrite[];
}

// Plans every rewrite from the pre-move state, so link resolution always
// starts from where each document and target currently live.
export class RelocationPlanner {
  constructor(
    private readonly documentSource: MarkdownDocumentSource,
    private readonly referenceRewriter: CompositeReferenceRewriter,
  ) {}

  plan(relocationMap: PathRelocationMap): RelocationPlan {
    const documentRewrites: DocumentRewrite[] = [];
    let relocatedDocumentCount = 0;

    for (const document of this.documentSource.listDocuments()) {
      const relocatedPath = relocationMap.relocate(document.repoRelativePath);
      if (relocatedPath !== document.repoRelativePath) relocatedDocumentCount += 1;

      const outcome = this.referenceRewriter.rewrite(document.content, {
        originalDocumentPath: document.repoRelativePath,
        relocatedDocumentPath: relocatedPath,
        relocationMap,
      });
      if (outcome.replacementCount === 0) continue;

      documentRewrites.push({
        originalPath: document.repoRelativePath,
        relocatedPath,
        rewrittenContent: outcome.content,
        replacementCountByRewriter: outcome.replacementCountByRewriter,
      });
    }

    return { relocations: relocationMap.relocations, relocatedDocumentCount, documentRewrites };
  }
}
