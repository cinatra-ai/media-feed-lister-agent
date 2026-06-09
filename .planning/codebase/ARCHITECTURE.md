<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Caller / Composer                         │
│   (e.g., @cinatra-ai/media-transcript-agent, CLI, UI)        │
└────────────────────────────┬────────────────────────────────┘
                             │  inputs: url, source, latestCount,
                             │  filterMode, dateFrom, dateTo
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              StartNode  (`cinatra/oas.json` → "start")       │
│  Validates required field: `url`. Passes all inputs through. │
└────────────────────────────┬────────────────────────────────┘
                             │ data flow edges (one per input)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   ApiNode "list"  (`cinatra/oas.json` → "list")              │
│   POST {{CINATRA_BASE_URL}}/api/llm-bridge                   │
│   LLM: gpt-5.5 via openai                                    │
│   System prompt: references SKILL.md step-by-step           │
│   MCP tools available: media_feed_youtube_list,              │
│                        media_feed_podcast_list               │
└────────────────────────────┬────────────────────────────────┘
                             │ outputs: sourceTitle, sourceUrl,
                             │ detectedType, episodes, failureCode
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              EndNode  (`cinatra/oas.json` → "end")           │
│  Emits the final JSON object to the caller.                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Flow manifest | Declares inputs/outputs, nodes, control-flow and data-flow edges | `cinatra/oas.json` |
| StartNode ("start") | Accepts and forwards all six inputs; marks `url` as required | `cinatra/oas.json` → `$referenced_components.start` |
| ApiNode ("list") | Posts to `/api/llm-bridge`; LLM classifies URL, calls one MCP primitive, returns JSON | `cinatra/oas.json` → `$referenced_components.list` |
| EndNode ("end") | Collects and exposes the five output fields with defaults | `cinatra/oas.json` → `$referenced_components.end` |
| SKILL.md | LLM instruction document: classification rules, step-by-step tool discipline, output shape, error handling | `skills/media-feed-lister-agent/SKILL.md` |
| CI gate | Self-contained Node.js script validating OAS banned-primitive and workflow BPMN shape | `extension-kind-gate.mjs` |

## Pattern Overview

**Overall:** Cinatra LLM-Bridge Flow — single-round-trip stateless leaf agent

**Key Characteristics:**
- No application source code (`src/` is absent; the agent is entirely declarative)
- Execution is driven by the LLM via `SKILL.md` instructions injected at runtime by `/api/llm-bridge`
- The LLM may call exactly two MCP primitives: `media_feed_youtube_list` or `media_feed_podcast_list`
- The flow is a linear three-node DAG: StartNode → ApiNode → EndNode
- No branching, no loops, no human-in-the-loop (HITL) screens

## Layers

**Flow Declaration Layer:**
- Purpose: Defines the agent's external contract — inputs, outputs, node topology, and data wiring
- Location: `cinatra/oas.json`
- Contains: StartNode, ApiNode, EndNode definitions and all ControlFlowEdge/DataFlowEdge entries
- Depends on: Cinatra platform runtime (`{{CINATRA_BASE_URL}}/api/llm-bridge`)
- Used by: Cinatra marketplace; composing agents (e.g., `@cinatra-ai/media-transcript-agent`)

**LLM Instruction Layer:**
- Purpose: Governs LLM behavior — URL classification, tool selection, output shaping, error codes
- Location: `skills/media-feed-lister-agent/SKILL.md`
- Contains: Input spec, tool discipline rules, 4-step execution procedure, response JSON shapes
- Depends on: MCP primitives `media_feed_youtube_list`, `media_feed_podcast_list`
- Used by: The ApiNode system prompt via `agent_id` auto-discovery on `/api/llm-bridge`

**CI/Validation Layer:**
- Purpose: Pre-publish sanity gate; scans `cinatra/oas.json` for retired CRM primitives
- Location: `extension-kind-gate.mjs`
- Contains: `validateAgent`, `validateWorkflow`, `runGate`, and supporting helpers
- Depends on: Node.js built-ins only (zero runtime dependencies)
- Used by: `.github/workflows/ci.yml` ("Agent OAS validation gate" step)

## Data Flow

### Primary Request Path

1. Caller supplies `url` (required) + optional parameters → StartNode (`cinatra/oas.json` → `start`)
2. All six inputs forwarded via DataFlowEdges → ApiNode (`cinatra/oas.json` → `list`)
3. ApiNode posts to `/api/llm-bridge` with rendered Jinja2 user prompt and `agent_id: "media-feed-lister-agent"`
4. LLM loads `SKILL.md`, classifies URL, calls `media_feed_youtube_list` or `media_feed_podcast_list` via MCP
5. LLM returns single JSON object: `{ sourceTitle, sourceUrl, detectedType, episodes, failureCode }`
6. Five outputs forwarded via DataFlowEdges → EndNode (`cinatra/oas.json` → `end`)
7. EndNode emits outputs to caller

### Error / Rejection Path

1. URL fails classification (unsupported host/path) → LLM returns `failureCode: "UNSUPPORTED_URL"`, `episodes: []` — no MCP call made
2. MCP primitive throws a known error code → LLM returns `failureCode: <error_code>`, `episodes: []` — no retry

**State Management:**
- Fully stateless. No persistent state, no session, no caching. Each invocation is independent.

## Key Abstractions

**Cinatra Flow (OAS manifest):**
- Purpose: Declarative agent topology consumed by the Cinatra platform runtime
- Examples: `cinatra/oas.json`
- Pattern: `agentspec_version` JSON document with `component_type: "Flow"`, referencing StartNode/ApiNode/EndNode via `$component_ref`

**SKILL.md:**
- Purpose: LLM system instructions that replace imperative code with natural-language rules
- Examples: `skills/media-feed-lister-agent/SKILL.md`
- Pattern: Front-matter YAML header (`name`, `description`) followed by Markdown sections for inputs, tool discipline, classification rules, steps, and error handling

**MCP Primitives:**
- Purpose: External tool calls the LLM can make during the single round trip
- `media_feed_youtube_list({ channelUrl })` — fetches YouTube channel video list
- `media_feed_podcast_list({ websiteUrl, filterMode?, dateFrom?, dateTo?, latestCount? })` — fetches podcast episodes via RSS/Atom
- These are injected automatically by the Cinatra self-MCP; `toolboxes` is intentionally absent from the ApiNode metadata

## Entry Points

**Flow Entry (external callers):**
- Location: `cinatra/oas.json` → StartNode `"start"`
- Triggers: Cinatra platform invocation, composing agents, or direct API call
- Responsibilities: Receives `url` (required) and five optional parameters; passes them to the ApiNode

**CI Entry:**
- Location: `extension-kind-gate.mjs` → `main()` (invoked when file is run directly)
- Triggers: `node extension-kind-gate.mjs --package-root .` in `.github/workflows/ci.yml`
- Responsibilities: Reads `package.json` to determine `cinatra.kind`, runs kind-specific validation

## Architectural Constraints

- **Threading:** Not applicable — no application code; LLM inference is single round-trip
- **Global state:** None. The agent carries no module-level singletons.
- **Circular imports:** Not applicable — no `src/` directory
- **Single MCP call:** SKILL.md enforces exactly one tool call per invocation (no retry, no fallback chaining)
- **No `src/` sources:** This is a content-only agent extension. `tsconfig.json` targets `src/` but no TypeScript files exist; CI detects this and skips typecheck
- **LLM model pinned:** `gpt-5.5` via `openai` declared in `cinatra/oas.json` metadata and ApiNode `cinatra_llm`

## Anti-Patterns

### Calling additional MCP tools
**What happens:** LLM calls `web_search`, `objects_*`, `agent_run`, or any primitive not listed in SKILL.md
**Why it's wrong:** Violates the single-round-trip leaf contract; downstream composers assume deterministic, fast execution
**Do this instead:** Call only `media_feed_youtube_list` or `media_feed_podcast_list` as specified in `skills/media-feed-lister-agent/SKILL.md`

### Retrying on primitive errors
**What happens:** LLM retries a failed MCP call before returning
**Why it's wrong:** SKILL.md explicitly forbids retry; the caller inspects `failureCode` and decides recovery
**Do this instead:** Return the failure envelope immediately with the primitive's error code as `failureCode`

### Using retired CRM primitives in OAS prompt strings
**What happens:** `system`/`user`/`description` fields in `cinatra/oas.json` reference `lists_list`, `contacts_get`, etc.
**Why it's wrong:** CI gate (`extension-kind-gate.mjs`) will fail with a banned-primitive violation
**Do this instead:** Never reference CRM primitives; route through `crm_*` facade if needed

## Error Handling

**Strategy:** Failure envelope — always return a valid JSON object; never throw to the caller

**Patterns:**
- URL classification failure → `failureCode: "UNSUPPORTED_URL"`, `episodes: []`, stop
- MCP primitive error → `failureCode: <primitive_error_code>`, `episodes: []`, stop
- No retry in any case; caller owns recovery logic

## Cross-Cutting Concerns

**Logging:** Not applicable — no application runtime; platform handles observability
**Validation:** URL classification rules defined in `skills/media-feed-lister-agent/SKILL.md`; input schema constraints in `cinatra/oas.json` (enum values, integer bounds)
**Authentication:** MCP credentials injected by Cinatra platform; `{{CINATRA_BASE_URL}}` resolved at runtime

---

*Architecture analysis: 2026-06-09*
