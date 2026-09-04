# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## SSR / SEO verification (`scripts/verify-ssr-seo.sh`)

A curl-only checker that confirms brand-entity signals are present in the
**raw HTML** — the exact bytes Googlebot and social crawlers see, with no
JavaScript executed and no service worker involved. Use it after every
deploy to prove that `Organization` / `WebSite` / `BreadcrumbList` JSON-LD,
the About text, titles, meta descriptions, and canonical/og tags are all
baked into the server response.

### Run it

```sh
# Default: verifies https://gyandootnova.in
./scripts/verify-ssr-seo.sh

# Any origin (staging, preview, custom domain)
./scripts/verify-ssr-seo.sh https://id-preview--<project>.lovable.app
BASE=https://gyandootnova.in ./scripts/verify-ssr-seo.sh

# Also verify a real book/article detail page's breadcrumbs + brand link
BOOK_SLUG=bhagavad-gita-simplified \
ARTICLE_SLUG=who-wrote-bhagavad-gita \
  ./scripts/verify-ssr-seo.sh https://gyandootnova.in
```

Exit code is `0` when every check passes and non-zero otherwise, so it is
safe to run in CI (see `.github/workflows/post-deploy-seo.yml`).

The script always adds a per-request `?_nocache=…` query and sends
`Cache-Control: no-cache, no-store`, `Pragma: no-cache`, `Expires: 0`, and
`Service-Worker: script` headers so no Cloudflare / browser / corporate
proxy can serve a stale copy. Service workers themselves never run under
curl, so what you see is what crawlers see.

### If a check fails

1. **Just deployed?** Wait ~60s for the Lovable CDN to propagate, then
   re-run. Every run uses a fresh cache-buster, so a green result on the
   second attempt means the origin is correct and the first response
   came from an intermediate cache.
2. **Still failing?** Open the URL in an incognito window with DevTools →
   Network → "Disable cache", and view **View Source** (not the
   Elements panel, which shows the hydrated DOM). If the missing tag is
   absent from View Source too, the prerender step didn't emit it.
3. **Prerender miss** — check `scripts/prerender-and-seo-check.mjs` and
   the page component. Signals set via `useSEO({ jsonLd, ... })` must
   run during the Playwright prerender pass; if the component early-returns
   before `useSEO` runs (loading spinner, missing data), the tag never
   reaches `dist/**.html`. Move `useSEO` above any early return.
4. **CDN serving stale HTML** — trigger a fresh Publish from Lovable
   (Share → Publish → Update). Lovable manages the edge cache; there is
   no public purge API, so a re-publish is the supported way to force
   propagation.
5. **Missing on a detail slug only** — the slug may not exist, or the
   prerender route list in `scripts/prerender-and-seo-check.mjs` doesn't
   include it. Add it to the route list and re-deploy.


