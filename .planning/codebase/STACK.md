# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript — compiled to ESNext, targets `src/` (config: `tsconfig.json`); strict mode enabled
- JavaScript (ESM) — `extension-kind-gate.mjs`, zero-dependency Node.js CI gate

**Secondary:**
- JSON — agent flow definition in `cinatra/oas.json`, package manifest in `package.json`
- Markdown — skill prompt in `skills/media-feed-lister-agent/SKILL.md`

## Runtime

**Environment:**
- Node.js 24 (pinned in `.github/workflows/ci.yml` via `actions/setup-node@v4 node-version: "24"`)

**Package Manager:**
- pnpm via corepack (`corepack enable` in CI)
- Lockfile: not committed (CI uses `--no-frozen-lockfile`)

## Frameworks

**Core:**
- None — this is a content-only Cinatra agent extension. There is no application server or web framework. The agent logic is LLM-driven via the Cinatra platform's `/api/llm-bridge` endpoint and MCP tool primitives.

**Testing:**
- Not configured (no test script or test framework declared in `package.json`)

**Build/Dev:**
- TypeScript compiler (`tsc`) — config: `tsconfig.json`, outputs to `dist/`, sources in `src/`; no build script declared in `package.json` (the repo is currently a source mirror with no TypeScript sources tracked)

**CI:**
- GitHub Actions — `ci.yml` (build + kind-gate), `release.yml` (marketplace publish via reusable workflow)

## Key Dependencies

**Critical:**
- None declared in `dependencies` or `devDependencies`; `package.json` has no dependency fields
- `@cinatra-ai/media-transcript-agent` — intended compose target (referenced in README), not declared as a dep (runtime composition only)

**Infrastructure:**
- `extension-kind-gate.mjs` — self-contained, zero-dependency Node.js CI gate shipped directly into the repo; validates `cinatra/oas.json` for retired primitives

## Configuration

**Environment:**
- `CINATRA_BASE_URL` — required at runtime; referenced as `{{CINATRA_BASE_URL}}` in the ApiNode URL in `cinatra/oas.json`; injected by the Cinatra platform
- `.env` file: not present in repo

**Build:**
- `tsconfig.json` — standalone TypeScript config; target ES2023, module ESNext, bundler resolution, outputs to `dist/`, sources in `src/`
- `.npmrc` — `auto-install-peers=false`

## Platform Requirements

**Development:**
- Node.js 24+, pnpm via corepack
- No local install required for content-only agent (no TypeScript sources currently tracked)

**Production:**
- Hosted on Cinatra platform; published to `registry.cinatra.ai` via Cinatra Marketplace
- Release triggered by GitHub Release tag matching `v<package.json.version>`
- Package name: `@cinatra-ai/media-feed-lister-agent` v0.1.0
- License: Apache-2.0

---

*Stack analysis: 2026-06-09*
