# frontend/ — Presentation layer (USER → frontend)

This folder is the physical entry point for all frontend work. Every entry
here is a real filesystem link to the canonical file, so there is **one copy**
of each file — editing `frontend/src/...` edits the same bytes as `src/...`.

| Path                        | Contains                                   |
| --------------------------- | ------------------------------------------ |
| `frontend/src/`             | React app: pages, components, hooks, libs  |
| `frontend/public/`          | Static assets, robots.txt, sitemap.xml     |
| `frontend/index.html`       | HTML shell + sitewide head metadata        |
| `frontend/vite.config.ts`   | Build/dev-server config                    |
| `frontend/tailwind.config.ts` | Design tokens and theme                  |

## Why the files also appear at the repo root

The hosting pipeline builds and previews from the repository root, so
`index.html`, `package.json` and `vite.config.ts` must physically exist there.
The links above give the folder separation without a second copy and without
breaking preview, publish, or the custom domain.

The frontend never talks to the database directly for privileged work — it
calls the backend layer (`../backend`) via the generated client and edge
function invocations.
