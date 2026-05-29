#!/usr/bin/env node
import { startServer } from "./mcp/server.js";

startServer().catch((err: unknown) => {
  // stdio is reserved for the MCP transport — diagnostics go to stderr so
  // the operator sees them when running `npm run start` directly.
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(`dev-atlas MCP server failed to start:\n${message}\n`);
  process.exit(1);
});
