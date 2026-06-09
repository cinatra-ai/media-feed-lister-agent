# Codebase Concerns

**Analysis Date:** 2026-06-09

## Tech Debt

**No lockfile committed:**
- Issue: `package.json` has no `pnpm-lock.yaml` committed. CI runs `pnpm install --no-frozen-lockfile`, meaning dependency versions are resolved fresh on every CI run. This is intentional for source-mirror repos (per CI comments) but means reproducible builds are not enforced at the repo level.
- Files: `package.json`, `.github/workflows/ci.yml`
- Impact: A transitive dep bump can silently break the extension between CI runs with no diff to review.
- Fix approach: Commit a lockfile, or add a `pnpm --frozen-lockfile` step once the repo moves to standalone mode.

**`tsconfig.json` references a `src/` directory that does not exist:**
- Issue: `tsconfig.json` sets `rootDir: "src"` and `include: ["src/**/*.ts", "src/**/*.tsx"]`, but no `src/` directory exists in the repo. This is a content-only agent (pure `cinatra/oas.json` + `skills/` SKILL.md); there are no TypeScript sources to compile.
- Files: `tsconfig.json`
- Impact: Running `tsc` standalone would fail with `TS18003 "No inputs were found"`. CI skips typecheck for source-mirror repos, so this is silently hidden, but it is misleading and would break any developer who attempts a local typecheck.
- Fix approach: Remove `tsconfig.json` from content-only agent repos, or replace it with a no-op config that does not target `src/`.

**`extension-kind-gate.mjs` is a large duplicated artifact:**
- Issue: `extension-kind-gate.mjs` (391 lines) is described in its own header as "shipped INTO each extracted agent/workflow repo by the extraction script." It is a copy of the canonical gate from the cinatra monorepo. Any fix to the gate rules must be applied to both the monorepo source and every extracted repo copy in lockstep.
- Files: `extension-kind-gate.mjs`
- Impact: Drift between gate versions across repos is possible. A new banned primitive added in the monorepo gate is not enforced here until the extraction script re-runs.
- Fix approach: Long-term, publish the gate as a standalone zero-dep npm package so extracted repos can pin a version rather than copy source.

**`preferredModel: "gpt-5.5"` hard-coded in OAS:**
- Issue: `cinatra/oas.json` hard-codes `"preferredModel": "gpt-5.5"` at both the flow level and the ApiNode level. If this model is deprecated or renamed, the agent silently falls back to the platform default with no observable change in the manifest.
- Files: `cinatra/oas.json` (lines 16, 209)
- Impact: Model preferences are invisible at review time; no validation gate enforces that `preferredModel` refers to an active model name.
- Fix approach: Add a CI gate or marketplace-side schema validation that verifies preferred model names against an allowlist.

## Known Bugs

**YouTube `latestCount` is applied client-side after the primitive returns up to 500 items:**
- Symptoms: For YouTube channels with many videos, the agent fetches up to 500 episodes from the primitive and then truncates to `latestCount` in the LLM layer. This is wasteful and may cause LLM context window pressure for large channels.
- Files: `skills/media-feed-lister-agent/SKILL.md` (Step 2, YouTube branch)
- Trigger: Any YouTube channel with more than `latestCount` videos.
- Workaround: Callers can keep `latestCount` small (default 10), but the primitive always returns its full paginated set.

**`dateFrom` / `dateTo` passed as empty strings instead of being omitted:**
- Symptoms: SKILL.md instructs the LLM to omit `dateFrom`/`dateTo` when they are empty strings, but the OAS passes them unconditionally as string inputs defaulting to `""`. An LLM that does not correctly interpret "omit if empty string" will forward `dateFrom: ""` to the podcast primitive, which may behave unexpectedly.
- Files: `cinatra/oas.json` (lines 39-40, 64-65, 114-121), `skills/media-feed-lister-agent/SKILL.md` (Step 2 podcast branch)
- Trigger: Any podcast call where `dateFrom` and `dateTo` are not supplied by the caller.
- Workaround: Relies on LLM correctly interpreting the SKILL.md instruction to omit empty-string params.

## Security Considerations

**`.npmrc` committed with `auto-install-peers=false`:**
- Risk: Low. The `.npmrc` file contains only a pnpm config flag, no auth tokens.
- Files: `.npmrc`
- Current mitigation: No sensitive values present.
- Recommendations: Ensure the extraction script never accidentally injects registry auth tokens into `.npmrc` in extracted repos.

**Marketplace vendor token via `secrets: inherit`:**
- Risk: The release workflow inherits all org secrets, including `CINATRA_MARKETPLACE_VENDOR_TOKEN`. Any workflow modification that adds a step could exfiltrate this secret.
- Files: `.github/workflows/release.yml`
- Current mitigation: The job delegates entirely to a reusable workflow at `cinatra-ai/.github`; no inline steps have access to the token.
- Recommendations: Pin the reusable workflow to a SHA rather than `@main` to prevent supply-chain substitution of the trusted workflow.

**No input sanitization layer for `url` parameter:**
- Risk: The agent is a stateless leaf that passes the caller-supplied `url` directly to `media_feed_youtube_list` or `media_feed_podcast_list`. SSRF-style risks depend entirely on what those MCP primitives do internally.
- Files: `skills/media-feed-lister-agent/SKILL.md`, `cinatra/oas.json`
- Current mitigation: URL classification rules in SKILL.md reject non-http/https schemes and known invalid YouTube paths.
- Recommendations: The platform should enforce that MCP primitives themselves validate and restrict outbound URLs.

## Performance Bottlenecks

**YouTube: full channel fetch before `latestCount` truncation:**
- Problem: The YouTube primitive returns the full paginated episode set (up to 500 items); the LLM then discards all but `latestCount`. For channels with hundreds of videos this transfers a large payload through the LLM context unnecessarily.
- Files: `skills/media-feed-lister-agent/SKILL.md` (Step 2 YouTube branch)
- Cause: The `media_feed_youtube_list` primitive does not accept a `latestCount` parameter — paging/limiting is not available at the primitive level.
- Improvement path: Add a `latestCount` parameter to `media_feed_youtube_list` so the primitive can apply server-side paging.

## Fragile Areas

**Single-node OAS flow with no error recovery path:**
- Files: `cinatra/oas.json`
- Why fragile: The entire agent is one `ApiNode` → LLM call. If the LLM bridge returns a malformed JSON response (not the expected `{sourceTitle, sourceUrl, detectedType, episodes, failureCode}` shape), the flow has no retry or validation node — the malformed output propagates to the caller.
- Safe modification: Any change to output schema must be reflected in both `cinatra/oas.json` outputs and `skills/media-feed-lister-agent/SKILL.md` Step 3 simultaneously.
- Test coverage: No automated tests for the OAS flow shape or for LLM output conformance.

**URL classification logic lives only in the SKILL.md prompt:**
- Files: `skills/media-feed-lister-agent/SKILL.md` (URL classification section)
- Why fragile: Classification rules (YouTube hostname set, path prefix list, reject conditions) are expressed as natural language instructions to the LLM. Edge cases (unusual YouTube URL formats, international subdomains, redirect URLs) depend entirely on LLM interpretation fidelity, not a deterministic parser.
- Safe modification: Always test classification changes against a suite of real-world URLs in the platform's LLM test harness before releasing.
- Test coverage: No unit tests; classification is non-deterministic by nature.

## Scaling Limits

**`latestCount` ceiling of 50:**
- Current capacity: 1–50 episodes/videos per call.
- Limit: Hard cap enforced at the OAS schema level (`"maximum": 50`). Callers needing more than 50 results must chain multiple calls or use the YouTube primitive's full 500-item set directly.
- Scaling path: Raise the cap in `cinatra/oas.json` inputs and update SKILL.md, but only after verifying the podcast primitive supports larger `latestCount` values.

## Dependencies at Risk

**No external npm dependencies declared:**
- Risk: Not applicable — `package.json` declares `"dependencies": []` (empty). The agent has no npm runtime dependencies to rot.
- Impact: Not applicable.
- Migration plan: Not applicable.

**Reusable release workflow pinned to `@main`:**
- Risk: `cinatra-ai/.github/.github/workflows/reusable-extension-release.yml@main` is consumed at HEAD. A breaking change to the reusable workflow will take effect on the next release without a version pin.
- Impact: Release pipeline could break unexpectedly.
- Migration plan: Pin to a tag or SHA once the reusable workflow is stable.

## Missing Critical Features

**No integration / smoke tests:**
- Problem: The repo ships no tests at all (no `test` script in `package.json`, no test files). The CI `pnpm test --if-present` step exits 0 with no output for standalone repos.
- Blocks: Regressions in SKILL.md prompt logic, OAS shape changes, and URL classification rules are undetectable without manual testing.

**No output schema validation:**
- Problem: The OAS `episodes` output is typed as `array of object` with no item schema. There is no structural contract on episode fields (`id`, `title`, `link`, `mediaUrl`, `publishedAt`, etc.) enforced at the platform boundary.
- Blocks: Downstream agents (e.g., `@cinatra-ai/media-transcript-agent`) that consume `mediaUrl` can silently receive a wrong field name or null value.

## Test Coverage Gaps

**URL classification edge cases not tested:**
- What's not tested: Non-ASCII hostnames, redirect URLs, youtube.com/live/* paths, music.youtube.com channel paths, and `source` override behavior when combined with an invalid URL.
- Files: `skills/media-feed-lister-agent/SKILL.md`
- Risk: An untested URL variant that should return `UNSUPPORTED_URL` may instead trigger a primitive call and receive a confusing primitive-level error.
- Priority: Medium

**Error envelope shape not tested:**
- What's not tested: That all 10 primitive error codes listed in SKILL.md Step 4 are correctly surfaced in `failureCode` without retry.
- Files: `skills/media-feed-lister-agent/SKILL.md`, `cinatra/oas.json`
- Risk: LLM could omit `failureCode`, emit a non-empty `episodes` array on error, or retry when SKILL.md says not to.
- Priority: High

**YouTube `latestCount` truncation not tested:**
- What's not tested: That the LLM correctly truncates the YouTube primitive's episode list to `latestCount` entries and does not reorder them.
- Files: `skills/media-feed-lister-agent/SKILL.md`
- Risk: Silent over-delivery of episodes or reordering breaks callers that depend on DESC order.
- Priority: Medium

---

*Concerns audit: 2026-06-09*
