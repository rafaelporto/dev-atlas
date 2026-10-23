import type { RelocationPlan } from "./relocation-planner.js";

export interface DocumentWriter {
  write(repoRelativePath: string, content: string): void;
}

export interface VersionControl {
  isWorkingTreeClean(): boolean;
  move(sourcePath: string, destinationPath: string): void;
}

export class DirtyWorkingTreeError extends Error {
  constructor() {
    super("working tree has uncommitted changes; commit or discard them before applying a relocation");
    this.name = "DirtyWorkingTreeError";
  }
}

// Rewrites land on the original paths first; the moves then carry the
// rewritten files along, so the version control system records renames.
export class RelocationExecutor {
  constructor(
    private readonly documentWriter: DocumentWriter,
    private readonly versionControl: VersionControl,
  ) {}

  execute(plan: RelocationPlan): void {
    if (!this.versionControl.isWorkingTreeClean()) throw new DirtyWorkingTreeError();

    for (const documentRewrite of plan.documentRewrites) {
      this.documentWriter.write(documentRewrite.originalPath, documentRewrite.rewrittenContent);
    }
    for (const relocation of plan.relocations) {
      this.versionControl.move(relocation.source, relocation.destination);
    }
  }
}
