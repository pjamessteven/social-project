# Translation plan: stories, wiki pages, tags

Instructions for the translation agent (Sonnet). Read `AGENTS.md` first.

## Ground rules

- **Run against the LOCAL database.** Local is the source of truth for
  `detrans_users`, `detrans_user_display_names`, `detrans_tags` and `pages`.
  Prod is synced from local afterwards (see "Sync to prod"). Never write story,
  tag or page translations straight to prod.
- **Locales:** every code in `i18n/locales.ts` except `en` — 32 targets. The
  codes are the site's own, not ISO: `cz` (Czech), `no` (Norwegian Bokmål),
  `zh-cn` (Simplified Chinese), `zh-tw` (Traditional Chinese).
- **Storage format:** every `*_translation` column is a JSON object
  `{ "<locale>": "<text>" }`. Merge into the existing object and never drop
  existing keys. Omit `en`. Skip a locale that already has a non-empty value
  unless you're asked to retranslate.
- **Idempotent and resumable:** process in batches, commit after each batch,
  and make a rerun pick up only the missing `(row, locale)` pairs. Support
  `--dry-run` (print sample output, write nothing), `--limit N` and
  `--locales fr,de`.
- **Tone and terminology:** these are first-person accounts from
  detransitioners. Keep the narrator's voice, register and first person. Don't
  soften, sanitize, add caveats, or "correct" claims. Keep community terms
  readable for that audience, and reuse the vocabulary already in
  `messages/<locale>.json`. For example, German uses "Detransition" and
  "Detransitionierende", and French uses "détransition".
- **Keep structure:** preserve paragraph breaks (stories render with
  `white-space: pre-line`), Markdown in wiki content, numbers, ages, drug
  names and units. Translate nothing inside code spans or URLs.
- **Never put usernames in prompts, logs or output files.** Key work items by
  the story id (`storyIdSql()` in `app/lib/story-id.ts`) or by an internal
  row cursor.

## Phase 1: story titles (cheap, highest visibility)

- **Table:** `detrans_user_display_names` (4,175 rows, 0 translated)
- **Source:** `display_name`; **target:** `display_name_translation`
- Translate the **3,053 listed stories** first (same rules as the `/stories`
  spotlight; see `getListedStories()` in `app/lib/stories.ts`), then the rest.
- Titles are short headlines such as "Mastectomy at 20, $15,450 to get her
  voice back". Keep them headline-length, natural and not literal. Keep
  currency and numbers.
- Batch about 25 titles per request, returning JSON keyed by id.
- **Do not** change `display_name`: the URL slug comes from it.

## Phase 2: story summaries (makes a locale "translated")

- **Table:** `detrans_users`; **source:** `experience_summary` (average about
  740 characters); **target:** `experience_summary_translation`
- Same order as phase 1: listed stories first.
- This field drives the card excerpt, the story page summary and meta
  description, and SEO. Once a locale has a summary, that story's page in that
  locale becomes self-canonical and enters hreflang and the sitemap. A bad
  summary translation is therefore indexed, so spot-check before running every
  locale.
- Suggested rollout: run `fr, de, es, pt, it, nl` across all listed stories,
  review 20 random outputs per locale, then do the remaining locales.

## Phase 3: full stories (expensive, optional)

- **Table:** `detrans_users`; **source:** `experience` (average about 4,400
  characters, about 13M characters across listed stories); **target:**
  `experience_translation`
- This is roughly 6× the volume of phase 2 for every locale. Estimate the cost
  with `--dry-run` on 20 stories first. Suggested scope: the top 300 stories by
  upvotes (the spotlight's default order) in the 6 priority locales, then
  expand if worthwhile.
- `scripts/generate-user-translations.ts` already writes this column (plus the
  red-flags report), but it uses DeepSeek and its own locale list. Either adapt
  it (model, `locales` from `i18n/locales.ts`, listed-first ordering,
  summary-only and title-only modes) or write a new
  `scripts/generate-story-translations.ts` that covers phases 1–3.

## Phase 4: story tags (small)

- **Table:** `detrans_tags`; **source:** `name`; **target:**
  `name_translation`
- 112 tags, 44 translated. Fill in the missing locales with
  `scripts/generate-tag-translations.ts`. It already iterates the site
  locales, but its `languageNames` map lacks `cz`, `no`, `zh-cn` and `zh-tw`
  (prompts would fall back to the bare code), so fix that first. Tags are lower-case category labels; the page
  capitalizes them.

## Phase 5: wiki pages (titles and summaries first)

- **Table:** `pages` (103 published; 4 have translated titles, 2 have
  translated content)
- **Write through `updatePage(path, { translations })` in `app/lib/pages.ts`,
  not with raw SQL.** It merges `title`/`summary`/`content` translations and
  regenerates `page_slugs` from the translated `slug`.
- **5a:** for every published page, `title`, `summary` and `slug` per locale.
  Titles are SEO titles of 60 characters or fewer. The slug is the translated
  final path segment: lower-case, hyphenated, no accents for Latin scripts.
  Look at the existing `/topics` hub cards: the six root pages are the most
  visible.
- **5b (expensive):** `content`. Average about 32k characters of Markdown per
  page, 3.3M characters in total per locale. Do the six hub pages and their
  direct children in the priority locales first. Preserve Markdown structure,
  links, heading anchors and citations.

## Sync to prod

Prod owns other columns on these rows, so copy only the translation columns,
and only after the migrations exist there (0018 adds
`display_name_translation`):

1. On prod, back up the affected tables (`pg_dump -t ...`).
2. From local, export `(key, *_translation)` with `\copy ... to stdout` into
   a temporary table on prod.
3. Run
   `UPDATE target SET col = tmp.col FROM tmp WHERE target.key = tmp.key`
   in one transaction.
4. For pages, also sync `page_slugs` (delete and reinsert for the synced page
   ids).
5. Restart nothing. Translations are read per request, but `/api/features`
   caches live in Redis, and the spotlight has short HTTP cache headers.

## Verification

- `curl "localhost:3000/api/stories/spotlight?count=3&locale=fr"`: translated
  `name` and `excerpt`, English `slug`.
- `/fr/histoires/<slug>`: translated h1, `<title>` and summary, and a
  `hreflang="fr"` alternate.
- Sitemap: translated stories list their locale variants.
- `/fr/topics` (topics hub): translated card titles and summaries, and
  translated slugs in the links.
- Spot-check right-to-left locales (`ar`, `he`, `fa`) and CJK
  (`ja`, `ko`, `zh-cn`, `zh-tw`) in the browser.
