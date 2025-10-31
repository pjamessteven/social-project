import { pgTable, varchar, integer, timestamp, text, index, serial, numeric, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod/v3';

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
  questionName: varchar('question_name', { length: 255 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }),
  tokensPrompt: integer('tokens_prompt'),
  tokensCompletion: integer('tokens_completion'),
  model: varchar('model', { length: 255 }),
  generationId: varchar('generation_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
}, (table) => ({
  questionIdx: index('idx_detrans_cache_question').on(table.questionName),
  createdIdx: index('idx_detrans_cache_created').on(table.createdAt),
  modelIdx: index('idx_detrans_cache_model').on(table.model),
  generationIdx: index('idx_detrans_cache_generation').on(table.generationId),
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
  questionName: varchar('question_name', { length: 255 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }),
  tokensPrompt: integer('tokens_prompt'),
  tokensCompletion: integer('tokens_completion'),
  model: varchar('model', { length: 255 }),
  generationId: varchar('generation_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
}, (table) => ({
  questionIdx: index('idx_affirm_cache_question').on(table.questionName),
  createdIdx: index('idx_affirm_cache_created').on(table.createdAt),
  modelIdx: index('idx_affirm_cache_model').on(table.model),
  generationIdx: index('idx_affirm_cache_generation').on(table.generationId),
}));

// Detrans chat cache table
export const detransChatCache = pgTable('detrans_chat_cache', {
  promptHash: varchar('prompt_hash', { length: 64 }).primaryKey(),
  promptText: text('prompt_text').notNull(),
  resultText: text('result_text').notNull(),
  questionName: varchar('question_name', { length: 255 }),
  conversationId: varchar('conversation_id', { length: 36 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 6 }),
  tokensPrompt: integer('tokens_prompt'),
  tokensCompletion: integer('tokens_completion'),
  model: varchar('model', { length: 255 }),
  generationId: varchar('generation_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
}, (table) => ({
  questionIdx: index('idx_detrans_chat_cache_question').on(table.questionName),
  conversationIdx: index('idx_detrans_chat_cache_conversation').on(table.conversationId),
  createdIdx: index('idx_detrans_chat_cache_created').on(table.createdAt),
  modelIdx: index('idx_detrans_chat_cache_model').on(table.model),
  generationIdx: index('idx_detrans_chat_cache_generation').on(table.generationId),
}));

// Chat conversations table
export const chatConversations = pgTable('chat_conversations', {
  uuid: varchar('uuid', { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  mode: varchar('mode', { length: 20 }).notNull(), // 'detrans_chat', 'detrans', 'affirm'
  title: varchar('title', { length: 500 }),
  messages: text('messages').notNull(), // JSON string of the conversation messages
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  modeIdx: index('idx_chat_conversations_mode').on(table.mode),
  createdIdx: index('idx_chat_conversations_created').on(table.createdAt),
  updatedIdx: index('idx_chat_conversations_updated').on(table.updatedAt),
}));


// Tags table
export const detransTags = pgTable('detrans_tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_detrans_tags_name').on(table.name),
}));

// Tag types junction table
export const detransTagTypes = pgTable('detrans_tag_types', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull().references(() => detransTags.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tagTypeIdx: index('idx_detrans_tag_types_tag_type').on(table.tagId, table.type),
  // Ensure unique combination of tag and type
  uniqueTagType: index('idx_detrans_tag_types_unique').on(table.tagId, table.type),
}));

// User tags junction table
export const detransUserTags = pgTable('detrans_user_tags', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().references(() => detransUsers.username, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => detransTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  usernameTagIdx: index('idx_detrans_user_tags_username_tag').on(table.username, table.tagId),
  usernameIdx: index('idx_detrans_user_tags_username').on(table.username),
  tagIdIdx: index('idx_detrans_user_tags_tag_id').on(table.tagId),
  // Ensure unique combination of username and tag
  uniqueUserTag: index('idx_detrans_user_tags_unique').on(table.username, table.tagId),
}));

// Detrans users table
export const detransUsers = pgTable('detrans_users', {
  username: varchar('username', { length: 255 }).primaryKey(),
  activeSince: timestamp('active_since').notNull(),
  sex: varchar('sex', { length: 1 }).notNull(), // 'm' or 'f'
  experienceSummary: text('experience_summary'),
  experience: text('experience'),
  redFlagsReport: text('red_flags_report'),
  transitionAge: integer('transition_age'),
  detransitionAge: integer('detransition_age'),
  hormonesAge: integer('hormones_age'),
  topSurgeryAge: integer('top_surgery_age'),
  bottomSurgeryAge: integer('bottom_surgery_age'),
  pubertyBlockersAge: integer('puberty_blockers_age'),
  transitionReasonId: integer('transition_reason_id').references(() => detransTags.id),
  detransitionReasonId: integer('detransition_reason_id').references(() => detransTags.id),
}, (table) => ({
  usernameIdx: index('idx_detrans_users_username').on(table.username),
  activeSinceIdx: index('idx_detrans_users_active_since').on(table.activeSince),
  transitionReasonIdx: index('idx_detrans_users_transition_reason').on(table.transitionReasonId),
  detransitionReasonIdx: index('idx_detrans_users_detransition_reason').on(table.detransitionReasonId),
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
  totalCost: z.string().nullable(),
  tokensPrompt: z.number().int().nullable(),
  tokensCompletion: z.number().int().nullable(),
  model: z.string().max(255).nullable(),
  generationId: z.string().max(255).nullable(),
  createdAt: z.date(),
  lastAccessed: z.date(),
});

export const detransUserEventSchema = z.object({
  id: z.number().int(),
  username: z.string().max(255),
  age: z.number().nullable(),
  eventName: z.string().max(255),
});

export const tagSchema = z.object({
  id: z.number().int(),
  name: z.string().max(255),
  createdAt: z.date(),
});

export const tagTypeSchema = z.object({
  id: z.number().int(),
  tagId: z.number().int(),
  type: z.string().max(100),
  createdAt: z.date(),
});

export const userTagSchema = z.object({
  id: z.number().int(),
  username: z.string().max(255),
  tagId: z.number().int(),
  createdAt: z.date(),
});

export const detransUserSchema = z.object({
  username: z.string().max(255),
  activeSince: z.date(),
  sex: z.enum(['m', 'f']),
  experienceSummary: z.string().nullable(),
  experience: z.string().nullable(),
  redFlagsReport: z.string().nullable(),
  transitionAge: z.number().int().nullable(),
  detransitionAge: z.number().int().nullable(),
  hormonesAge: z.number().int().nullable(),
  topSurgeryAge: z.number().int().nullable(),
  bottomSurgeryAge: z.number().int().nullable(),
  pubertyBlockersAge: z.number().int().nullable(),
  transitionReasonId: z.number().int().nullable(),
  detransitionReasonId: z.number().int().nullable(),
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

export const chatConversationSchema = z.object({
  uuid: z.string(),
  mode: z.string().max(20),
  title: z.string().max(500).nullable(),
  messages: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Question = z.infer<typeof questionSchema>;
export type Cache = z.infer<typeof cacheSchema>;
export type DetransUserEvent = z.infer<typeof detransUserEventSchema>;
export type DetransUser = z.infer<typeof detransUserSchema>;
export type DetransComment = z.infer<typeof detransCommentSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type TagType = z.infer<typeof tagTypeSchema>;
// Videos table
export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  sex: varchar('sex', { length: 1 }).notNull(), // 'm' or 'f'
  url: text('url').notNull().unique(),
  type: varchar('type', { length: 50 }).notNull().default('youtube'),
  processed: boolean('processed').default(false).notNull(),
  transcript: text('transcript'),
  description: text('description'),
  duration: integer('duration'), // duration in seconds
  date: timestamp('date'), // date posted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  urlIdx: index('idx_videos_url').on(table.url),
  typeIdx: index('idx_videos_type').on(table.type),
  processedIdx: index('idx_videos_processed').on(table.processed),
  dateIdx: index('idx_videos_date').on(table.date),
  authorIdx: index('idx_videos_author').on(table.author),
  sexIdx: index('idx_videos_sex').on(table.sex),
}));

export const videoSchema = z.object({
  id: z.number().int(),
  title: z.string().max(500),
  author: z.string().max(255),
  sex: z.enum(['m', 'f']),
  url: z.string(),
  type: z.string().max(50).default('youtube'),
  processed: z.boolean().default(false),
  transcript: z.string().nullable(),
  description: z.string().nullable(),
  duration: z.number().int().nullable(),
  date: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Video = z.infer<typeof videoSchema>;
export type UserTag = z.infer<typeof userTagSchema>;
