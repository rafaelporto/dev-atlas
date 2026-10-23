import type { RelocationPlan } from "./relocation-planner.js";

function sumReplacementsByRewriter(plan: RelocationPlan): Map<string, number> {
  const totals = new Map<string, number>();
  for (const documentRewrite of plan.documentRewrites) {
    for (const [rewriterName, count] of documentRewrite.replacementCountByRewriter) {
      totals.set(rewriterName, (totals.get(rewriterName) ?? 0) + count);
    }
  }
  return totals;
}

function describeReplacementCounts(replacementCountByRewriter: ReadonlyMap<string, number>): string {
  return [...replacementCountByRewriter].map(([rewriterName, count]) => `${rewriterName}=${count}`).join(", ");
}

export function formatRelocationReport(plan: RelocationPlan): string {
  const lines: string[] = ["Relocations:"];
  for (const relocation of plan.relocations) {
    lines.push(`  ${relocation.source} -> ${relocation.destination}`);
  }

  lines.push("", `Documents relocated: ${plan.relocatedDocumentCount}`);
  lines.push(`Documents rewritten: ${plan.documentRewrites.length}`);
  lines.push(`Replacements: ${describeReplacementCounts(sumReplacementsByRewriter(plan)) || "none"}`);

  lines.push("", "Rewrites per document:");
  for (const documentRewrite of plan.documentRewrites) {
    const destinationNote =
      documentRewrite.relocatedPath === documentRewrite.originalPath ? "" : ` -> ${documentRewrite.relocatedPath}`;
    lines.push(
      `  ${documentRewrite.originalPath}${destinationNote} (${describeReplacementCounts(documentRewrite.replacementCountByRewriter)})`,
    );
  }

  return lines.join("\n");
}
