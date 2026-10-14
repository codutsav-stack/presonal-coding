import { pgTable, pgEnum, uuid, text, boolean, integer, jsonb, timestamp, index, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core'
import type { Data, Preferences } from '../src/types'

export const entryKind = pgEnum('entry_kind', ['project', 'question', 'note', 'resource', 'task'])
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  preferences: jsonb('preferences').$type<Preferences>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  kind: entryKind('kind').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull(),
  status: text('status').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  tags: text('tags').array().notNull().default([]),
  data: jsonb('data').$type<Data>().notNull().default({}),
  projectId: uuid('project_id').references((): AnyPgColumn => entries.id, { onDelete: 'set null' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => entries.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  openedAt: timestamp('opened_at', { withTimezone: true }),
}, table => [index('entries_owner_kind_idx').on(table.userId, table.kind), index('entries_owner_updated_idx').on(table.userId, table.updatedAt), index('entries_project_idx').on(table.projectId), index('entries_parent_idx').on(table.parentId)])
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, table => [index('tags_owner_idx').on(table.userId)])
export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  entryId: uuid('entry_id').notNull().references(() => entries.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  blobKey: text('blob_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('attachments_owner_entry_idx').on(table.userId, table.entryId)])
export const entryTags = pgTable('entry_tags', {
  entryId: uuid('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
}, table => [primaryKey({ columns: [table.entryId, table.tagId] })])
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'set null' }),
  kind: entryKind('kind').notNull(),
  title: text('title').notNull(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('activities_owner_date_idx').on(table.userId, table.createdAt)])
