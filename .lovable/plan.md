## Goal
Move AI Visibility 35→95, Agent Readiness 25→95, AI Maturity 25→95 in 15 days, while publishing 45 quality articles/month with zero-plagiarism guardrails and approved-only scheduling.

## Current state (what already exists)
- `public/llms.txt`, `public/robots.txt`, `public/sitemap.xml` present.
- Scheduled publisher cron (`publish_scheduled_posts`) runs every 5 min, auto-approves & publishes on schedule.
- `seo-auto-rewrite` edge function + hourly cron sweeps posts with `originality_score < 85` and rewrites them; admin gets email on success/failure.
- Post publishing hook already calls auto-rewrite when originality < 85 before publish.
- `enforce_post_publish_approval` trigger blocks publishing of non-approved posts.

## What's missing to hit the targets

### A. AI Visibility (35 → 95)
Structured signals AI crawlers score on.
1. Add `/ai.txt` (AI training policy) + expand `/llms.txt` with a fuller Docs/Blog section auto-populated from published posts.
2. Add `/llms-full.txt` (long-form: title + excerpt + URL for every published post) generated at build time.
3. Add JSON-LD `Organization`, `WebSite`, `SearchAction` to `index.html`.
4. Ensure every article page emits `Article` + `BreadcrumbList` + `FAQPage` JSON-LD (already partial in `ArticleDetail.tsx` — verify and extend to book chapters).
5. Add `<meta name="ai-content-declaration">` and OpenGraph `article:author`/`article:published_time` on article pages.
6. Extend sitemap generator to include `/articles/<slug>` for every published post and `/books/<slug>` + chapters, with `<lastmod>` from `updated_at`.

### B. Agent Readiness (25 → 95)
Machine-readable endpoints AI agents call.
1. New edge function `agent-manifest` served at `/.well-known/ai-plugin.json` (via redirect from `public/.well-known/ai-plugin.json` static shell) describing the site, contact, and read endpoints.
2. New public read-only edge functions (no auth):
   - `agent-articles` — paginated JSON list of published posts (title, slug, excerpt, url, published_at, tags).
   - `agent-article` — single post by slug with full content + metadata.
   - `agent-books` — list of published books + chapters.
3. `openapi.json` static file describing the three endpoints, linked from the manifest.
4. Add `Access-Control-Allow-Origin: *` on all three so agents can fetch cross-origin.

### C. AI Maturity (25 → 95)
Content quality, provenance, and freshness signals.
1. Add `author`, `dateModified`, `wordCount`, `inLanguage`, `about` fields to Article JSON-LD.
2. Add per-article `E-E-A-T` block (author bio + last-reviewed date) rendered on `/articles/:slug`.
3. Nightly `content-freshness` cron: bump `updated_at` on any published post older than 30 days that still passes originality, and re-emit sitemap `lastmod`.
4. Tighten `seo-auto-rewrite` threshold from 85 → 92 (matches user's "0% plagiarism" ask; treat <92 originality as fail, rewrite up to 3 attempts, block publish on failure).
5. Add `originality_score` and `quality_passed` gate to `publish_scheduled_posts()` — if a scheduled post is <92 originality at publish time, trigger `seo-auto-rewrite` synchronously and only publish if it passes; otherwise defer 6 h and notify admin.

### D. 45 articles/month cadence (~1.5/day)
1. Extend `seo-daily-publisher` to plan and generate 2 articles/day, keeping only those that clear originality ≥ 92 and quality gate.
2. Backfill scheduler: script that picks approved drafts and schedules them every day at 06:00 IST (not alternate-day) to hit 45/month; alternate-day cadence you asked about last turn is superseded by this target — confirm below.
3. Weekly `content-planner` cron generates keyword ideas from `lsi_keywords` and queues drafts so the pipeline never runs dry.

### E. Monitoring
1. New admin card on the SEO Command page: "AI Readiness" showing daily scores from a `ai_readiness_scores` table populated by a new `ai-readiness-scan` cron (runs 03:00 IST daily), storing the three sub-scores and delta vs previous day.
2. Daily digest email to admin: scores, articles published, articles rewritten, articles blocked.

## Technical details

**New tables**
- `ai_readiness_scores(id, scored_at, ai_visibility, agent_readiness, ai_maturity, notes jsonb)` — RLS admin-only read; service_role write.

**New/edited edge functions**
- `agent-manifest`, `agent-articles`, `agent-article`, `agent-books` (public, `verify_jwt = false`, CORS `*`).
- `ai-readiness-scan` (cron, service_role).
- `content-freshness` (cron, service_role).
- `seo-auto-rewrite` — threshold bumped, attempts 2→3.
- `seo-daily-publisher` — output 2/day, hard gate on originality ≥ 92.
- `publish_scheduled_posts()` (DB fn) — pre-publish originality gate.

**Static files**
- `public/ai.txt`, `public/.well-known/ai-plugin.json`, `public/openapi.json`.
- `scripts/generate-sitemap.ts` — include all published posts/books with `lastmod`.
- `scripts/generate-llms.ts` — writes `public/llms.txt` and `public/llms-full.txt` from the DB at build/predev.

**Frontend**
- `src/pages/ArticleDetail.tsx` — extended JSON-LD + EEAT block.
- New admin card in `src/pages/admin/AdminSeoCommand.tsx` for readiness scores + digest link.

## Confirm before I build
1. **Cadence conflict**: last turn you asked for alternate-day publishing at 06:00 IST. 45/month needs ~1.5/day. Should I switch to daily-at-06:00 (with occasional 2/day) and un-schedule the alternate-day plan I just set?
2. **Author identity for EEAT/JSON-LD**: use "GyandootNova Editorial Team" or a real author name/bio you'll provide?
3. **Originality gate**: "0% plagiarism" literally isn't achievable (shlokas, common phrases). OK to interpret as `originality_score ≥ 92` with rewrite + block-on-fail? Or stricter (≥ 95)?
