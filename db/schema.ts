import { pgTable, varchar, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
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

export type Question = z.infer<typeof questionSchema>;
export type Cache = z.infer<typeof cacheSchema>;
