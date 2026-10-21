# AI Engineering

Building and improving systems that use large language models: how to write prompts and assemble context, how to ground answers in your own data with retrieval, how to give a model tools and let it act as an agent, and how to measure, secure, and pay for the result. Where [AI-Assisted Development](../ai-assisted-development/README.md) is about writing software *with* an agent, this section is about engineering the LLM system itself.

Start with the [Overview](overview.md): it lays out the levers in order of cost and points to the article that goes deep on each one. [RAG](rag.md) is the core retrieval article; [Agents](agents.md) is the core one for multi-step, tool-using systems.

**Code examples** are written in Python and TypeScript, and every block is labelled with the provider it targets (for example **Python — Claude API**). The prose stays provider-neutral; to add another provider, add sibling blocks with their own label (**Python — DeepSeek API**) rather than editing the existing ones.

---

## Articles

### Foundations

| Article | Description |
|---|---|
| [Overview](overview.md) | The building blocks of an LLM application, the levers in order of cost, and the quality / cost / latency triangle |
| [Prompt Engineering](prompt-engineering.md) | System prompts, clarity, few-shot examples, XML-tag structure, and when to ask the model to reason |
| [Structured Outputs](structured-outputs.md) | Getting machine-readable JSON back reliably — from prompt instructions to schema-enforced output — and validating it |
| [Context Engineering](context-engineering.md) | Treating the context window as a budget: context rot, ordering, compaction, clearing tool results, just-in-time loading |

### Retrieval

| Article | Description |
|---|---|
| [Retrieval-Augmented Generation (RAG)](rag.md) | Grounding answers in your own documents: chunking, embeddings, hybrid search, reranking, contextual retrieval, and how RAG fails |
| [How to Build a RAG Pipeline](building-a-rag-pipeline.md) | How-to: chunk, embed, retrieve, rerank, answer with citations, and measure recall |
| [Prompting vs RAG vs Fine-Tuning](prompting-vs-rag-vs-fine-tuning.md) | Knowledge versus behaviour — which lever to pull, and in what order |

### Tools and agents

| Article | Description |
|---|---|
| [Tool Use](tool-use.md) | Function calling: the request/execute/result cycle and how to design tools a model uses well |
| [Model Context Protocol (MCP)](model-context-protocol.md) | An open protocol that packages tools, resources, and prompts so any compatible host can use them |
| [Agents](agents.md) | Workflows versus agents, the agent loop, the five workflow patterns, and the real cost of multi-agent systems |
| [Agent Memory](agent-memory.md) | Short-term and long-term memory, what is worth remembering, and how memory goes wrong |
| [Agent Skills](agent-skills.md) | On-demand instruction packages and progressive disclosure — and how they differ from instruction files, memory, and tools |

### Quality, security, and cost

| Article | Description |
|---|---|
| [Evals](evals.md) | Automated tests for LLM behaviour: datasets, code graders, LLM-as-judge, variance, and regression evals in CI |
| [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md) | When data becomes instruction — direct and indirect injection, the lethal trifecta, and defence in layers |
| [Prompt Caching](prompt-caching.md) | Reusing a processed prompt prefix to cut cost and latency, and the silent mistakes that break the cache |
| [Cost and Latency Optimization](cost-and-latency-optimization.md) | Model routing, effort, token hygiene, batching, streaming, and measuring cost per completed task |
