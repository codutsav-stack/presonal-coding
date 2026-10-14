# DevVault architecture

DevVault is a React + Vite + TypeScript single-page application deployed to Netlify. React Router owns frontend routes; this project does not use the TanStack router included in its original scaffold.

## Key directories

- `src/pages/`: dashboard, reusable typed collection view, lazy-loaded item reader, learning progress, and settings.
- `src/components/layout/`: persistent sidebar and header with mobile navigation, breadcrumbs, search, quick actions, and account menus.
- `src/components/ui/`: accessible Radix-based dialogs, menus, and shared empty states.
- `src/components/`: entity editor, global command palette, authentication, cards, and Markdown/code rendering.
- `src/hooks/useWorkspace.tsx`: authentication, remote data lifecycle, owner-isolated state, mutations, preferences, and OS motion/theme preferences.
- `src/services/workspace.ts`: authenticated same-origin HTTP operations and paginated loading.
- `src/types/` and `src/lib/validation.ts`: shared entity models, categories, statuses, and Zod input/import validation used by frontend and backend.
- `src/animations/`: component-scoped GSAP/ScrollTrigger orchestration with cleanup.
- `src/styles.css`, `src/styles/features.css`, `src/styles/responsive.css`: tokens/layout, feature styling, and responsive overrides, imported in this order.
- `db/schema.ts`, `db/index.ts`: Drizzle models and lazily created Netlify Database client.
- `netlify/functions/workspace.mts`: authenticated, validated CRUD endpoint with transactional owner context.
- `netlify/functions/attachments.mts`: owner-authorized attachment listing, upload, download, and deletion; metadata lives in Database and binary contents live in private Netlify Blobs.
- `src/components/AttachmentPanel.tsx`, `src/services/attachments.ts`, `src/lib/files.ts`: attachment UI, authenticated HTTP operations, and shared file constraints.
- `netlify/database/migrations/`: generated, reproducible deployment migrations.

## Data and security decisions

Five entity kinds share a PostgreSQL `entries` table with an enum discriminator, searchable columns, bounded JSONB detail fields, owner foreign key, timestamps, and self-referencing project/parent relationships. Tags are also normalized into owner-scoped `tags` and `entry_tags`. Activities and preferences persist in their own relational models.

The deployment requirements mandate Netlify Database and Netlify Identity, not Supabase or another external persistence provider. Use `@netlify/database` with the pinned `drizzle-orm@beta` Netlify adapter and `@netlify/identity`. Identity's activation script has been run. Local backend work requires `netlify dev --port 8889` and a linked site.

Every function verifies the authenticated Identity user. Never accept ownership from the request body. Set `app.user_id` using `set_config(..., true)` inside the same database transaction as the operation. Keep explicit owner predicates as defense in depth. The initial migration enables and forces owner-only RLS for every private table; its policies and unique owner/tag-name index are custom SQL not fully represented in Drizzle snapshots. Preserve them and add policies for new private tables. Never expose database URLs or privileged credentials to Vite.

Guest views contain no records. Forms can be drafted, but saving requires sign-in. Do not add a silent browser-storage fallback, fixtures, fake metrics, or a shared demo account. React state is only a cache of actual remote records, except explicitly transient guest UI preferences and drafts. Clear private state and private editors when accounts change.

Attachments belong to notes or projects only. Enforce the shared 3 MB file limit, 20-file item limit, allowed extensions and MIME checks on the server as well as in the UI. Never return blob keys or public blob URLs. Parent deletion is restricted until attachments are removed. JSON import/export and duplication do not include attachment metadata or binary content. Blob and database operations are not a distributed transaction; upload failures attempt compensating blob deletion, and failed deletions may need retrying. Preserve the separate attachment migration and its owner-only RLS policy.

Workspace loads use session and request versions so stale responses cannot overwrite a newer account or refresh. Attachment list requests and downloads are cancelled on scope changes. Use `isReviewDue` and `localDateKey` from `src/lib/utils.ts` for calendar-date review calculations rather than comparing against UTC dates.

Imports are validated, bounded to 1,000 records and 2 MB, confirmed, transactional, and additive. They currently clear foreign links to prevent unsafe cross-account references. Do not implement destructive replacement without an explicit user decision.

## Conventions

Keep reusable UI, validation, services, and backend concerns separated. Use typed models, descriptive names, and scoped edits. Validate external URLs as HTTP(S) and use `noopener noreferrer` for new tabs. Render Markdown without raw HTML. Accessibility depends on semantic labels, visible focus, Radix focus management, and OS reduced-motion support.

GSAP handles dashboard hero and section reveals. Motion handles cards, dialogs, and layout interaction. Do not animate the same property on the same element with both libraries. Always revert GSAP contexts and clean up listeners. Do not add scroll hijacking.

Database changes require a new migration generated with `pnpm exec drizzle-kit generate --name descriptive_change`. Never rewrite an already-applied migration. The first migration was customized only while the database was fresh and unapplied.

## Validation and status

The initial implementation did not run builds, local servers, type checking, or tests, as the platform's build pipeline owns validation in this environment. See `README.md` for an explicit post-deployment checklist covering authentication, CRUD persistence, ownership, imports, search, theme, mobile navigation, and reduced motion. Do not claim live backend verification unless it has actually been performed.
