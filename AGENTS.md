# Agent Instructions

## Summary of Changes

**ALWAYS** create or update a `changelog.md` file at the project root when making significant changes.

### When to Update Changelog

Update the changelog when you:
- Add new features or functionality
- Modify database schemas
- Change API endpoints or their behavior
- Update components with new props or behavior
- Add or modify utility functions
- Make breaking changes
- Fix significant bugs
- Update dependencies or configurations

### Changelog Format

Use the following format:

```markdown
# Changelog

## [YYYY-MM-DD] - Brief Title of Changes

### Section Name (e.g., Database, API, Components, Features)
- Description of change
- Another change with details

### Technical Details
- Implementation notes
- Migration requirements
```

### Required Sections

Include these sections when applicable:

1. **Database Schema Changes** - New tables, columns, indexes
2. **API Changes** - Endpoint modifications, new parameters, response changes
3. **Component Updates** - New components, prop changes, behavior updates
4. **Features** - New functionality descriptions
5. **Technical Details** - Implementation specifics, architecture decisions
6. **Migration Notes** - Steps needed to migrate existing data

### Example Entry

```markdown
## [2026-01-29] - Add Translation Support

### Database Schema Changes
- Added `description_translation` JSON column to videos table
- Added `conversation_summary_translation` to chat_conversations table

### API Changes
- `/api/videos` now accepts `locale` query parameter
- Returns localized fields based on user's locale

### Components
- Updated VideoList to display localized descriptions
- Added locale detection to ConversationCard

### Features
- Automatic translation generation for conversation summaries
- Dynamic locale support based on i18n configuration

### Migration Notes
- Run database migrations
- Regenerate existing conversation summaries to populate translations
```

### Guidelines

- Use today's date in YYYY-MM-DD format
- Group changes by category (Database, API, Components, etc.)
- Be specific about what changed and why
- Include breaking changes prominently
- Note any required migrations or setup steps
- Keep entries concise but informative

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
