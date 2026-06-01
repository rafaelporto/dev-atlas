#!/usr/bin/env tsx
// Measures the byte size of representative MCP server responses.
//
// Boots `dist/index.js` over stdio, sends a fixed set of probes, and reports
// each response's raw byte size. Compares against a saved baseline when one
// exists (so phases of the token-reduction plan can verify their impact).
//
// Usage:
//   npm run measure              # report current sizes vs. baseline
//   npm run measure -- --save    # capture current sizes as the new baseline

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_BIN = resolve(__dirname, "..", "dist", "index.js");
const BASELINE_PATH = resolve(__dirname, "measure-baseline.json");

interface Probe {
  label: string;
  request: Record<string, unknown>;
}

// Probe set. Stable ids are picked here so a future probe addition does not
// reshuffle response routing.
const PROBES: Probe[] = [
  { label: "tools/list", request: { method: "tools/list" } },
  { label: "resources/list", request: { method: "resources/list" } },
  { label: "prompts/list", request: { method: "prompts/list" } },
  {
    label: "search_articles (query=factory, limit=10)",
    request: {
      method: "tools/call",
      params: { name: "search_articles", arguments: { query: "factory", limit: 10 } },
    },
  },
  {
    label: "search_articles (query=factory, limit=10, verbose)",
    request: {
      method: "tools/call",
      params: {
        name: "search_articles",
        arguments: { query: "factory", limit: 10, verbose: true },
      },
    },
  },
  {
    label: "search_articles (filter-only, limit=10)",
    request: {
      method: "tools/call",
      params: { name: "search_articles", arguments: { query: "", limit: 10 } },
    },
  },
  {
    label: "get_article (factory-method)",
    request: {
      method: "tools/call",
      params: {
        name: "get_article",
        arguments: {
          id: "software-engineering/design-patterns/creational/factory-method",
        },
      },
    },
  },
  {
    label: "get_article (factory-method, meta)",
    request: {
      method: "tools/call",
      params: {
        name: "get_article",
        arguments: {
          id: "software-engineering/design-patterns/creational/factory-method",
          include: "meta",
        },
      },
    },
  },
  {
    label: "get_article (factory-method, sections)",
    request: {
      method: "tools/call",
      params: {
        name: "get_article",
        arguments: {
          id: "software-engineering/design-patterns/creational/factory-method",
          include: "sections",
        },
      },
    },
  },
  {
    label: "get_article (factory-method, when-not)",
    request: {
      method: "tools/call",
      params: {
        name: "get_article",
        arguments: {
          id: "software-engineering/design-patterns/creational/factory-method",
          include: "when-not",
        },
      },
    },
  },
  {
    label: "list_sections",
    request: { method: "tools/call", params: { name: "list_sections", arguments: {} } },
  },
  {
    label: "list_tags",
    request: { method: "tools/call", params: { name: "list_tags", arguments: {} } },
  },
  {
    label: "find_antipatterns (topic=god object)",
    request: {
      method: "tools/call",
      params: { name: "find_antipatterns", arguments: { topic: "god object" } },
    },
  },
  {
    label: "find_related (factory-method)",
    request: {
      method: "tools/call",
      params: {
        name: "find_related",
        arguments: {
          id: "software-engineering/design-patterns/creational/factory-method",
        },
      },
    },
  },
];

interface ProbeResult {
  label: string;
  bytes: number;
}

interface MeasureResult {
  capturedAt: string;
  totalBytes: number;
  probes: ProbeResult[];
}

async function measure(): Promise<MeasureResult> {
  if (!existsSync(SERVER_BIN)) {
    throw new Error(
      `Server build not found at ${SERVER_BIN}. Run \`npm run build\` first.`,
    );
  }

  const proc = spawn("node", [SERVER_BIN], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  // We pull complete JSON-RPC lines off stdout. The server is well-behaved and
  // emits one JSON object per line.
  const responses = new Map<number, string>();
  let buffer = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.length === 0) continue;
      try {
        const obj = JSON.parse(line) as { id?: number };
        if (typeof obj.id === "number") {
          responses.set(obj.id, line);
        }
      } catch {
        // Non-JSON line — ignore (shouldn't happen, but defensive).
      }
    }
  });

  function send(obj: Record<string, unknown>): void {
    proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  async function waitForResponse(id: number, timeoutMs = 5000): Promise<string> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const line = responses.get(id);
      if (line !== undefined) return line;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Timeout waiting for response id ${id}`);
  }

  // MCP handshake.
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "measure-payload", version: "0" },
    },
  });
  await waitForResponse(1);
  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  const results: ProbeResult[] = [];
  let nextId = 100;
  for (const probe of PROBES) {
    const id = nextId++;
    send({ jsonrpc: "2.0", id, ...probe.request });
    const line = await waitForResponse(id);
    results.push({ label: probe.label, bytes: Buffer.byteLength(line, "utf8") });
  }

  proc.kill();

  return {
    capturedAt: new Date().toISOString(),
    totalBytes: results.reduce((sum, r) => sum + r.bytes, 0),
    probes: results,
  };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function pad(s: string, width: number, alignRight = false): string {
  if (s.length >= width) return s;
  const filler = " ".repeat(width - s.length);
  return alignRight ? filler + s : s + filler;
}

function report(current: MeasureResult, baseline: MeasureResult | null): void {
  const baselineByLabel = new Map<string, number>();
  if (baseline) {
    for (const p of baseline.probes) baselineByLabel.set(p.label, p.bytes);
  }

  const labelWidth = Math.max(
    "ENDPOINT".length,
    ...current.probes.map((p) => p.label.length),
  );
  const sizeWidth = 10;
  const deltaWidth = 14;

  const header =
    pad("ENDPOINT", labelWidth) +
    "  " +
    pad("BYTES", sizeWidth, true) +
    "  " +
    pad("vs BASELINE", deltaWidth, true);
  console.log(header);
  console.log("-".repeat(header.length));

  for (const probe of current.probes) {
    const base = baselineByLabel.get(probe.label);
    let delta = "(new)";
    if (base !== undefined) {
      if (base === probe.bytes) {
        delta = "(same)";
      } else {
        const pct = ((probe.bytes - base) / base) * 100;
        const sign = pct >= 0 ? "+" : "";
        delta = `${sign}${pct.toFixed(1)}%`;
      }
    } else if (!baseline) {
      delta = "(no baseline)";
    }
    console.log(
      pad(probe.label, labelWidth) +
        "  " +
        pad(formatBytes(probe.bytes), sizeWidth, true) +
        "  " +
        pad(delta, deltaWidth, true),
    );
  }

  console.log("-".repeat(header.length));

  let totalDelta = baseline ? "(no baseline)" : "(no baseline)";
  if (baseline) {
    const pct =
      ((current.totalBytes - baseline.totalBytes) / baseline.totalBytes) * 100;
    const sign = pct >= 0 ? "+" : "";
    totalDelta = `${sign}${pct.toFixed(1)}%`;
  }
  console.log(
    pad("TOTAL", labelWidth) +
      "  " +
      pad(formatBytes(current.totalBytes), sizeWidth, true) +
      "  " +
      pad(totalDelta, deltaWidth, true),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const saveBaseline = args.includes("--save");

  const current = await measure();

  let baseline: MeasureResult | null = null;
  if (existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as MeasureResult;
  }

  report(current, baseline);

  if (saveBaseline) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n");
    console.log(`\nBaseline saved to ${BASELINE_PATH}`);
  } else if (!baseline) {
    console.log("\nNo baseline yet. Re-run with --save to capture one.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
