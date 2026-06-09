# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:** Not applicable — this repo contains no test files.

**Config:** No `jest.config.*`, `vitest.config.*`, or similar test config files are present.

**Run Commands:**
```bash
corepack pnpm test --if-present   # CI command; exits 0 when no test script is defined
```

No `test` script is declared in `package.json`.

## Test File Organization

No test files exist in this repository. The CI pipeline (`ci.yml`) runs `pnpm test --if-present`, which exits 0 when no test script is defined — ensuring the absence of tests is not a CI failure.

## Validation Logic (Tested Indirectly via CI)

The only executable code in the repo is `extension-kind-gate.mjs`. It is a self-contained CI gate that CI runs directly:

```bash
node extension-kind-gate.mjs --package-root .
```

The gate validates:
- `cinatra/oas.json` parses as valid JSON
- No retired CRM primitive names appear in LLM-visible OAS fields (`system`, `user`, `description`)
- No banned typeHint strings appear in LLM-visible fields
- `objects_list(<crm-entity-type>)` pattern is absent

The gate functions (`validateAgent`, `validateBpmnSanity`, `validateWorkflowPackageShape`, `findWorkflowSidecars`, `runGate`, `parseArgs`) are all exported — making them unit-testable — but no test suite is present in this repo. Testing of these functions happens in the upstream Cinatra monorepo.

## Mocking

Not applicable — no test suite exists in this repo.

## Fixtures and Factories

Not applicable — no test suite exists in this repo.

## Coverage

**Requirements:** None enforced in this repo.

**Coverage tooling:** Not configured.

## Test Types

**Unit Tests:** Not present. The gate functions are pure and export-ready, but untested here.

**Integration Tests:** Not present. Agent behavior (correct MCP primitive dispatch, output shape) is validated at the platform level by the Cinatra marketplace at publish/install time.

**E2E Tests:** Not applicable.

## What the CI Gate Validates Instead

The CI pipeline in `.github/workflows/ci.yml` enforces correctness through structural gates:

1. **Dependency shape check** — ensures no `@cinatra-ai/*` packages leak into `dependencies`/`devDependencies`
2. **Typecheck** — skipped for this repo (content-only, no `.ts` source files tracked)
3. **Pack dry-run** — `npm pack --dry-run` validates publishable package shape
4. **Agent OAS validation gate** — `node extension-kind-gate.mjs --package-root .` scans `cinatra/oas.json` for retired primitives and parses it for validity

These gates act as the functional test surface for this content-only agent extension.

## Adding Tests

If executable TypeScript source is added to this repo under `src/`, tests should be added as follows:

- Place test files co-located with source or in a `__tests__/` directory
- Add a `test` script to `package.json`
- Configure a test runner (vitest recommended for ESM projects; matches Cinatra monorepo conventions)
- The CI `Test` step will automatically pick up and run the `test` script

---

*Testing analysis: 2026-06-09*
