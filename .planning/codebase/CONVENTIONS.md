# Coding Conventions

**Analysis Date:** 2026-06-09

## Repository Type

This is a content-only Cinatra agent extension repo. It ships no TypeScript source files (`src/` does not exist). The codebase consists of:

- `skills/media-feed-lister-agent/SKILL.md` — LLM behavior specification (Markdown)
- `cinatra/oas.json` — Agent OAS definition (JSON)
- `extension-kind-gate.mjs` — Self-contained Node.js CI validation script (ESM JavaScript)
- `package.json` — Extension manifest

All agent logic is expressed declaratively in SKILL.md and cinatra/oas.json, not in TypeScript source files. TypeScript compilation is skipped by CI because no `.ts` files are tracked.

## Naming Patterns

**Files:**
- kebab-case for all filenames: `extension-kind-gate.mjs`, `oas.json`, `workflow.bpmn`
- UPPERCASE for specification documents: `SKILL.md`, `LICENSE`, `README.md`

**Directories:**
- `cinatra/` — Cinatra platform artifacts (OAS, BPMN)
- `skills/<agent-name>/` — Agent SKILL.md files, named to match the agent slug

**JSON keys in `cinatra/oas.json`:**
- `snake_case` for OAS-level fields: `agentspec_version`, `component_type`, `start_node`, `control_flow_connections`, `data_flow_connections`
- `camelCase` for Cinatra metadata sub-fields: `packageName`, `packageVersion`, `hitlScreens`, `preferredProvider`, `preferredModel`, `riskClass`, `requiresApproval`
- `$`-prefixed keys for references: `$component_ref`, `$referenced_components`

**Node IDs and edge names:**
- Short lowercase identifiers for node IDs: `"start"`, `"list"`, `"end"`
- Underscore-joined snake_case for edge names: `"start_to_list"`, `"list_sourceTitle_to_end_sourceTitle"`

**Package naming:**
- Agent packages: `@cinatra-ai/<slug>-agent` (e.g., `@cinatra-ai/media-feed-lister-agent`)
- Workflow packages: `@cinatra-ai/<slug>-workflow`

## Code Style (`extension-kind-gate.mjs`)

**Language:** ES Modules (`.mjs`), Node.js builtins only, zero third-party dependencies.

**Formatting:**
- 2-space indentation
- Double quotes for strings
- Trailing commas in multi-line arrays/objects
- No semicolons omitted — semicolons are used throughout

**Functions:**
- Named exports for each validator: `parseArgs`, `validateAgent`, `validateWorkflow`, `validateBpmnSanity`, `validateWorkflowPackageShape`, `findWorkflowSidecars`, `runGate`
- Pure functions preferred: validators accept primitive inputs and return `string[]` errors — no side effects
- `main()` is the only impure entry point; guarded with `invokedDirectly` check

**Constants:**
- `UPPER_SNAKE_CASE` for module-level constants: `LLM_VISIBLE_FIELDS`, `BANNED_PRIMITIVES`, `BANNED_TYPEHINTS`, `PRIMITIVE_PATTERNS`, `BPMN_MODEL_NS`, `WORKFLOW_PACKAGE_NAME_RE`

## Import Organization

Only Node.js built-in imports, grouped together at the top:

```js
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, basename, dirname, relative } from "node:path";
```

Use `node:` protocol prefix for all built-in imports.

## Error Handling

**In `extension-kind-gate.mjs`:**
- Validators return `string[]` (never throw) — each error string describes one violation
- `try/catch` wraps all file I/O; errors are converted to messages via `err instanceof Error ? err.message : String(err)`
- `main()` is wrapped in a top-level `try/catch` that prints and exits with code 1 on unexpected errors
- Exit code 0 = pass, 1 = violations found, 2 = dependency-shape regression (reserved for CI inline script)

**In `cinatra/oas.json` (agent behavior):**
- The agent never retries on primitive failure
- On MCP primitive error, return a structured failure envelope: `{ sourceTitle: "", sourceUrl: "<url>", detectedType: "<type>", episodes: [], failureCode: "<ERROR_CODE>" }`
- On unsupported URL, return the same envelope with `failureCode: "UNSUPPORTED_URL"`
- Defined error codes from primitives: `MEDIA_FEED_YOUTUBE_KEY_MISSING`, `MEDIA_FEED_YOUTUBE_AUTH`, `MEDIA_FEED_YOUTUBE_QUOTA`, `MEDIA_FEED_YOUTUBE_FETCH`, `MEDIA_FEED_YOUTUBE_INVALID_URL`, `MEDIA_FEED_YOUTUBE_NO_CHANNEL`, `MEDIA_FEED_PODCAST_INVALID_URL`, `MEDIA_FEED_PODCAST_FETCH`, `MEDIA_FEED_PODCAST_NO_FEED`, `MEDIA_FEED_PODCAST_PARSE`

## Logging

The `extension-kind-gate.mjs` uses:
- `console.log` for passing status messages
- `console.error` for violation lists and unexpected errors

No structured logging library is used.

## Comments

Block comments appear at the top of `extension-kind-gate.mjs` explaining scope, constraints, and usage. Section dividers use `// ---` lines. Inline comments explain non-obvious decisions (e.g., why `npx` is used instead of `pnpm dlx`).

## SKILL.md Conventions

- Written in Markdown with H2 (`##`) sections: Inputs, Tool discipline, URL classification, Steps, Step N — Error handling
- Step-by-step procedural sections use H3 (`###`) headings
- Code blocks show exact JSON output shapes
- Decision rules are numbered lists
- Constraints use bold text for key terms

## `cinatra/oas.json` Conventions

- `agentspec_version` must be present at the top level
- `component_type: "Flow"` for agent-level definition
- `metadata.cinatra.llm.preferredProvider` and `preferredModel` specified per agent
- Nodes reference each other via `{ "$component_ref": "<id>" }`
- `"toolboxes"` is intentionally omitted from `metadata.cinatra` when the agent needs access to all always-injected Cinatra MCP tools
- `riskClass: "read_only"` for agents that only read data

## `package.json` Conventions

- `"type": "module"` required for ESM
- `"cinatra"` key declares: `apiVersion`, `kind`, `dependencies`
- No `dependencies`, `devDependencies`, or `scripts` needed for content-only agent repos
- First-party `@cinatra-ai/*` packages MUST NOT appear in `dependencies`/`devDependencies`; they are declared as optional `peerDependencies` if needed

---

*Convention analysis: 2026-06-09*
