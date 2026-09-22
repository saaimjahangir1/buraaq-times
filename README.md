# Buraaq Times — Public Website (Frontend Slice)

A working Next.js 14 (App Router) + TypeScript + Tailwind build of the Buraaq
Times public website: the "Liquid Glass" design language, a real AI-backed
reading assistant, a Three.js ambient layer, GSAP/Lenis-driven motion, and
production SEO plumbing.

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY to enable the AI features
npm run dev
```

Then open http://localhost:3000. Requires internet access on first build
(Google Fonts are fetched at build time).

Without an `ANTHROPIC_API_KEY`, everything on the site still works except the
three AI-backed panels (Vocabulary, Summary, Further Reading) — those show a
friendly "AI is not configured" message instead of crashing.

## What's implemented

### Design & motion
- Dual light/dark theme, liquid-glass surfaces, aurora mesh backgrounds,
  Plus Jakarta Sans / Inter / IBM Plex Mono type system. Persists via
  `localStorage`, switches instantly, no reload (`app/providers.tsx`).
- **Three.js ambient layer** (`components/AmbientScene.tsx`, mounted via a
  client-only dynamic import in `AmbientSceneLoader.tsx`) — a slowly
  rotating particle field, three floating translucent glass icosahedrons,
  and a distorted gradient-mesh sphere, all sitting behind the page content.
  Automatically disabled when the OS-level "reduce motion" preference is on.
- **Lenis smooth scroll + GSAP**, wired together in `components/SmoothScroll.tsx`
  (Lenis drives the scroll feel; GSAP's ticker drives Lenis's RAF loop; GSAP
  ScrollTrigger stays in sync with Lenis's scroll events). `Hero.tsx` uses a
  GSAP timeline for its entrance stagger and a `ScrollTrigger`-scrubbed
  parallax on the hero image; `Ticker.tsx` uses a GSAP tween (pauses on
  hover) instead of a CSS keyframe. Framer Motion still handles the
  micro-interactions (card tilt, theme toggle, reveals, mouse-follow glow).

### Pages
- Homepage — animated glass News/Articles switch, hero, ticker, latest
  grid, per-category sections, trending rail, editor's picks, a
  recommendation rail, newsletter.
- News & Article index pages (`/news`, `/articles`) with category filters.
- **Global Search** (`/search`) — a query box with instant, live-filtered
  suggestions as you type, plus a filter panel for content type, category,
  author, tags, and date range (past week / past month / any time). All
  client-side over the mock dataset — see "swap for real infra" below for
  wiring it to Meilisearch/Elasticsearch.
- Single post reading page (`app/news/[slug]`, `app/articles/[slug]`, shared
  via `components/PostReader.tsx`) — hero, meta bar, reading progress bar,
  sticky table of contents, share/save/like, tags, previous/next, comments,
  related posts.
- About Us & Contact — timeline, mission/vision, team, values, animated
  stats, contact form, embedded map, FAQ accordion.

### Floating Reading Assistant — now genuinely AI-backed
Only appears on single post pages, drifts with scroll near the upper-right.
- **Auto Scroll, Focus Mode, Listen Mode, Reading Preferences** — real,
  client-side, no backend needed.
- **AI Vocabulary Assistant** (`lib/vocab.ts` + `components/DifficultWord.tsx`)
  — a heuristic dynamically flags long/uncommon words in *any* body text
  (not a fixed 5-word list). Hovering or tapping one calls
  `POST /api/vocab`, which asks Claude for the pronunciation, meaning,
  an example sentence, and synonyms — with per-word caching so repeats
  don't re-call the API.
- **AI Summary** (`POST /api/summary`) — quick / detailed / bullet summaries
  generated live from the actual post title + body by Claude, shown in the
  assistant's Summary tab.
- **Listen Mode** reads the AI-generated summary aloud via the browser's
  real `SpeechSynthesis` API.
- **"Explore Further"** (`components/FurtherReading.tsx`,
  `POST /api/insights`) replaces the old static references list. It asks
  Claude for related angles and open questions the story raises —
  deliberately *not* fabricated citation URLs or source names, since
  inventing fake-looking references for placeholder content would be
  misleading. Wire this to your real sourcing/fact-check pipeline in
  production.

All three routes live in `app/api/*/route.ts` and share
`lib/anthropic.ts`, a small server-only helper that calls the Anthropic
Messages API and parses a strict-JSON response. Swap the model via
`ANTHROPIC_MODEL` in `.env.local`.

### SEO
- `generateMetadata()` on every post page — title, description, canonical
  URL, Open Graph (type=article, image, published/modified time, author,
  section, tags), Twitter card. Shared logic in `lib/seo.ts`.
- **JSON-LD structured data** (`NewsArticle`/`Article` schema) injected
  server-side on every post page.
- `app/sitemap.ts` — dynamic sitemap covering every static page and every
  post, served at `/sitemap.xml`.
- `app/robots.ts` — `/robots.txt`, disallows `/api/`, points at the sitemap.
- `app/opengraph-image.tsx` — a generated branded OG card for the homepage
  (via `next/og`); post pages use their real hero photo as the OG image
  instead of a generated card, which reads better when shared.
- Set `NEXT_PUBLIC_SITE_URL` in `.env.local` before deploying — it's used
  to build every absolute canonical/OG URL.

## What's mocked or stubbed

- All content in `lib/data.ts` is placeholder copy — swap in a real CMS/API.
- Search is fully functional but runs client-side over the in-memory mock
  dataset; swap `app/search/page.tsx`'s filtering logic for calls to
  Meilisearch/Elasticsearch once there's a real content index.
- No backend, database, or auth — this is the public-facing frontend only.

## Not built yet (from the full brief)

- The entire Editorial CMS / dashboard: login, roles (Admin / News Editor /
  Article Editor), registration + admin approval, rich text editor, AI SEO
  Assistant, media library, comment moderation, analytics dashboard.
- Backend services: NestJS/Express API, PostgreSQL + Prisma, Redis caching,
  Meilisearch/Elasticsearch, S3/Cloudinary storage, Docker/CI/CD.

## Stack actually used

Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, GSAP +
ScrollTrigger, Lenis, Three.js (`@react-three/fiber` + `@react-three/drei`),
lucide-react, Anthropic API (server-side only, via `fetch`).

---

# Editorial CMS

A real, working CMS at `/cms`, built as its own root layout (no public nav,
no 3D scene) via Next.js's multiple-root-layouts pattern — the public site
lives under `app/(site)/`, the CMS under `app/cms/`, both sharing
`app/globals.css` and one `tailwind.config.ts`.

## Setup

```bash
npm install
cp .env.example .env.local        # set JWT_SECRET, ANTHROPIC_API_KEY, etc.
npx prisma db push                # creates prisma/dev.db (SQLite, zero setup)
npm run db:seed                   # creates an admin account + starter categories
npm run dev
```

The seed script prints the admin login (default `admin@buraaqtimes.example` /
`ChangeMe123!` unless you set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
Sign in at **`/cms/login`**. Editors can self-register at `/cms/register`,
but need that admin to approve them at `/cms/users` before they can publish.

> **A note on verifying this part:** the sandbox this was built in blocks
> `binaries.prisma.sh` (Prisma's engine-binary CDN isn't on its network
> allowlist), so I could type-check every CMS file but could **not** run
> `prisma generate` / `db push` / a full `next build` against real generated
> Prisma types here. I reviewed every query against the schema by hand, but
> treat this half as "compiles cleanly, not build-verified" until you run
> `npm install` — which will work fine with normal internet access — and
> report back if anything breaks.

## What's implemented

### Auth & roles
- Email/password auth with bcrypt hashing, JWT sessions in an httpOnly
  cookie (`lib/auth.ts`, `app/api/cms/auth/*`).
- Three roles — **Admin**, **News Editor**, **Article Editor** — enforced
  both in the UI (`components/cms/CmsShell.tsx` filters nav by role) and on
  every API route (`lib/cms-guard.ts`). A News Editor's API calls for
  Article content (and vice versa) are rejected server-side, not just
  hidden client-side.
- **Registration + admin approval**: new accounts land as `PENDING` and see
  a gate screen instead of the dashboard until an admin approves them at
  `/cms/users` (`app/cms/(dashboard)/layout.tsx`).
- Non-admins can only edit/delete their own posts; admins can touch
  anything. Comment moderation follows the same rule.

### Content management
- Full News/Article CRUD (`app/api/cms/posts/*`) — create, edit, delete,
  save draft, publish, schedule (stores `scheduledAt`; you'd add a cron/
  queue worker to flip `SCHEDULED → PUBLISHED` at that time in production),
  archive.
- **Rich text editor** (`components/cms/PostEditor.tsx` +
  `EditorToolbar.tsx`) built on Tiptap: headings, bold/italic/underline/
  strike, highlight, lists, blockquote, code block, tables, text align,
  links, inline images, undo/redo, live word count.
- **Autosave** — while a draft, edits PATCH to the server ~2.5s after you
  stop typing.
- **Version history** — every save writes a `PostRevision` snapshot;
  viewable per-post via the History button.
- **Inline & featured images** through a real media library
  (`components/cms/MediaPicker.tsx`) — upload or pick an existing image for
  the featured slot or inline in the body.
- Categories (admin-managed) and tags (free-entry with autocomplete from
  existing tags).

### AI SEO Assistant — real model calls
`components/cms/SeoPanel.tsx` + `app/api/cms/seo-assistant/route.ts` sends
the title/summary/body to Claude and gets back, all editable before
publish: SEO title, meta description, focus + secondary keywords, tags, OG
description, Twitter description, slug suggestion, readability/SEO/content-
quality scores, heading-optimization feedback, keyword-density note,
content-length suggestion, internal-linking suggestions, image alt-text
suggestion, schema.org type suggestion, and a duplicate-content flag.

### AI Writing Assistance — also real
`components/cms/WritingPanel.tsx` + `app/api/cms/writing-assistant/route.ts`
reviews the draft for grammar/clarity notes, tone feedback, three
alternative headlines (click to apply), a featured-image prompt idea, and
fact-check reminders (it flags *which* claims are worth double-checking —
it deliberately does not assert what the "correct" facts are, to avoid
fabricating corrections).

### Media, users, comments
- **Media Library** (`/cms/media`) — bulk upload, copy-URL, stored under
  `public/uploads/` via `app/api/cms/media/route.ts`. That's a dev-friendly
  default, not production storage — see "swap for real infra" below.
- **User management** (`/cms/users`, admin only) — approve/reject accounts,
  change roles.
- **Comment moderation** (`/cms/comments`) — approve/reject/mark spam/
  delete. Admins see all comments; editors see comments on their own posts.
  Note: the public site's comment box (`PostReader.tsx`) still only holds
  comments in local component state — there's no public "submit comment"
  API yet, so this moderation queue has nothing to moderate until that's
  wired up. Documented as a next step, not silently glossed over.

## What's mocked, stubbed, or intentionally not built

- **The public site still reads from `lib/data.ts` mock data, not this
  database.** Connecting them — replacing the public site's static POSTS
  array with real queries against `prisma.post.findMany({ status:
  "PUBLISHED" })` — is the natural next step and hasn't been done in this
  pass, to keep this already-large change bounded.
- **Media storage is local disk** (`public/uploads/`), which doesn't work
  on read-only/serverless hosts (e.g. Vercel). Swap `app/api/cms/media/
  route.ts` for an S3/Cloudinary SDK call when you're ready to deploy.
- **Scheduled publishing** stores the timestamp but nothing flips the
  status automatically yet — add a cron job or queue worker that finds
  `SCHEDULED` posts past their `scheduledAt` and sets them `PUBLISHED`.
- **Not built**: 2FA, email verification, "forgot password" flow, a
  persisted notifications system (draft reminders / publish confirmations /
  SEO alerts), the analytics dashboard (views/bounce-rate/traffic-source/
  author-performance — the overview page only shows post-count stats),
  audit logs, spam auto-detection on comments (moderation is manual),
  duplicate-content detection against other real posts (the AI SEO
  Assistant's `duplicateContentNote` only reasons about the single draft,
  not a real corpus comparison).
- **Not built**: rate limiting and CSRF protection on the API routes.
  Sessions are httpOnly + `sameSite: lax`, which covers the common CSRF
  case for cookie auth, but there's no explicit CSRF token and no
  rate-limiter (add one — e.g. `@upstash/ratelimit` — before exposing this
  publicly).

## Stack added for the CMS

Prisma 5 (SQLite by default, Postgres-ready), bcryptjs, jose (JWT),
Tiptap 2, zod, slugify, Anthropic API (server-side, same pattern as the
public site's reading assistant).

---

# Public site ↔ database integration (latest round)

The public site now reads real content from the CMS database instead of
mock fixtures, plus several other gaps from the CMS section above are closed.

## What changed

- **`lib/public-data.ts`** — server-only queries (`getPublishedPosts`,
  `getPublicPost`, `getApprovedComments`) that adapt real Prisma rows to
  the exact `Post` shape the UI components already expected, so `Hero`,
  `PostCard`, `CategorySection`, `PostRail`, `PostReader`, etc. needed
  **no changes** — only the pages that fetch data changed.
- **Home, News/Articles index, and Search** are now async Server
  Components that fetch real data and pass it to client components
  (`HomeClient.tsx`, `PostIndex.tsx`, `SearchClient.tsx`) for the same
  instant, no-reload interactivity as before. Fixed a latent
  `Math.random()` SSR/hydration-mismatch bug in the "Recommended" rail
  while moving it.
- **Single post pages** query the DB directly with `revalidate = 60`
  (ISR) instead of static generation — new CMS posts show up within a
  minute without a rebuild.
- **Scheduled publishing now actually works**, without a cron job: the
  public read query treats a `SCHEDULED` post as visible once its
  `scheduledAt` has passed (`publicWhere()` in `lib/public-data.ts`).
- **Homepage curation** — `featured` / `trending` / `editorsPick` are now
  real boolean columns on `Post`, toggleable from the post editor's
  sidebar, with a "most recent post" fallback so a fresh install's
  homepage never looks broken before an editor sets any flags.
- **Comments are now real, end to end**: the public comment form
  (`PostReader.tsx`) posts to `/api/comments`, lands as `PENDING`, and
  shows up in the CMS's `/cms/comments` moderation queue (previously
  empty because nothing fed it). Once approved there, it appears in
  `getApprovedComments()` on the next page load.
- **Real view counts** — `/api/track-view` increments `Post.views` on
  every public post-page load; the CMS Analytics page and post-editor
  sidebar reflect actual traffic, not placeholder numbers.
- **New CMS Analytics page** (`/cms/analytics`) — total views, comment
  count, published count, most-read posts, posts-by-category, all from
  real queries. Scoped to "your own posts" for editors, site-wide for
  admins.
- **Best-effort rate limiting** (`lib/rate-limit.ts`, in-memory) added to
  login, registration, and public comment submission.
- `app/sitemap.ts` now queries the database instead of the mock array.
- Fixed 5 ESLint errors (`react/no-unescaped-entities`) that would have
  failed `next build` under Next's default lint-on-build behavior — worth
  knowing since it means the project **is** wired to lint-check on build.

## Documented trade-off (not silently dropped)

The public reading page renders **plain-text paragraphs** extracted from
the CMS's rich HTML (`lib/content-format.ts`'s `htmlToParagraphs`), not the
HTML itself. This is deliberate: the AI Vocabulary Assistant, section-based
table of contents, and the AI Summary/Insights panels are all built around
`Post.body: string[]` of plain paragraphs, and rebuilding those around raw
HTML (with a DOM-walk to re-inject vocabulary popovers into rendered rich
text) is real work I didn't want to ship untested. The practical effect:
**rich inline formatting from the Tiptap editor — bold, links, inline
images, tables — does not currently render on the public post page**, only
the plain text survives. The featured image and post metadata are
unaffected. This is the next thing worth fixing if you need real
formatting fidelity end to end.

## Still not done

- 2FA, email verification, "forgot password".
- A persisted notifications system (draft reminders, publish
  confirmations, comment alerts, SEO alerts) — none of these are stored or
  shown anywhere yet.
- CSRF tokens (session cookies are httpOnly + `sameSite: lax`, which
  covers the common case, but there's no explicit double-submit token).
- Distributed rate limiting (the current limiter is in-memory,
  single-instance only — fine for one dev server, not for multiple
  serverless instances).
- Comment spam auto-detection (moderation is fully manual).
- Rich HTML rendering on the public post page (see trade-off above).

---

# Security & account features (latest round)

All seven previously-missing items are now implemented for real.

## 2FA (TOTP)
Hand-rolled RFC 6238 implementation (`lib/totp.ts`, pure Node `crypto`, no
extra auth dependency). Enable it from `/cms/profile` — scans a real QR
code (generated client-side via the `qrcode` package) or shows the secret
for manual entry. Once enabled, login requires the password step *and* a
6-digit code, handled via a short-lived (5 min) signed "pending" token
(`lib/auth.ts`'s `createPending2FAToken`) so the password-verified-but-not-
yet-2FA'd state can't be mistaken for a real session. Disabling requires
re-entering your password.

## Email verification
`lib/mailer.ts` sends via SMTP if configured, otherwise logs to the console
— and in dev, the verification/reset link is also returned directly in the
API response so the whole flow is testable with zero email setup. The
dashboard layout gates access behind a "verify your email" screen with a
resend button until `emailVerified` is true. The seeded admin account is
pre-verified so it isn't locked out of its own dashboard.

## Forgot / reset password
`/cms/forgot-password` → `/cms/reset-password`, both backed by real API
routes. Deliberately returns the same generic response whether or not the
email exists, to avoid leaking which addresses are registered.

## Persisted notifications
A real `Notification` model, not a toast. The bell in `CmsShell` polls
every 30s, shows an unread badge, and marks-as-read on click or via "mark
all read." Currently created on: post published, low SEO score at publish
time (<50/100), new comment on your post, and account approved/rejected.
Draft reminders (e.g. "this draft hasn't been touched in 3 days") are not
implemented — that needs a scheduled job, which this project doesn't have
infrastructure for yet.

## CSRF protection
Real double-submit cookie pattern (`lib/csrf.ts`), not just relying on
`sameSite`. The session and CSRF cookies are set together on login; every
mutating CMS API route checks the header against the cookie via the shared
`requireApprovedUser(req)` guard. **The client-side sweep matters as much
as the server check**: every mutating `fetch()` call in the CMS UI was
switched to `lib/cms-fetch.ts`'s `cmsFetch()`, which reads the cookie and
attaches the header automatically — a raw `fetch()` to a guarded route will
now get a 403. Auth routes (login/register/forgot-password/etc.) are
intentionally exempt since there's no session to protect yet at that point.
Also closed a real pre-existing gap while in here: the AI SEO Assistant and
AI Writing Assistant routes had **no auth guard at all** before this round
— anyone could have hit them and spent your Anthropic credits.

## Distributed rate limiting
`lib/rate-limit.ts` uses Upstash Redis automatically when
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set (works
correctly across multiple serverless instances); falls back to the
in-memory limiter otherwise. Applied to login, registration, 2FA
verification, password reset, comment submission, and view tracking.

## Comment spam detection
`lib/spam.ts` — an always-on heuristic (link count, all-caps ratio,
blacklisted phrases, repeated characters, email-as-name) that runs on
every submission, plus an optional AI second opinion via Claude when
`ANTHROPIC_API_KEY` is set (raises the score, never lowers it; falls back
silently to heuristic-only if the AI call fails). Comments scoring ≥60 land
as `SPAM` automatically instead of `PENDING`; the score and reasoning are
visible to moderators in `/cms/comments`, which now has a dedicated SPAM
filter tab.

## Still not done
- Draft reminders (needs a scheduled job / cron — no infra for that here).
- SMS-based 2FA or backup/recovery codes for TOTP (if you lose your
  authenticator, an admin has to manually clear `totpSecret`/`totpEnabled`
  in the database — there's no self-service recovery flow).
- Notification email digests (notifications are in-app only, not also
  emailed).
- Public reading page still renders plain-text paragraphs, not rich HTML
  (documented in the previous round's section above — unchanged).
