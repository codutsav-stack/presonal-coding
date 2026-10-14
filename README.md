# DevVault — Your Personal Developer Universe

DevVault brings projects, coding practice, study notes, useful resources, and learning goals into one private developer workspace. Its dark-first interface combines a deliberately quiet charcoal palette, violet accents, custom CSS illustrations, and restrained motion. The dashboard starts empty: every count and progress indicator is calculated from your own saved records, not demo fixtures.

## Technologies

React 19, Vite, TypeScript, React Router, Tailwind CSS 4, GSAP with ScrollTrigger, Motion for React, Lucide, React Hook Form, Zod, Radix accessible dialogs and menus, Sonner, React Markdown, and Prism power the interface. Netlify Functions, Netlify Identity, and Netlify Database with Drizzle provide the authenticated backend.

This project uses the Netlify-native database and authentication required by its deployment environment instead of Supabase. Drizzle's beta release is pinned because the Netlify adapter is only available on that release line. No privileged credentials are bundled into the frontend.

## Running locally

Use Node.js 22.12 or later and pnpm.

```sh
pnpm install
netlify link
netlify dev --port 8889
```

The Netlify CLI supplies the functions, Identity endpoint, and database connection. Follow the CLI prompts to link the checkout to your Netlify site. `.env.example` documents the optional public site identifier; neither a Supabase project nor a manually copied database connection string is needed.

Running only `pnpm dev` displays the interface but does **not** provide the backend. Guest browsing starts with an empty workspace, allows drafting forms, and requires sign-in to save. Drafts and guest appearance preferences are session-only React state and do not survive refresh. There is deliberately no local-storage persistence fallback or pretend authentication.

## Production setup

The included `netlify.toml` publishes the Vite app and routes frontend deep links to its entry document. Netlify Identity's activation script was run for this site. Account registration uses email confirmation by default; create an account, confirm the email, then sign in. Configure registration and email delivery in the site's Identity settings as appropriate for your deployment.

The database is automatically provisioned on its first platform connection. The reproducible schema lives in `db/schema.ts`, with the generated migration in `netlify/database/migrations`. Netlify applies migrations during deployment. The initial migration also enables and forces owner-only Row Level Security. Every database request authenticates the user, scopes its queries by owner, and sets the policy's owner context inside a transaction. Never set that context from an unverified browser-supplied identity.

No live cloud CRUD, authentication, or persistence verification was performed during this implementation. Confirm the deployment's migration result and complete the checklist below before treating the installation as verified.

## What you can do

- Create, edit, delete, duplicate, pin, and archive projects. Add stack information, cover URLs, project links, milestones, and personal notes. Search, filter, sort, and switch between grid and list views.
- Collect DSA questions with topics, difficulty, sources, problem URLs, test cases, complexity, C++ code, attempts, confidence, and review dates. Mark solutions yourself, bookmark questions, and use the review queue.
- Write Markdown notes with preserved formatting, syntax-highlighted code, folders, tags, and nested parent notes. Save resources by category with URLs and descriptions.
- Track tasks, linked projects, due dates, priorities, learning goals, and actual topic progress. Weekly completions use saved completion timestamps. The activity chart summarizes your 30 most recent activity events, not an inferred productivity or study-streak metric.
- Search every collection through the command palette using Ctrl+K or Cmd+K, with arrow-key navigation and Enter to open a result.
- Customize light, dark, or system appearance, reduced motion, default collection view, and weekly targets. Signed-in preferences persist in the database.
- Export records as JSON and import a validated version-1 export after confirmation. Imports only add new records and never replace existing data. Export files may contain your private content; keep them safe. Imports currently clear parent-note and project relationships to avoid unsafe references; reconnect those links after import. Imports are limited to 1,000 items and 2 MB.

Notes and projects support private attachments through Netlify Blobs, with owner-scoped metadata and Row Level Security in Netlify Database. Upload PDF, Markdown, text, PNG, JPEG, or WebP files up to 3 MB each, with a maximum of 20 files per item. Downloads pass through an authenticated function; there are no public file URLs. Project covers continue to use validated external image URLs.

Attachments are not included in JSON exports, imports, or item duplication. Download any files you need separately. Remove an item's attachments from its detail page before deleting the item; this restriction prevents orphaning its uploaded files. Blob deletion and metadata deletion span separate services, so a failed deletion can require a retry.

## Architecture

`src/pages` contains the dashboard, reusable collection pages, detail readers, learning view, and settings. `src/components` contains the application shell, editors, search palette, and accessible UI primitives. `src/hooks/useWorkspace.tsx` coordinates authenticated state and mutations. `src/services` handles HTTP access, while shared validation lives in `src/lib/validation.ts`. The backend's typed record model uses an enum discriminator for five entity types, indexed searchable fields, JSONB detail fields, normalized tag relationships, self-referencing project/parent links, profiles, and activity records. This keeps shared CRUD consistent without copying it into five separate APIs.

For a future database change, update the schema and generate a new migration:

```sh
pnpm exec drizzle-kit generate --name add_descriptive_change
```

Owner policies and the unique owner/tag-name index in the initial SQL migration are intentional custom SQL; preserve them when evolving the schema. The separate attachment migration adds its own owner-only policy without changing the original migration history. New private tables require equivalent policies. Every migration directory must contain its generated `migration.sql`; an empty migration directory prevents deployment validation.

## Verification checklist

Builds and local test/dev-server commands were intentionally not run in this environment; the deployment pipeline performs the build. After deployment:

1. Register, confirm your email, sign in, and test password recovery and logout.
2. Add and edit an item in each collection, reload the page, and verify it persisted.
3. Use two accounts to confirm private records and search results do not cross accounts. Verify unauthenticated API calls return 401.
4. Test pinning, project archive/restore, duplication, deletion confirmation, filters, sorting, pagination, and all detail routes.
5. Save and reopen a Markdown note and a C++ solution; verify formatting and code-copy behavior.
6. Mark a task complete and a question solved, then check actual dashboard and learning counts.
7. Export/import a small workspace and confirm imports are additive. Test malformed imports, invalid links, and invalid form values.
8. Test mobile navigation, keyboard dialogs and command search, theme switching, and both system and account reduced-motion preferences.
9. Upload and download attachments, reload to confirm persistence, reject oversized or unsupported files, and verify that a second account cannot list, download, or delete them. Remove all attachments before deleting the parent item.
10. Check type-filtered command search, nested note folders, local-date review queues, and recovery controls for unavailable APIs or failed page loads.
