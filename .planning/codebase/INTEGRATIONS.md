# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**YouTube:**
- YouTube Data API — lists videos from a YouTube channel
  - MCP Primitive: `media_feed_youtube_list({ channelUrl })`
  - Auth: API key; error code `MEDIA_FEED_YOUTUBE_KEY_MISSING` / `MEDIA_FEED_YOUTUBE_AUTH` returned on failure
  - Quota errors surface as `MEDIA_FEED_YOUTUBE_QUOTA`
  - Handled error codes: `MEDIA_FEED_YOUTUBE_KEY_MISSING`, `MEDIA_FEED_YOUTUBE_AUTH`, `MEDIA_FEED_YOUTUBE_QUOTA`, `MEDIA_FEED_YOUTUBE_FETCH`, `MEDIA_FEED_YOUTUBE_INVALID_URL`, `MEDIA_FEED_YOUTUBE_NO_CHANNEL`

**Podcast RSS/Atom Feeds:**
- Arbitrary podcast websites — agent discovers and reads RSS/Atom feeds from a website URL
  - MCP Primitive: `media_feed_podcast_list({ websiteUrl, filterMode?, dateFrom?, dateTo?, latestCount? })`
  - Auth: None (public feeds)
  - Handled error codes: `MEDIA_FEED_PODCAST_INVALID_URL`, `MEDIA_FEED_PODCAST_FETCH`, `MEDIA_FEED_PODCAST_NO_FEED`, `MEDIA_FEED_PODCAST_PARSE`

**Cinatra LLM Bridge:**
- Service: Cinatra platform `/api/llm-bridge`
  - URL template: `{{CINATRA_BASE_URL}}/api/llm-bridge` (env var injected by platform)
  - Preferred LLM: OpenAI `gpt-5.5` (declared in `cinatra/oas.json` under `metadata.cinatra.llm` and `cinatra_llm`)
  - The ApiNode POSTs to this endpoint; the bridge auto-discovers `SKILL.md` via `agent_id: "media-feed-lister-agent"`

## Data Storage

**Databases:**
- Not applicable — this is a stateless read-only agent; no database is used

**File Storage:**
- Not applicable

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None managed by this agent directly
- YouTube API key is managed by the Cinatra platform MCP layer (surfaced only as error codes to the agent)
- Platform authentication to `/api/llm-bridge` is handled by the Cinatra runtime via `CINATRA_BASE_URL` injection

## Monitoring & Observability

**Error Tracking:**
- Not configured in this repo; errors are returned as structured `failureCode` strings in the output JSON (see `skills/media-feed-lister-agent/SKILL.md` Step 4)

**Logs:**
- Not applicable — stateless, no persistent logging

## CI/CD & Deployment

**Hosting:**
- Cinatra Marketplace / `registry.cinatra.ai`

**CI Pipeline:**
- GitHub Actions
  - `ci.yml` — runs on push/PR to `main`; validates package shape, runs `extension-kind-gate.mjs` to scan `cinatra/oas.json` for retired primitives
  - `release.yml` — triggers on GitHub Release published; delegates to `cinatra-ai/.github/.github/workflows/reusable-extension-release.yml@main` for build-provenance attestation and marketplace submission
  - Requires org secret: `CINATRA_MARKETPLACE_VENDOR_TOKEN` (not stored in this repo)

## Environment Configuration

**Required env vars:**
- `CINATRA_BASE_URL` — base URL for the Cinatra platform API; injected at runtime by the Cinatra platform

**Secrets location:**
- No secrets stored in this repo
- `.env` file: not present

## Webhooks & Callbacks

**Incoming:**
- Not applicable

**Outgoing:**
- Not applicable — agent is a stateless leaf that calls MCP primitives synchronously and returns a single JSON object; no webhooks or async callbacks

## Compose Integration

**Downstream Agent:**
- `@cinatra-ai/media-transcript-agent` — intended consumer of this agent's `episodes` output (contains `mediaUrl` fields); composition is runtime-only, not a declared package dependency

---

*Integration audit: 2026-06-09*
