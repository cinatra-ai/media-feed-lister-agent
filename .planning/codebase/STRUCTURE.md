# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
media-feed-lister-agent/
├── cinatra/
│   └── oas.json                   # Cinatra Flow manifest (agent contract)
├── skills/
│   └── media-feed-lister-agent/
│       └── SKILL.md               # LLM instruction document
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Standalone CI pipeline
│       └── release.yml            # Release pipeline
├── extension-kind-gate.mjs        # Self-contained CI validation gate (Node.js)
├── package.json                   # Package manifest (cinatra.kind: "agent")
├── tsconfig.json                  # TypeScript config (targets src/ — currently unused)
├── .npmrc                         # npm/pnpm registry config
├── LICENSE                        # Apache-2.0
└── README.md                      # Public documentation
```

## Directory Purposes

**`cinatra/`:**
- Purpose: Cinatra platform artifacts that define the agent's runtime contract
- Contains: `oas.json` — the Flow manifest declaring nodes, inputs, outputs, and data/control-flow edges
- Key files: `cinatra/oas.json`

**`skills/media-feed-lister-agent/`:**
- Purpose: LLM instruction documents auto-discovered by `/api/llm-bridge` via `agent_id`
- Contains: `SKILL.md` — URL classification rules, MCP tool discipline, step-by-step execution, output shapes, error codes
- Key files: `skills/media-feed-lister-agent/SKILL.md`

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD pipelines
- Contains: `ci.yml` (build + typecheck + test + kind-gate) and `release.yml` (publish)
- Key files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

## Key File Locations

**Entry Points:**
- `cinatra/oas.json`: Flow entry — defines StartNode, ApiNode, EndNode and their wiring; this is what the Cinatra platform loads to execute the agent

**LLM Instructions:**
- `skills/media-feed-lister-agent/SKILL.md`: Governs all LLM behavior at runtime

**CI Validation:**
- `extension-kind-gate.mjs`: Zero-dependency Node.js gate; validates `cinatra/oas.json` for banned CRM primitives; also ships workflow BPMN validation logic for other extension kinds

**Package Manifest:**
- `package.json`: Declares `@cinatra-ai/media-feed-lister-agent`, `cinatra.kind: "agent"`, `cinatra.apiVersion: "cinatra.ai/v1"`, and `cinatra.dependencies: []`

**TypeScript Config:**
- `tsconfig.json`: Targets `src/**/*.ts` with strict settings, `outDir: dist`. No `src/` exists currently — CI detects the absence and skips typecheck.

## Naming Conventions

**Files:**
- Cinatra manifests: lowercase, dot-separated (`oas.json`)
- Scripts: kebab-case with `.mjs` extension (`extension-kind-gate.mjs`)
- Instruction docs: UPPERCASE.md (`SKILL.md`)
- CI workflows: lowercase (`ci.yml`, `release.yml`)

**Directories:**
- Platform artifacts: `cinatra/` (reserved name, matches Cinatra tooling expectations)
- Agent skills: `skills/<package-slug>/` where package-slug matches `package.json` name minus the `@scope/` prefix

## Where to Add New Code

**Modify agent behavior (LLM logic, classification rules, output shape):**
- Edit: `skills/media-feed-lister-agent/SKILL.md`

**Change inputs, outputs, or node topology:**
- Edit: `cinatra/oas.json` — update `inputs`/`outputs` arrays on the Flow and the affected nodes; add/remove DataFlowEdges accordingly

**Change the LLM model or provider:**
- Edit: `cinatra/oas.json` → `metadata.cinatra.llm` and `$referenced_components.list.data.cinatra_llm`

**Add TypeScript source code (e.g., a helper script or test):**
- Create: `src/` directory (currently absent); files must match `src/**/*.ts` to be picked up by `tsconfig.json`

**Add CI steps:**
- Edit: `.github/workflows/ci.yml` — append steps to the `kind-gates` job

## Special Directories

**`cinatra/`:**
- Purpose: Cinatra platform manifest container
- Generated: Partially (OAS generated from monorepo tooling, then committed)
- Committed: Yes

**`skills/`:**
- Purpose: LLM instruction documents; auto-discovered by agent_id on the llm-bridge
- Generated: No (hand-authored)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts (codebase maps, phase plans)
- Generated: Yes (by GSD tooling)
- Committed: Yes (by convention)

---

*Structure analysis: 2026-06-09*
