#!/usr/bin/env tsx
// Moves directories or files inside dev-atlas and rewrites every reference to
// them: relative inline links, `related:` front matter, and repo-relative path
// mentions in prose.
//
// Usage:
//   npm run move-paths -- --map <source>=<destination> [--map …]          (dry-run)
//   npm run move-paths -- --map <source>=<destination> [--map …] --apply  (rewrite + git mv)
//
// Paths are repo-relative. `--apply` refuses to run on a dirty working tree.

import { REPO_ROOT } from "../src/lib/config.js";
import {
  FileSystemDocumentWriter,
  GitTrackedMarkdownDocumentSource,
  GitVersionControl,
  repoPathExists,
} from "../src/relocation/file-system-adapters.js";
import { InlineLinkRewriter } from "../src/relocation/inline-link-rewriter.js";
import { PathRelocationMap, type PathRelocation } from "../src/relocation/path-relocation-map.js";
import { CompositeReferenceRewriter } from "../src/relocation/reference-rewriter.js";
import { RelatedFrontMatterRewriter } from "../src/relocation/related-front-matter-rewriter.js";
import { RelocationExecutor } from "../src/relocation/relocation-executor.js";
import { RelocationPlanner } from "../src/relocation/relocation-planner.js";
import { formatRelocationReport } from "../src/relocation/relocation-report.js";
import { RepoPathMentionRewriter } from "../src/relocation/repo-path-mention-rewriter.js";

interface CommandLineOptions {
  readonly relocations: PathRelocation[];
  readonly apply: boolean;
}

function parseCommandLine(args: readonly string[]): CommandLineOptions {
  const relocations: PathRelocation[] = [];
  let apply = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--apply") {
      apply = true;
    } else if (argument === "--map") {
      const mapping = args[++index];
      const [source, destination, ...extra] = mapping?.split("=") ?? [];
      if (!source || !destination || extra.length > 0) {
        throw new Error(`--map expects <source>=<destination>, got "${mapping ?? ""}"`);
      }
      relocations.push({ source, destination });
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  return { relocations, apply };
}

function main(): void {
  const options = parseCommandLine(process.argv.slice(2));
  const relocationMap = PathRelocationMap.create(options.relocations);
  relocationMap.assertApplicable(repoPathExists(REPO_ROOT));

  const referenceRewriter = new CompositeReferenceRewriter([
    new RelatedFrontMatterRewriter(),
    new InlineLinkRewriter(),
    new RepoPathMentionRewriter(),
  ]);
  const planner = new RelocationPlanner(new GitTrackedMarkdownDocumentSource(REPO_ROOT), referenceRewriter);
  const plan = planner.plan(relocationMap);

  console.log(formatRelocationReport(plan));

  if (!options.apply) {
    console.log("\nDry run: nothing was changed. Re-run with --apply to rewrite and move.");
    return;
  }

  new RelocationExecutor(new FileSystemDocumentWriter(REPO_ROOT), new GitVersionControl(REPO_ROOT)).execute(plan);
  console.log("\nApplied. Review with `git status` and `npm run validate`.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
