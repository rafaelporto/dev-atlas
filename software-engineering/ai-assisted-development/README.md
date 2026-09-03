# AI-Assisted Development

Engineering practices for building software with LLM-based coding agents. This section covers where the practices sit on the spectrum from ad-hoc prompting to disciplined engineering, what spec-driven development actually claims, the persistent-context files every agent reads, and a practical guide to writing a spec an agent can act on.

Start with the [Overview](overview.md) for the landscape and the trade-offs that cut across every practice here. [Spec-Driven Development](spec-driven-development.md) is the core article — it separates the three levels of the idea and says plainly which ones hold up today.

---

## Articles

| Article | Description |
|---|---|
| [Overview](overview.md) | The spectrum from vibe coding to agentic engineering, the three layers of an assisted practice, and why the learning loop still costs what it costs |
| [Spec-Driven Development](spec-driven-development.md) | Writing a specification before letting an agent generate code — the three levels (spec-first, spec-anchored, spec-as-source) and where each one breaks |
| [Agent Instruction Files](agent-instruction-files.md) | `AGENTS.md`, `CLAUDE.md`, constitutions, and steering files — the persistent context layer, and the cheapest part of the practice to adopt |
| [Writing a Spec for an AI Agent](writing-a-spec-for-an-ai-agent.md) | How-to: size the task first, write the what and the why, then feed back what the implementation taught you |
