import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DocumentWriter, VersionControl } from "./relocation-executor.js";
import type { MarkdownDocument, MarkdownDocumentSource } from "./relocation-planner.js";

// Only tracked files: generated or ignored Markdown (e.g. audit-report.md)
// is neither moved by `git mv` nor worth rewriting.
export class GitTrackedMarkdownDocumentSource implements MarkdownDocumentSource {
  constructor(private readonly repoRoot: string) {}

  listDocuments(): readonly MarkdownDocument[] {
    const trackedMarkdownPaths = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
      cwd: this.repoRoot,
      encoding: "utf8",
    })
      .split("\0")
      .filter((repoRelativePath) => repoRelativePath !== "");

    return trackedMarkdownPaths.map((repoRelativePath) => ({
      repoRelativePath,
      content: readFileSync(resolve(this.repoRoot, repoRelativePath), "utf8"),
    }));
  }
}

export class FileSystemDocumentWriter implements DocumentWriter {
  constructor(private readonly repoRoot: string) {}

  write(repoRelativePath: string, content: string): void {
    writeFileSync(resolve(this.repoRoot, repoRelativePath), content, "utf8");
  }
}

export class GitVersionControl implements VersionControl {
  constructor(private readonly repoRoot: string) {}

  isWorkingTreeClean(): boolean {
    return this.git("status", "--porcelain").trim() === "";
  }

  move(sourcePath: string, destinationPath: string): void {
    mkdirSync(dirname(resolve(this.repoRoot, destinationPath)), { recursive: true });
    this.git("mv", sourcePath, destinationPath);
  }

  private git(...args: string[]): string {
    return execFileSync("git", args, { cwd: this.repoRoot, encoding: "utf8" });
  }
}

export function repoPathExists(repoRoot: string): (repoRelativePath: string) => boolean {
  return (repoRelativePath) => existsSync(resolve(repoRoot, repoRelativePath));
}
