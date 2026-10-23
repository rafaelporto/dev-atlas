import { describe, it, expect } from "vitest";
import { InlineLinkRewriter } from "../src/relocation/inline-link-rewriter.js";
import { InvalidPathRelocationError, PathRelocationMap } from "../src/relocation/path-relocation-map.js";
import { CompositeReferenceRewriter, type RewriteContext } from "../src/relocation/reference-rewriter.js";
import { RelatedFrontMatterRewriter } from "../src/relocation/related-front-matter-rewriter.js";
import {
  DirtyWorkingTreeError,
  RelocationExecutor,
  type DocumentWriter,
  type VersionControl,
} from "../src/relocation/relocation-executor.js";
import { RelocationPlanner, type MarkdownDocument } from "../src/relocation/relocation-planner.js";
import { RepoPathMentionRewriter } from "../src/relocation/repo-path-mention-rewriter.js";

const javascriptEcosystemMap = PathRelocationMap.create([
  { source: "languages/react", destination: "languages/javascript-typescript/frameworks/react" },
  { source: "languages/react-native", destination: "languages/javascript-typescript/frameworks/react-native" },
  { source: "languages/nodejs", destination: "languages/javascript-typescript/runtimes/nodejs" },
]);

function contextFor(originalDocumentPath: string): RewriteContext {
  return {
    originalDocumentPath,
    relocatedDocumentPath: javascriptEcosystemMap.relocate(originalDocumentPath),
    relocationMap: javascriptEcosystemMap,
  };
}

describe("PathRelocationMap", () => {
  it("relocates nested paths by segment, never by raw prefix", () => {
    expect(javascriptEcosystemMap.relocate("languages/react/hooks")).toBe(
      "languages/javascript-typescript/frameworks/react/hooks",
    );
    expect(javascriptEcosystemMap.relocate("languages/react-native/overview")).toBe(
      "languages/javascript-typescript/frameworks/react-native/overview",
    );
    expect(javascriptEcosystemMap.relocate("languages/go/overview")).toBe("languages/go/overview");
  });

  it("rejects overlapping sources", () => {
    expect(() =>
      PathRelocationMap.create([
        { source: "languages", destination: "langs" },
        { source: "languages/go", destination: "go" },
      ]),
    ).toThrow(InvalidPathRelocationError);
  });

  it("rejects a destination nested inside a source", () => {
    expect(() => PathRelocationMap.create([{ source: "languages/go", destination: "languages/go/v2" }])).toThrow(
      InvalidPathRelocationError,
    );
  });

  it("rejects paths outside the repository", () => {
    expect(() => PathRelocationMap.create([{ source: "../other", destination: "languages/other" }])).toThrow(
      InvalidPathRelocationError,
    );
  });

  it("requires every source to exist and every destination to be free", () => {
    const existingPaths = new Set(["languages/react", "languages/react-native", "languages/nodejs"]);
    expect(() => javascriptEcosystemMap.assertApplicable((path) => existingPaths.has(path))).not.toThrow();
    expect(() => javascriptEcosystemMap.assertApplicable(() => false)).toThrow(/source does not exist/);
    expect(() => javascriptEcosystemMap.assertApplicable(() => true)).toThrow(/destination already exists/);
  });
});

describe("InlineLinkRewriter", () => {
  const rewriter = new InlineLinkRewriter();

  it("adds parent segments to outbound links of a document moved deeper", () => {
    const outcome = rewriter.rewrite(
      "See [DI](../../software-engineering/concepts/solid/dependency-inversion.md).",
      contextFor("languages/nodejs/architecture.md"),
    );
    expect(outcome.content).toBe(
      "See [DI](../../../../software-engineering/concepts/solid/dependency-inversion.md).",
    );
    expect(outcome.replacementCount).toBe(1);
  });

  it("follows the target when an unmoved document links into a moved directory", () => {
    const outcome = rewriter.rewrite(
      "See [hooks](../../languages/react/hooks.md).",
      contextFor("software-engineering/architecture/frontend.md"),
    );
    expect(outcome.content).toBe("See [hooks](../../languages/javascript-typescript/frameworks/react/hooks.md).");
  });

  it("recomputes links between siblings that move to different groups", () => {
    const outcome = rewriter.rewrite("[React](../react/overview.md)", contextFor("languages/nodejs/overview.md"));
    expect(outcome.content).toBe("[React](../../frameworks/react/overview.md)");
  });

  it("leaves links between documents that move together untouched", () => {
    const outcome = rewriter.rewrite("[Prisma](orms/prisma.md)", contextFor("languages/nodejs/overview.md"));
    expect(outcome.content).toBe("[Prisma](orms/prisma.md)");
    expect(outcome.replacementCount).toBe(0);
  });

  it("preserves anchors and link titles", () => {
    const outcome = rewriter.rewrite(
      '[Effects](../../languages/react/effects.md#cleanup "Cleanup")',
      contextFor("software-engineering/architecture/frontend.md"),
    );
    expect(outcome.content).toBe(
      '[Effects](../../languages/javascript-typescript/frameworks/react/effects.md#cleanup "Cleanup")',
    );
  });

  it("preserves a trailing slash on directory links", () => {
    const outcome = rewriter.rewrite("[React](react/)", contextFor("languages/README.md"));
    expect(outcome.content).toBe("[React](javascript-typescript/frameworks/react/)");
  });

  it("ignores external, anchor-only, and absolute links", () => {
    const content = "[MDN](https://developer.mozilla.org) [Top](#top) [Root](/languages/react/hooks.md)";
    const outcome = rewriter.rewrite(content, contextFor("languages/react/hooks.md"));
    expect(outcome.content).toBe(content);
  });

  it("never touches the front matter", () => {
    const content = "---\nrelated:\n  - languages/react/hooks\n---\n# Title\n";
    expect(rewriter.rewrite(content, contextFor("languages/go/overview.md")).content).toBe(content);
  });
});

describe("RelatedFrontMatterRewriter", () => {
  const rewriter = new RelatedFrontMatterRewriter();

  it("relocates block-list entries and keeps unrelated YAML byte-for-byte", () => {
    const content = [
      "---",
      "type: concept",
      "tags:",
      "  - react",
      "related:",
      "  - languages/react/hooks",
      "  - \"languages/nodejs/streams\"",
      "  - languages/go/concurrency",
      "language: \"react\"",
      "---",
      "# Title",
      "Mentions languages/react/hooks in the body.",
    ].join("\n");

    const outcome = rewriter.rewrite(content, contextFor("languages/react/overview.md"));

    expect(outcome.content).toContain("  - languages/javascript-typescript/frameworks/react/hooks\n");
    expect(outcome.content).toContain('  - "languages/javascript-typescript/runtimes/nodejs/streams"\n');
    expect(outcome.content).toContain("  - languages/go/concurrency\n");
    expect(outcome.content).toContain("tags:\n  - react\n");
    expect(outcome.content).toContain("Mentions languages/react/hooks in the body.");
    expect(outcome.replacementCount).toBe(2);
  });

  it("relocates flow-list entries", () => {
    const content = "---\nrelated: [languages/react/hooks, languages/go/context]\n---\n# Title\n";
    const outcome = rewriter.rewrite(content, contextFor("languages/go/overview.md"));
    expect(outcome.content).toBe(
      "---\nrelated: [languages/javascript-typescript/frameworks/react/hooks, languages/go/context]\n---\n# Title\n",
    );
  });
});

describe("RepoPathMentionRewriter", () => {
  const rewriter = new RepoPathMentionRewriter();

  it("relocates repo-relative mentions in prose and code spans", () => {
    const outcome = rewriter.rewrite(
      "Articles under `languages/react/` use TSX; see languages/nodejs/streams.md too.",
      contextFor("CLAUDE.md"),
    );
    expect(outcome.content).toBe(
      "Articles under `languages/javascript-typescript/frameworks/react/` use TSX; " +
        "see languages/javascript-typescript/runtimes/nodejs/streams.md too.",
    );
    expect(outcome.replacementCount).toBe(2);
  });

  it("matches whole segments only", () => {
    const outcome = rewriter.rewrite("`languages/react-native/` and `languages/reactive/`", contextFor("CLAUDE.md"));
    expect(outcome.content).toBe("`languages/javascript-typescript/frameworks/react-native/` and `languages/reactive/`");
  });

  it("leaves link targets and relative paths to other strategies", () => {
    const content = "[hooks](../languages/react/hooks.md) and ../languages/react/hooks.md";
    expect(rewriter.rewrite(content, contextFor("docs/guide.md")).content).toBe(content);
  });
});

describe("CompositeReferenceRewriter", () => {
  it("applies every strategy once and reports counts per strategy", () => {
    const rewriter = new CompositeReferenceRewriter([
      new RelatedFrontMatterRewriter(),
      new InlineLinkRewriter(),
      new RepoPathMentionRewriter(),
    ]);
    const content = [
      "---",
      "related:",
      "  - languages/react/hooks",
      "---",
      "# Title",
      "See [hooks](../react/hooks.md) and `languages/react/hooks.md`.",
    ].join("\n");

    const outcome = rewriter.rewrite(content, contextFor("languages/nodejs/overview.md"));

    expect(outcome.content).toContain("  - languages/javascript-typescript/frameworks/react/hooks\n");
    expect(outcome.content).toContain("[hooks](../../frameworks/react/hooks.md)");
    expect(outcome.content).toContain("`languages/javascript-typescript/frameworks/react/hooks.md`");
    expect(Object.fromEntries(outcome.replacementCountByRewriter)).toEqual({
      "related-front-matter": 1,
      "inline-link": 1,
      "repo-path-mention": 1,
    });
  });
});

describe("RelocationPlanner and RelocationExecutor", () => {
  const documents: MarkdownDocument[] = [
    { repoRelativePath: "languages/README.md", content: "| [React](react/README.md) |\n" },
    { repoRelativePath: "languages/react/hooks.md", content: "[Go](../go/overview.md)\n" },
    { repoRelativePath: "languages/go/overview.md", content: "No references here.\n" },
  ];
  const planner = new RelocationPlanner(
    { listDocuments: () => documents },
    new CompositeReferenceRewriter([new InlineLinkRewriter()]),
  );

  it("plans rewrites only for documents whose references change", () => {
    const plan = planner.plan(javascriptEcosystemMap);
    expect(plan.relocatedDocumentCount).toBe(1);
    expect(plan.documentRewrites.map((rewrite) => rewrite.originalPath)).toEqual([
      "languages/README.md",
      "languages/react/hooks.md",
    ]);
    expect(plan.documentRewrites[1]!.relocatedPath).toBe("languages/javascript-typescript/frameworks/react/hooks.md");
    expect(plan.documentRewrites[1]!.rewrittenContent).toBe("[Go](../../../go/overview.md)\n");
  });

  function recordingPorts(workingTreeClean: boolean) {
    const operations: string[] = [];
    const documentWriter: DocumentWriter = { write: (path) => operations.push(`write ${path}`) };
    const versionControl: VersionControl = {
      isWorkingTreeClean: () => workingTreeClean,
      move: (source, destination) => operations.push(`move ${source} -> ${destination}`),
    };
    return { operations, executor: new RelocationExecutor(documentWriter, versionControl) };
  }

  it("writes rewrites at their original paths before moving", () => {
    const { operations, executor } = recordingPorts(true);
    executor.execute(planner.plan(javascriptEcosystemMap));
    expect(operations.slice(0, 2)).toEqual(["write languages/README.md", "write languages/react/hooks.md"]);
    expect(operations.slice(2).every((operation) => operation.startsWith("move "))).toBe(true);
    expect(operations).toHaveLength(2 + javascriptEcosystemMap.relocations.length);
  });

  it("refuses to run on a dirty working tree", () => {
    const { operations, executor } = recordingPorts(false);
    expect(() => executor.execute(planner.plan(javascriptEcosystemMap))).toThrow(DirtyWorkingTreeError);
    expect(operations).toEqual([]);
  });
});
