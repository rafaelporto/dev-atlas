import { posix } from "node:path";
import { INLINE_LINK_TARGET_PATTERN, splitFrontMatter } from "./markdown-regions.js";
import type { ReferenceRewriter, RewriteContext, RewriteOutcome } from "./reference-rewriter.js";

const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

function isRepoRelativeLinkTarget(target: string): boolean {
  return !URI_SCHEME_PATTERN.test(target) && !target.startsWith("#") && !target.startsWith("/");
}

function splitPathFromAnchorAndQuery(target: string): { path: string; anchorAndQuery: string } {
  const anchorOrQueryIndex = target.search(/[#?]/);
  if (anchorOrQueryIndex === -1) return { path: target, anchorAndQuery: "" };
  return { path: target.slice(0, anchorOrQueryIndex), anchorAndQuery: target.slice(anchorOrQueryIndex) };
}

function relativePathBetween(fromDirectory: string, toPath: string): string {
  const relativePath = posix.relative(posix.resolve("/", fromDirectory), posix.resolve("/", toPath));
  return relativePath === "" ? "." : relativePath;
}

// Rewrites relative `](target)` links so they keep pointing at the same file
// after either the document, the target, or both are relocated.
export class InlineLinkRewriter implements ReferenceRewriter {
  readonly name = "inline-link";

  rewrite(content: string, context: RewriteContext): RewriteOutcome {
    const { frontMatter, body } = splitFrontMatter(content);
    let replacementCount = 0;

    const rewrittenBody = body.replace(INLINE_LINK_TARGET_PATTERN, (wholeLink, target: string, titleAndClosing: string) => {
      const relocatedTarget = this.relocateLinkTarget(target, context);
      if (relocatedTarget === target) return wholeLink;
      replacementCount += 1;
      return `](${relocatedTarget}${titleAndClosing}`;
    });

    return { content: frontMatter + rewrittenBody, replacementCount };
  }

  private relocateLinkTarget(target: string, context: RewriteContext): string {
    if (!isRepoRelativeLinkTarget(target)) return target;
    const { path, anchorAndQuery } = splitPathFromAnchorAndQuery(target);
    if (path === "") return target;

    const originalDocumentDirectory = posix.dirname(context.originalDocumentPath);
    const originalTargetPath = posix.normalize(posix.join(originalDocumentDirectory, path)).replace(/\/$/, "");
    if (originalTargetPath.startsWith("../")) return target;

    const relocatedTargetPath = context.relocationMap.relocate(originalTargetPath);
    const documentMoved = context.originalDocumentPath !== context.relocatedDocumentPath;
    if (relocatedTargetPath === originalTargetPath && !documentMoved) return target;

    const trailingSlash = path.endsWith("/") ? "/" : "";
    const relocatedPath =
      relativePathBetween(posix.dirname(context.relocatedDocumentPath), relocatedTargetPath) + trailingSlash;
    if (posix.normalize(relocatedPath) === posix.normalize(path)) return target;

    return relocatedPath + anchorAndQuery;
  }
}
