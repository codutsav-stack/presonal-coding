CREATE TYPE "entry_kind" AS ENUM('project', 'question', 'note', 'resource', 'task');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"entry_id" uuid,
	"kind" "entry_kind" NOT NULL,
	"title" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"project_id" uuid,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "entry_tags" (
	"entry_id" uuid,
	"tag_id" uuid,
	"user_id" text NOT NULL,
	CONSTRAINT "entry_tags_pkey" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"preferences" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activities_owner_date_idx" ON "activities" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entries_owner_kind_idx" ON "entries" ("user_id","kind");--> statement-breakpoint
CREATE INDEX "entries_owner_updated_idx" ON "entries" ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "entries_project_idx" ON "entries" ("project_id");--> statement-breakpoint
CREATE INDEX "entries_parent_idx" ON "entries" ("parent_id");--> statement-breakpoint
CREATE INDEX "tags_owner_idx" ON "tags" ("user_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_entry_id_entries_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_project_id_entries_id_fkey" FOREIGN KEY ("project_id") REFERENCES "entries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_parent_id_entries_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "entries"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_entry_id_entries_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_tag_id_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY profiles_owner ON profiles USING (id = current_setting('app.user_id', true)) WITH CHECK (id = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE entries FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY entries_owner ON entries USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE activities FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY activities_owner ON activities USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tags_owner ON tags USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE entry_tags FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY entry_tags_owner ON entry_tags USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
CREATE UNIQUE INDEX tags_owner_name_unique ON tags(user_id, name);
