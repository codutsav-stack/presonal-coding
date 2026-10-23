-- DevVault Supabase Database Schema & Security Policies
-- Includes Profiles with RBAC (owner / user), Entries (Projects, DSA Questions, Notes, Resources, Tasks),
-- Activities, Tags, Attachments, and Row Level Security (RLS).

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'user')),
  preferences jsonb NOT NULL DEFAULT '{"theme":"dark","reducedMotion":false,"defaultView":"grid","weeklyGoal":5}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Entries Table (Unified Architecture for Projects, DSA Solutions, Notes, Resources, Tasks)
CREATE TABLE IF NOT EXISTS public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('project', 'question', 'note', 'resource', 'task')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  status text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  project_id uuid REFERENCES public.entries(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);

-- 3. Activities Table (User Activity & Learning Log)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.entries(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('project', 'question', 'note', 'resource', 'task')),
  title text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Tags & Normalized Tagging
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  CONSTRAINT tags_owner_name_unique UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.entry_tags (
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- 5. Attachments Table
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE RESTRICT,
  name text NOT NULL,
  content_type text NOT NULL,
  size integer NOT NULL,
  blob_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS entries_owner_kind_idx ON public.entries (user_id, kind);
CREATE INDEX IF NOT EXISTS entries_owner_created_idx ON public.entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entries_owner_updated_idx ON public.entries (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS entries_project_idx ON public.entries (project_id);
CREATE INDEX IF NOT EXISTS entries_parent_idx ON public.entries (parent_id);
CREATE INDEX IF NOT EXISTS activities_owner_created_idx ON public.activities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tags_owner_idx ON public.tags (user_id);
CREATE INDEX IF NOT EXISTS attachments_owner_entry_idx ON public.attachments (user_id, entry_id);

-- 6. Helper Security Function: is_owner()
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Row Level Security (RLS) Configuration

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_owner());

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id AND (
      role = 'user' OR role IS NULL OR public.is_owner()
    )
  );

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR public.is_owner()
  )
  WITH CHECK (
    -- Normal users cannot escalate their role to owner
    public.is_owner() OR (
      auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE
  USING (public.is_owner());

-- Entries Policies
DROP POLICY IF EXISTS entries_select ON public.entries;
CREATE POLICY entries_select ON public.entries
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_owner());

DROP POLICY IF EXISTS entries_insert ON public.entries;
CREATE POLICY entries_insert ON public.entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS entries_update ON public.entries;
CREATE POLICY entries_update ON public.entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS entries_delete ON public.entries;
CREATE POLICY entries_delete ON public.entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Activities Policies
DROP POLICY IF EXISTS activities_select ON public.activities;
CREATE POLICY activities_select ON public.activities
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_owner());

DROP POLICY IF EXISTS activities_insert ON public.activities;
CREATE POLICY activities_insert ON public.activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS activities_update ON public.activities;
CREATE POLICY activities_update ON public.activities
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS activities_delete ON public.activities;
CREATE POLICY activities_delete ON public.activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Tags Policies
DROP POLICY IF EXISTS tags_all ON public.tags;
CREATE POLICY tags_all ON public.tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Entry Tags Policies
DROP POLICY IF EXISTS entry_tags_all ON public.entry_tags;
CREATE POLICY entry_tags_all ON public.entry_tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Attachments Policies
DROP POLICY IF EXISTS attachments_all ON public.attachments;
CREATE POLICY attachments_all ON public.attachments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Auto-Provision Profile on User Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, preferences)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user',
    '{"theme":"dark","reducedMotion":false,"defaultView":"grid","weeklyGoal":5}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = CASE WHEN profiles.name = '' THEN EXCLUDED.name ELSE profiles.name END,
      updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
