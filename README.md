# DevVault — Your Personal Developer Universe

DevVault is a personal developer workspace and portfolio that organizes projects, coding practice (DSA solutions), study notes, curated resources, and learning goals in one secure application. It features a dark-first charcoal palette with violet accents, GSAP animations, Lucide icons, and motion interactions.

---

## Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, Tailwind CSS 4, GSAP + ScrollTrigger, Motion for React, Lucide Icons, React Hook Form, Zod, Radix UI Dialogs & Dropdown Menus, Sonner, React Markdown, PrismJS.
- **Authentication**: Supabase Auth (Email & Password, Session Persistence, Password Reset & Recovery).
- **Database & RBAC**: Supabase PostgreSQL with strict Row Level Security (RLS) policies, Profiles with role-based access control (`owner` and `user`), unified `entries` schema, and `activities` tracking.
- **Owner Command Center**: A protected administrative suite (`/owner` and `/admin`) with platform statistics, user management, and role promotion/demotion.
- **Security**: Strict Row Level Security policies prevent public data leaks and block ordinary users from promoting themselves to owner. Service role keys and secrets are strictly confined to server-side CLI scripts and excluded from frontend bundles.

---

## Getting Started

### 1. Install Dependencies

```sh
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```sh
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
# Client Configuration (Safe for Vite / Browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_OWNER_EMAIL=your-owner-email@example.com

# Server-Side Configuration (For administrative scripts only - NEVER expose in client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
OWNER_EMAIL=your-owner-email@example.com
OWNER_PASSWORD=YourSecureOwnerPassword123!
```

> **Note**: If Supabase variables are not set, DevVault will display a clear notification prompt without crashing.

### 3. Apply Database Migrations to Supabase

Run the SQL migration in `supabase/migrations/20261015000000_init_devvault_supabase.sql` directly in your Supabase project:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** -> **New Query**.
3. Paste the contents of `supabase/migrations/20261015000000_init_devvault_supabase.sql`.
4. Click **Run**.

This migration configures:
- `profiles` table with `role` (`owner` / `user`) and automatic user creation trigger.
- `entries` table for Projects, DSA Solutions, Notes, Resources, and Tasks.
- `activities`, `tags`, `entry_tags`, and `attachments` tables.
- Helper function `public.is_owner()`.
- Explicit Row Level Security (RLS) policies on every table.

### 4. Provision the Owner Account

To create or promote the site owner account with administrative privileges, run the secure server-side setup script:

```sh
npm run setup:owner
```

Or provide arguments directly:

```sh
node scripts/setup-owner.mjs owner@example.com YourSecurePassword123!
```

This script uses the Supabase Admin API to create the user in `auth.users`, confirm their email, and set their role to `owner` in `public.profiles`. Ordinary users cannot obtain owner privileges by signing up through the web UI.

### 5. Start the Development Server

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

- **Authentication**:
  - Sign In with Email & Password.
  - Sign Up with Name, Email & Password.
  - Password Reset via Email Recovery flow.
  - Automatic session restoration across browser refreshes and tab reloads.
  - Clean error messages (e.g. incorrect password, unconfirmed email, duplicate account).
- **Owner Command Center (`/owner` and `/admin`)**:
  - Accessible only to authenticated users with `role: 'owner'`.
  - Non-owner users and guests receive a 403 Forbidden / restricted access page.
  - Platform statistics: total users, projects, DSA solutions, notes/resources, and tasks.
  - User directory table with role promotion/demotion capabilities.
- **Project Management**:
  - Create, view, edit, duplicate, pin, archive, and delete projects.
  - Fields for category, technology stack, GitHub URL, live demo URL, documentation, cover image, and milestones.
  - Grid and list view with category chips and search.
- **DSA Coding Solutions (`/questions`)**:
  - Add and manage problem solutions with Topic, Difficulty (Easy, Medium, Hard), Source (LeetCode, Codeforces, HackerRank, College Assignment), Problem URL, Attempts, and Confidence (0-5 stars).
  - Approach, constraints, sample test cases, Time and Space complexity.
  - Syntax-highlighted C++ solution viewer and editor.
  - Review queue and spaced repetition scheduling.
- **Knowledge Notes & Resources**:
  - Markdown notes with syntax-highlighted code blocks, folder hierarchies, and nested child notes.
  - Curated resource links with tags and status tracking.
- **Tasks & Learning Progress**:
  - Priority levels, due dates, linked projects, and weekly goal tracking.
  - Activity log summarizing your 30 most recent actions.
- **Private Attachments**:
  - Upload PDF, Markdown, text, PNG, JPEG, or WebP files up to 3 MB.
  - Private storage with authenticated downloads.

---

## Security Best Practices

1. **Row Level Security**: Every database table enforces RLS. Users can only select, insert, update, or delete their own records.
2. **Owner Role Protection**: The `profiles_update` RLS policy and trigger ensure that standard users cannot elevate their own role to `owner`.
3. **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is only used by `scripts/setup-owner.mjs` and is excluded from the Vite client bundle and Git tracking.
4. **Input Validation**: All forms and inputs are validated using Zod schemas on the client and enforced at the database level.
