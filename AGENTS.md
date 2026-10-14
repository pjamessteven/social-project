# Agent Instructions

## Security Best Practices

### Internationalization (i18n) - Avoiding XSS

**NEVER use `dangerouslySetInnerHTML` with i18n translations.** Instead, use next-intl's built-in rich text formatting.

#### Using `t.rich()` for HTML in Translations

When translation strings contain HTML tags (like `<b>`, `<em>`, `<a>`, etc.), use the `t.rich()` method with a component mapper:

```tsx
// ❌ WRONG - Never use dangerouslySetInnerHTML with translations
<p dangerouslySetInnerHTML={{ __html: t("description1") }} />

// ✅ CORRECT - Use t.rich() with a component mapper
<p>{t.rich("description1", { b: (chunks) => <b>{chunks}</b> })}</p>
```

#### Translation String Format

In your translation JSON files, use HTML-like tags without the angle brackets:

```json
{
  "description1": "Please consider making a donation to keep <b>detrans.ai</b> online."
}
```

#### Multiple Tags

For translations with multiple HTML tags, add each tag to the mapper:

```tsx
<p>
  {t.rich("description", {
    b: (chunks) => <b>{chunks}</b>,
    em: (chunks) => <em>{chunks}</em>,
    a: (chunks) => <a href="/link">{chunks}</a>,
  })}
</p>
```

#### Why This Matters

- **Security**: `dangerouslySetInnerHTML` exposes your app to XSS attacks if translations are compromised
- **React Best Practices**: Using React components maintains React's safety guarantees
- **next-intl Support**: Built-in rich text formatting is the idiomatic way to handle HTML in translations
- **Sanitization Not Needed**: React's component rendering automatically escapes dangerous content

## Sitemap Guidelines

### Excluded Routes

**NEVER include the following routes in the sitemap:**

- `/about` - Admin/internal information page
- `/topic` - Dynamic internal routing page
- `/login` - Authentication page

These routes should remain excluded from search engine indexing.

### Adding New Routes

When adding new public routes to the application:

1. Add the route to the `baseRoutes` array in `/app/sitemap.xml/route.ts`
2. Determine if the route should be localized (most content routes should be)
3. If localizing dynamic routes (like `/videos/:id`), update the exclusion logic in `generateLocalizedRoutes`
4. Test the sitemap output to verify URLs are generated correctly

### Study Pages (`/studies/[slug]`)

- Study detail URLs are `/{locale}/{localized-studies-base}/{headline-slug}` (e.g. `/fr/etudes/…`); slugs are per-locale rows in `study_slugs`, regenerated from the localized headline/title on every study write via `syncStudySlugs` (`app/lib/study-slugs.ts`). URL helpers are client-safe in `app/lib/study-urls.ts`.
- Do **not** link `/studies/{id}` in site UI or the sitemap — numeric ids are a legacy alias only. They stay functional (chat citations) and 308-redirect to the canonical slug URL.
- Sitemap study entries are built by the dedicated `studyRoutes` builder in `/app/sitemap.xml/route.ts` (true per-locale variants like `topicRoutes`); do not push them through `generateLocalizedRoutes`.

### Study Categories (`/studies/topic/[category]`, `/studies/method/[category]`)

- The `/studies` hub is a grid of curated categories (`study_categories`: kind `topic` | `method`, with JSON translations of name/description/slug), toggled by a "By topic / By methodology" tab (`?by=method`). Studies are assigned via `study_category_relations` — one method and usually 1–2 topics per study. Server helpers live in `app/lib/study-categories.ts`; client-safe URL helpers in `app/lib/study-category-urls.ts`.
- Category URLs are `/{locale}/{studies-base}/{topic|method word}/{localized-category-slug}` (e.g. `/fr/etudes/theme/bloqueurs-de-puberté`); other locales' slugs 308-redirect to the canonical one. Empty categories are noindex.
- Study cards use the short `card_summary` / `card_key_points` fields (falling back to `description` / `key_points`). Generate them with `scripts/backfill-study-cards.ts` (dry-run JSON, then `--apply`), and translate categories + cards with `scripts/generate-study-hub-translations.ts`.
- Sitemap entries come from the dedicated `studyCategoryRoutes` builder in `/app/sitemap.xml/route.ts`; do not push them through `generateLocalizedRoutes`.

### Story Pages (`/stories/[slug]`)

- Story URLs are `/{locale}/{localized-stories-base}/{id}-{title-slug}` (e.g. `/fr/histoires/3f2a9c1e-mastectomy-at-20`). The id is a salted username hash from `storyIdSql()` (`app/lib/story-id.ts`, secret `STORY_ID_SALT` — required in production, and changing it changes every story URL); **never put usernames in URLs, page output or API responses.** Only the id is used for lookup — any other slug 308-redirects to the canonical one. URL helpers are client-safe in `app/lib/story-urls.ts`; server lookups live in `app/lib/stories.ts`.
- Story text is usually English-only: locale variants without a translated summary canonicalize to the English URL, and only translated locales are listed in hreflang/sitemap.
- Story translations are JSON `{ locale: text }` columns, read by the story page, the spotlight cards (`/api/stories/spotlight?locale=`) and the reading dialog, each falling back to English: title → `detrans_user_display_names.display_name_translation`, summary/card excerpt → `detrans_users.experience_summary_translation`, full story → `detrans_users.experience_translation`. A locale counts as translated (hreflang/sitemap/self-canonical) once it has a summary translation. The URL slug always comes from the English `display_name`.
- Only "listed" stories (same rules as the `/stories` spotlight: confirmed detransition/desistance, not suspicious, enough detail) are indexed and emitted by the `storyRoutes` builder in `/app/sitemap.xml/route.ts`. Do not push them through `generateLocalizedRoutes`.

### Wiki Pages (`/topics/[...slug]` + `/topics` hub)

- Public wiki pages are **database-driven** (`pages` + `page_slugs` tables) and rendered by `app/[locale]/topics/[...slug]/page.tsx`. The public hub index lives at `app/[locale]/topics/page.tsx`. **Reading is public for all users; editing is admin-only** (agent write tools + `/api/pages`).
- Sitemap entries for **published** pages (plus the `/topics` hub) are generated by the dedicated `topicRoutes` builder in `/app/sitemap.xml/route.ts` as true per-locale variants (translated slug segments) with `x-default` hreflang; drafts are excluded automatically.
- Do **not** add `/topics` to `baseRoutes` — it is handled by the dedicated builder, and `generateLocalizedRoutes` must not double-localize it.
- Use `app/lib/pages.ts` for all page CRUD (agent tools, admin API `/api/pages`, future admin UI). Page content is sanitized in `app/lib/markdown.ts` before rendering, and JSON-LD must be embedded with `safeJsonLd` (`app/lib/seo.ts`) to escape closing script tags.

## Captcha Strategy

### Two captcha modes

The codebase has two captcha verification approaches:

**1. Count-based (chat, research, videos, studies, contact)**

- Uses `isCaptchaRequired()` from `app/lib/messageCounter.ts`
- Tracks request count per IP in Redis
- Requires captcha after 10 requests (count resets after captcha verification)
- Logged-in users bypass captcha entirely
- Used by: `/api/chat`, `/api/videos/submit`, `/api/studies`, `/api/contact`

### Frontend implementation

- `useCaptcha()` — Hook for captcha verification. Resets captcha requirement after verification.

### Shared utility

- `app/lib/captcha.ts` — `verifyCaptchaToken(token)` verifies hCaptcha tokens directly. Used by `/api/captcha/verify`.
- `/api/captcha/verify` — Also handles Redis/message count logic for count-based endpoints.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
