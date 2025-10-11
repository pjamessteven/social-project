import { pgTable, varchar, integer, timestamp, text, index, serial, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// Detrans tables
export const detransQuestions = pgTable('detrans_questions', {
  name: varchar('name', { length: 255 }).primaryKey(),
  viewsCount: integer('views_count').default(0).notNull(),
  mostRecentlyAsked: timestamp('most_recently_asked').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  finalResponse: text('final_response'),
}, (table) => ({
  nameIdx: index('idx_detrans_questions_name').on(table.name),
}));

export const detransCache = pgTable('detrans_cache', {
  promptHash: varchar('prompt_hash', { length: 64 }).primaryKey(),
  promptText: text('prompt_text').notNull(),
  resultText: text('result_text').notNull(),
  questionName: varchar('question_name', { length: 255 }).references(() => detransQuestions.name),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
}, (table) => ({
  questionIdx: index('idx_detrans_cache_question').on(table.questionName),
  createdIdx: index('idx_detrans_cache_created').on(table.createdAt),
}));

// Affirm tables
export const affirmQuestions = pgTable('affirm_questions', {
  name: varchar('name', { length: 255 }).primaryKey(),
  viewsCount: integer('views_count').default(0).notNull(),
  mostRecentlyAsked: timestamp('most_recently_asked').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  finalResponse: text('final_response'),
}, (table) => ({
  nameIdx: index('idx_affirm_questions_name').on(table.name),
}));

export const affirmCache = pgTable('affirm_cache', {
  promptHash: varchar('prompt_hash', { length: 64 }).primaryKey(),
  promptText: text('prompt_text').notNull(),
  resultText: text('result_text').notNull(),
  questionName: varchar('question_name', { length: 255 }).references(() => affirmQuestions.name),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
}, (table) => ({
  questionIdx: index('idx_affirm_cache_question').on(table.questionName),
  createdIdx: index('idx_affirm_cache_created').on(table.createdAt),
}));


// Detrans users table
export const detransUsers = pgTable('detrans_users', {
  username: varchar('username', { length: 255 }).primaryKey(),
  activeSince: timestamp('active_since').notNull(),
  sex: varchar('sex', { length: 1 }).notNull(), // 'm' or 'f'
  experienceSummary: text('experience_summary'),
  experience: text('experience'),
  tags: text('tags'), // JSON array of tags
}, (table) => ({
  usernameIdx: index('idx_detrans_users_username').on(table.username),
  activeSinceIdx: index('idx_detrans_users_active_since').on(table.activeSince),
}));

// Detrans comments table
export const detransComments = pgTable('detrans_comments', {
  uuid: varchar('uuid', { length: 50 }).primaryKey(), // Remove auto-generation, use Qdrant point ID
  text: text('text').notNull(),
  summary: text('summary'),
  questions: text('questions'),
  keywords: text('keywords'),
  username: varchar('username', { length: 255 }),
  userFlair: varchar('user_flair', { length: 255 }),
  link: text('link').unique(),
  score: integer('score'),
  created: timestamp('created').notNull(), // Converted from UTC timestamp
  id: varchar('id', { length: 50 }).notNull(),
  parentId: varchar('parent_id', { length: 50 }),
  linkId: varchar('link_id', { length: 50 }),
}, (table) => ({
  idIdx: index('idx_detrans_comments_id').on(table.id),
  createdIdx: index('idx_detrans_comments_created').on(table.created),
  parentIdIdx: index('idx_detrans_comments_parent_id').on(table.parentId),
  linkIdIdx: index('idx_detrans_comments_link_id').on(table.linkId),
}));

// trans comments table
export const transComments = pgTable('trans_comments', {
  uuid: varchar('uuid', { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  text: text('text').notNull(),
  summary: text('summary'),
  questions: text('questions'),
  keywords: text('keywords'),
  username: varchar('username', { length: 255 }),
  userFlair: varchar('user_flair', { length: 255 }),
  subreddit: varchar('subreddit', { length: 255 }),
  link: text('link'),
  score: integer('score'),
  created: timestamp('created').notNull(), // Converted from UTC timestamp
  id: varchar('id', { length: 50 }).notNull(),
  parentId: varchar('parent_id', { length: 50 }),
  linkId: varchar('link_id', { length: 50 }),
}, (table) => ({
  idIdx: index('idx_trans_comments_id').on(table.id),
  createdIdx: index('idx_trans_comments_created').on(table.created),
  parentIdIdx: index('idx_trans_comments_parent_id').on(table.parentId),
  linkIdIdx: index('idx_trans_comments_link_id').on(table.linkId),
}));

// Zod schemas
export const questionSchema = z.object({
  name: z.string().max(255),
  viewsCount: z.number().int().min(0).default(0),
  mostRecentlyAsked: z.date(),
  createdAt: z.date(),
  finalResponse: z.string().nullable(),
});

export const cacheSchema = z.object({
  promptHash: z.string().length(64),
  promptText: z.string(),
  resultText: z.string(),
  questionName: z.string().max(255).nullable(),
  createdAt: z.date(),
  lastAccessed: z.date(),
});

export const detransUserEventSchema = z.object({
  id: z.number().int(),
  username: z.string().max(255),
  age: z.number().nullable(),
  eventName: z.string().max(255),
});

export const detransUserSchema = z.object({
  username: z.string().max(255),
  activeSince: z.date(),
  sex: z.enum(['m', 'f']),
  experienceSummary: z.string().nullable(),
  experience: z.string().nullable(),
  tags: z.string().nullable(), // JSON array of tags
});

export const detransCommentSchema = z.object({
  uuid: z.string(),
  text: z.string(),
  summary: z.string().nullable(),
  questions: z.string().nullable(),
  keywords: z.string().nullable(),
  username: z.string().max(255).nullable(),
  userFlair: z.string().max(255).nullable(),
  link: z.string().nullable(),
  score: z.number().int().nullable(),
  created: z.date(),
  id: z.string().max(50),
  parentId: z.string().max(50).nullable(),
  linkId: z.string().max(50).nullable(),
});

export type Question = z.infer<typeof questionSchema>;
export type Cache = z.infer<typeof cacheSchema>;
export type DetransUserEvent = z.infer<typeof detransUserEventSchema>;
export type DetransUser = z.infer<typeof detransUserSchema>;
export type DetransComment = z.infer<typeof detransCommentSchema>;
