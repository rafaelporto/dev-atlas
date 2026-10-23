import { posix } from "node:path";

export interface PathRelocation {
  readonly source: string;
  readonly destination: string;
}

export class InvalidPathRelocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPathRelocationError";
  }
}

function normalizeRepoRelativePath(path: string): string {
  const normalized = posix.normalize(path.trim()).replace(/\/+$/, "");
  if (normalized === "" || normalized === "." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new InvalidPathRelocationError(`not a repo-relative path: "${path}"`);
  }
  return normalized;
}

function isSameOrNestedPath(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(`${ancestor}/`);
}

// Value Object: an immutable, validated set of directory/file relocations.
// Matching is segment-wise, so `languages/react` never captures
// `languages/react-native`.
export class PathRelocationMap {
  private constructor(private readonly relocationsByLongestSourceFirst: readonly PathRelocation[]) {}

  static create(relocations: readonly PathRelocation[]): PathRelocationMap {
    if (relocations.length === 0) {
      throw new InvalidPathRelocationError("at least one relocation is required");
    }
    const normalized = relocations.map((relocation) => ({
      source: normalizeRepoRelativePath(relocation.source),
      destination: normalizeRepoRelativePath(relocation.destination),
    }));

    for (const relocation of normalized) {
      if (relocation.source === relocation.destination) {
        throw new InvalidPathRelocationError(`source equals destination: "${relocation.source}"`);
      }
      for (const other of normalized) {
        if (other !== relocation && isSameOrNestedPath(other.source, relocation.source)) {
          throw new InvalidPathRelocationError(
            `overlapping sources: "${other.source}" is inside "${relocation.source}"`,
          );
        }
        if (isSameOrNestedPath(other.destination, relocation.source)) {
          throw new InvalidPathRelocationError(
            `destination "${other.destination}" is inside source "${relocation.source}"`,
          );
        }
      }
    }

    const longestSourceFirst = [...normalized].sort((a, b) => b.source.length - a.source.length);
    return new PathRelocationMap(longestSourceFirst);
  }

  get relocations(): readonly PathRelocation[] {
    return this.relocationsByLongestSourceFirst;
  }

  get sources(): readonly string[] {
    return this.relocationsByLongestSourceFirst.map((relocation) => relocation.source);
  }

  relocate(repoRelativePath: string): string {
    for (const { source, destination } of this.relocationsByLongestSourceFirst) {
      if (isSameOrNestedPath(repoRelativePath, source)) {
        return destination + repoRelativePath.slice(source.length);
      }
    }
    return repoRelativePath;
  }

  assertApplicable(pathExists: (repoRelativePath: string) => boolean): void {
    for (const { source, destination } of this.relocationsByLongestSourceFirst) {
      if (!pathExists(source)) {
        throw new InvalidPathRelocationError(`source does not exist: "${source}"`);
      }
      if (pathExists(destination)) {
        throw new InvalidPathRelocationError(`destination already exists: "${destination}"`);
      }
    }
  }
}
