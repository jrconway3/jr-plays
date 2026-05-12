# JR Plays

Personal WordPress multisite site for JaidynReiman — gaming content creator.

## Local Development

See [CLAUDE.md](CLAUDE.md) for full setup instructions.

```bash
npm run dev        # Docker (recommended)
npm run build      # Local XAMPP/PHP+MySQL
npm test           # Lint + unit tests (requires Docker)
```

## Theme

`wp-content/themes/jr-plays-theme/` — custom Timber/Twig theme with Vite + Dart Sass pipeline.

```bash
cd wp-content/themes/jr-plays-theme
npm run build:assets    # production build
npm run dev:assets      # watch mode
```

## Plugins

| Plugin | Purpose |
|---|---|
| `jr-content-core` | Post types (review, playlist), taxonomies (games, characters, platform, genre) |
| `jr-content-admin` | Admin UI |
| `jr-creator-media` | YouTube sync (Sprint 4), creator-specific features |
| `jr-legacy-content` | Legacy CPTs kept for data migration only |

## WordPress Options

See [wp-content/themes/jr-plays-theme/README.md](wp-content/themes/jr-plays-theme/README.md) for theme-managed options including `jr_featured_playlist_id` (homepage playlist embed).

## YouTube Integration (Sprint 4 — not yet connected)

> **TODO: fill this section out when Sprint 4 is complete.**

The architecture: **n8n runs nightly**, calls YouTube Data API v3, pushes data into WordPress. WordPress never calls YouTube directly — it only reads locally stored data.

### Setup checklist (for when Sprint 4 is built)

- [ ] Create a Google Cloud project at console.cloud.google.com
- [ ] Enable **YouTube Data API v3** (Library → search → Enable)
- [ ] Create an API key (Credentials → Create Credentials → API Key); restrict it to YouTube Data API v3
- [ ] Add the API key as a credential in **n8n** (not wp-config.php)
- [ ] Build the n8n nightly workflow: fetch playlists + latest videos → push to WordPress REST API
- [ ] Document the n8n workflow trigger URL and schedule here

**Free tier quota:** 10,000 units/day — a nightly sync uses ~5–10 units, well within limits.

### Triggering a manual sync

> Document here once the n8n workflow exists.

## Deployment

Production branch: `production`. GitHub Actions deploys WordPress core weekly (excludes `wp-content/`).

Required secrets: `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_PRIVATE_KEY`, `REMOTE_DIR`.
