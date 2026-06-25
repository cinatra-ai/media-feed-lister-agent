# Media Feed Lister Agent

Point this agent at a YouTube channel URL or a podcast website and get back a clean list of its videos or episodes. It figures out whether the source is YouTube or a podcast (RSS / Atom feed), then returns titles, dates, and playable URLs you can hand off to a transcription or research workflow.

Install from the Cinatra marketplace as `@cinatra-ai/media-feed-lister-agent`. No credentials are required for podcast sources. For YouTube channels, the host environment must have a YouTube Data API key configured. Pass the channel URL as the `url` input; set `source` to `auto` (default) to let the agent classify YouTube vs podcast automatically, or force it to `youtube` or `podcast`. Control how many items are returned with `latestCount` (1-50, default 10). For podcasts you can also set `filterMode` to `date_range` and supply `dateFrom` / `dateTo` (YYYY-MM-DD) to narrow by publish date. The agent returns a JSON object with `sourceTitle`, `sourceUrl`, `detectedType`, `episodes` (each item always carries `id`, `title`, and `mediaUrl`; `link`, `publishedAt`, and `duration` are present when the source provides them), and `failureCode`. If something goes wrong the episodes array is empty and failureCode names the cause (for example `MEDIA_FEED_YOUTUBE_QUOTA` or `MEDIA_FEED_PODCAST_NO_FEED`); the agent never retries so the caller can decide how to recover. This agent composes with the media transcript agent: pipe the returned episodes array in to transcribe each item.

## Works with

- YouTube
- Podcast websites (RSS / Atom feeds)

## Capabilities

- List videos from any YouTube channel URL
- Discover and read podcast RSS / Atom feeds from a website URL
- Filter podcast episodes by the latest N or by a date range
- Hand the resulting episodes straight to a transcription agent
