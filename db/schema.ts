import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { z } from "zod/v3";

// Detrans tables
export const detransQuestions = pgTable(
  "detrans_questions",
  {
    name: text("name").primaryKey(),
    viewsCount: integer("views_count").default(0).notNull(),
    mostRecentlyAsked: timestamp("most_recently_asked").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    finalResponse: text("final_response"),
  },
  (table) => ({
    nameIdx: index("idx_detrans_questions_name").on(table.name),
  }),
);

// Users table for authentication (email-based magic link)
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(), // Email address stored here
    role: varchar("role", { length: 50 }).notNull().default("user"), // 'admin', 'moderator', 'user'
    isActive: boolean("is_active").default(true).notNull(),
    magicLinkToken: varchar("magic_link_token", { length: 255 }),
    magicLinkExpiresAt: timestamp("magic_link_expires_at"),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: index("idx_users_username").on(table.username),
    roleIdx: index("idx_users_role").on(table.role),
    isActiveIdx: index("idx_users_is_active").on(table.isActive),
    magicLinkTokenIdx: index("idx_users_magic_link_token").on(
      table.magicLinkToken,
    ),
  }),
);

// Chat conversations table
export const chatConversations = pgTable(
  "chat_conversations",
  {
    uuid: varchar("uuid", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    mode: varchar("mode", { length: 20 }).notNull(), // 'detrans_chat', 'detrans'
    title: varchar("title", { length: 500 }),
    featured: boolean("featured").default(false),
    archived: boolean("archived").default(false).notNull(),
    conversationSummary: text("conversation_summary"),
    conversationSummaryTranslation: text("conversation_summary_translation"), // JSON object with translations
    titleTranslation: text("title_translation"), // JSON object with translations
    country: varchar("country", { length: 100 }), // Country from IP geolocation
    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 (max 15) or IPv6 (max 45)
    username: varchar("username", { length: 255 }), // Username of logged-in user who created the conversation
    includeTransPerspectives: boolean("include_trans_perspectives").default(
      false,
    ),
    messages: text("messages").notNull(), // JSON string of the conversation messages
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    modeIdx: index("idx_chat_conversations_mode").on(table.mode),
    createdIdx: index("idx_chat_conversations_created").on(table.createdAt),
    updatedIdx: index("idx_chat_conversations_updated").on(table.updatedAt),
    featuredIdx: index("idx_chat_conversations_featured").on(table.featured),
    archivedIdx: index("idx_chat_conversations_archived").on(table.archived),
    usernameIdx: index("idx_chat_conversations_username").on(table.username),
  }),
);

// Tags table
export const detransTags = pgTable(
  "detrans_tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    nameTranslation: text("name_translation"), // JSON object with translations
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_detrans_tags_name").on(table.name),
  }),
);

// Tag types junction table
export const detransTagTypes = pgTable(
  "detrans_tag_types",
  {
    id: serial("id").primaryKey(),
    tagId: integer("tag_id")
      .notNull()
      .references(() => detransTags.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tagTypeIdx: index("idx_detrans_tag_types_tag_type").on(
      table.tagId,
      table.type,
    ),
    // Ensure unique combination of tag and type
    uniqueTagType: index("idx_detrans_tag_types_unique").on(
      table.tagId,
      table.type,
    ),
  }),
);

// User tags junction table
export const detransUserTags = pgTable(
  "detrans_user_tags",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 255 })
      .notNull()
      .references(() => detransUsers.username, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => detransTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameTagIdx: index("idx_detrans_user_tags_username_tag").on(
      table.username,
      table.tagId,
    ),
    usernameIdx: index("idx_detrans_user_tags_username").on(table.username),
    tagIdIdx: index("idx_detrans_user_tags_tag_id").on(table.tagId),
    // Ensure unique combination of username and tag
    uniqueUserTag: index("idx_detrans_user_tags_unique").on(
      table.username,
      table.tagId,
    ),
  }),
);

// Detrans users table
export const detransUsers = pgTable(
  "detrans_users",
  {
    username: varchar("username", { length: 255 }).primaryKey(),
    activeSince: timestamp("active_since").notNull(),
    sex: varchar("sex", { length: 1 }).notNull(), // 'm' or 'f'
    experienceSummary: text("experience_summary"),
    experience: text("experience"),
    redFlagsReport: text("red_flags_report"),
    experienceTranslation: text("experience_translation"), // JSON object with translations
    experienceSummaryTranslation: text("experience_summary_translation"), // JSON object with translations
    redFlagsReportTranslation: text("red_flags_report_translation"), // JSON object with translations
    transitionAge: integer("transition_age"),
    detransitionAge: integer("detransition_age"),
    hormonesAge: integer("hormones_age"),
    topSurgeryAge: integer("top_surgery_age"),
    bottomSurgeryAge: integer("bottom_surgery_age"),
    pubertyBlockersAge: integer("puberty_blockers_age"),
    transitionReasonId: integer("transition_reason_id").references(
      () => detransTags.id,
    ),
    detransitionReasonId: integer("detransition_reason_id").references(
      () => detransTags.id,
    ),
  },
  (table) => ({
    usernameIdx: index("idx_detrans_users_username").on(table.username),
    activeSinceIdx: index("idx_detrans_users_active_since").on(
      table.activeSince,
    ),
    transitionReasonIdx: index("idx_detrans_users_transition_reason").on(
      table.transitionReasonId,
    ),
    detransitionReasonIdx: index("idx_detrans_users_detransition_reason").on(
      table.detransitionReasonId,
    ),
  }),
);

// Generated display names (pseudonyms) for storyteller users. Filled in by
// tooling so cards/dialogs can show a human name while usernames stay private.
export const detransUserDisplayNames = pgTable("detrans_user_display_names", {
  username: varchar("username", { length: 255 }).primaryKey(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Detrans comments table
export const detransComments = pgTable(
  "detrans_comments",
  {
    uuid: varchar("uuid", { length: 50 }).primaryKey(), // Qdrant point ID or deterministic UUIDv5
    text: text("text").notNull(),
    summary: text("summary"),
    questions: text("questions"),
    keywords: text("keywords"),
    username: varchar("username", { length: 255 }),
    userFlair: varchar("user_flair", { length: 255 }),
    link: text("link").unique(),
    score: integer("score"),
    created: timestamp("created").notNull(), // Converted from UTC timestamp
    id: varchar("id", { length: 50 }).notNull(),
    parentId: varchar("parent_id", { length: 50 }),
    linkId: varchar("link_id", { length: 50 }),
    enriched: boolean("enriched").default(false).notNull(), // summary/questions/keywords generated
    embedded: boolean("embedded").default(false).notNull(), // indexed in Qdrant for chat RAG (score >= 3 only)
  },
  (table) => ({
    idIdx: uniqueIndex("idx_detrans_comments_id_unique").on(table.id),
    createdIdx: index("idx_detrans_comments_created").on(table.created),
    usernameIdx: index("idx_detrans_comments_username").on(table.username),
    parentIdIdx: index("idx_detrans_comments_parent_id").on(table.parentId),
    linkIdIdx: index("idx_detrans_comments_link_id").on(table.linkId),
  }),
);

// Detrans posts table (Reddit submissions; mirrors detrans_comments + post fields)
export const detransPosts = pgTable(
  "detrans_posts",
  {
    uuid: varchar("uuid", { length: 50 }).primaryKey(), // deterministic UUIDv5 from t3_<id>
    title: text("title").notNull(),
    text: text("text").notNull(), // selftext; '' for link/image posts
    summary: text("summary"),
    questions: text("questions"),
    keywords: text("keywords"),
    username: varchar("username", { length: 255 }),
    userFlair: varchar("user_flair", { length: 255 }),
    link: text("link").unique(),
    score: integer("score"),
    created: timestamp("created").notNull(),
    id: varchar("id", { length: 50 }).notNull(),
    url: text("url"),
    numComments: integer("num_comments"),
    isSelf: boolean("is_self"),
    linkFlair: varchar("link_flair", { length: 255 }),
    enriched: boolean("enriched").default(false).notNull(),
    embedded: boolean("embedded").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idIdx: uniqueIndex("idx_detrans_posts_id_unique").on(table.id),
    createdIdx: index("idx_detrans_posts_created").on(table.created),
    usernameIdx: index("idx_detrans_posts_username").on(table.username),
  }),
);

// trans comments table
export const transComments = pgTable(
  "trans_comments",
  {
    uuid: varchar("uuid", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    text: text("text").notNull(),
    summary: text("summary"),
    questions: text("questions"),
    keywords: text("keywords"),
    username: varchar("username", { length: 255 }),
    userFlair: varchar("user_flair", { length: 255 }),
    subreddit: varchar("subreddit", { length: 255 }),
    link: text("link"),
    score: integer("score"),
    created: timestamp("created").notNull(), // Converted from UTC timestamp
    id: varchar("id", { length: 50 }).notNull(),
    parentId: varchar("parent_id", { length: 50 }),
    linkId: varchar("link_id", { length: 50 }),
  },
  (table) => ({
    idIdx: index("idx_trans_comments_id").on(table.id),
    createdIdx: index("idx_trans_comments_created").on(table.created),
    parentIdIdx: index("idx_trans_comments_parent_id").on(table.parentId),
    linkIdIdx: index("idx_trans_comments_link_id").on(table.linkId),
  }),
);

// Zod schemas
export const questionSchema = z.object({
  name: z.string(),
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
  nameTranslation: z.string().nullable(), // JSON object with translations
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
  sex: z.enum(["m", "f"]),
  experienceSummary: z.string().nullable(),
  experience: z.string().nullable(),
  redFlagsReport: z.string().nullable(),
  experienceTranslation: z.string().nullable(), // JSON object with translations
  experienceSummaryTranslation: z.string().nullable(), // JSON object with translations
  redFlagsReportTranslation: z.string().nullable(), // JSON object with translations
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
  enriched: z.boolean().default(false),
  embedded: z.boolean().default(false),
});

export const detransPostSchema = z.object({
  uuid: z.string(),
  title: z.string(),
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
  url: z.string().nullable(),
  numComments: z.number().int().nullable(),
  isSelf: z.boolean().nullable(),
  linkFlair: z.string().max(255).nullable(),
  enriched: z.boolean().default(false),
  embedded: z.boolean().default(false),
  createdAt: z.date(),
});

export const userSchema = z.object({
  id: z.number().int(),
  username: z.string().max(255), // Email address
  role: z.string().max(50),
  isActive: z.boolean(),
  magicLinkToken: z.string().max(255).nullable(),
  magicLinkExpiresAt: z.date().nullable(),
  lastLogin: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const chatConversationSchema = z.object({
  uuid: z.string(),
  mode: z.string().max(20),
  title: z.string().max(500).nullable(),
  messages: z.string(),
  featured: z.boolean().nullable(),
  archived: z.boolean(),
  conversationSummary: z.string().nullable(),
  conversationSummaryTranslation: z.string().nullable(), // JSON object with translations
  titleTranslation: z.string().nullable(), // JSON object with translations
  country: z.string().max(100).nullable(), // Country from IP geolocation
  ipAddress: z.string().max(45).nullable(), // IPv4 (max 15) or IPv6 (max 45)
  username: z.string().max(255).nullable(), // Username of logged-in user who created the conversation
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Question = z.infer<typeof questionSchema>;
export type Cache = z.infer<typeof cacheSchema>;
export type DetransUserEvent = z.infer<typeof detransUserEventSchema>;
export type DetransUser = z.infer<typeof detransUserSchema>;
export type DetransComment = z.infer<typeof detransCommentSchema>;
export type DetransPost = z.infer<typeof detransPostSchema>;
export type User = z.infer<typeof userSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type TagType = z.infer<typeof tagTypeSchema>;
// Videos table
export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    sex: varchar("sex", { length: 1 }), // 'm' or 'f'
    url: text("url").notNull().unique(),
    type: varchar("type", { length: 50 }).notNull().default("youtube"),
    processed: boolean("processed").default(false).notNull(),
    transcript: text("transcript"),
    description: text("description"),
    summary: text("summary"),
    bite: text("bite"),
    duration: integer("duration"), // duration in seconds
    date: timestamp("date"), // date posted
    descriptionTranslation: text("description_translation"), // JSON object with translations
    summaryTranslation: text("summary_translation"), // JSON object with translations
    biteTranslation: text("bite_translation"), // JSON object with translations
    titleTranslation: text("title_translation"), // JSON object with translations
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    urlIdx: index("idx_videos_url").on(table.url),
    typeIdx: index("idx_videos_type").on(table.type),
    processedIdx: index("idx_videos_processed").on(table.processed),
    dateIdx: index("idx_videos_date").on(table.date),
    authorIdx: index("idx_videos_author").on(table.author),
    sexIdx: index("idx_videos_sex").on(table.sex),
  }),
);

export const videoSchema = z.object({
  id: z.number().int(),
  title: z.string().max(500),
  author: z.string().max(255),
  sex: z.enum(["m", "f"]),
  url: z.string(),
  type: z.string().max(50).default("youtube"),
  processed: z.boolean().default(false),
  transcript: z.string().nullable(),
  description: z.string().nullable(),
  summary: z.string().nullable(),
  bite: z.string().nullable(),
  duration: z.number().int().nullable(),
  date: z.date().nullable(),
  descriptionTranslation: z.string().nullable(), // JSON object with translations
  summaryTranslation: z.string().nullable(), // JSON object with translations
  biteTranslation: z.string().nullable(), // JSON object with translations
  titleTranslation: z.string().nullable(), // JSON object with translations
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const bannedUsers = pgTable(
  "banned_users",
  {
    id: serial("id").primaryKey(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    reason: text("reason"),
    bannedBy: varchar("banned_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ipAddressIdx: index("idx_banned_users_ip_address").on(table.ipAddress),
    createdIdx: index("idx_banned_users_created").on(table.createdAt),
  }),
);

export const bannedUserSchema = z.object({
  id: z.number(),
  ipAddress: z.string(),
  reason: z.string().optional(),
  bannedBy: z.string().optional(),
  createdAt: z.date(),
});

export type BannedUser = z.infer<typeof bannedUserSchema>;

// Studies table
export const studies = pgTable(
  "studies",
  {
    id: serial("id").primaryKey(),
    headline: varchar("headline", { length: 500 }),
    title: varchar("title", { length: 1000 }),
    authors: varchar("authors", { length: 500 }),
    description: text("description"),
    year: integer("year"),
    url: text("url").notNull(),
    displayUrl: text("display_url").notNull(),
    journal: varchar("journal", { length: 500 }),
    // Translation columns (JSON objects with locale keys)
    headlineTranslation: text("headline_translation"),
    titleTranslation: text("title_translation"),
    descriptionTranslation: text("description_translation"),
    keyPointsTranslation: text("key_points_translation"),
    // Approval and RAG fields
    approved: boolean("approved").default(false).notNull(),
    fullText: text("full_text"),
    abstract: text("abstract"),
    conclusion: text("conclusion"),
    keyPoints: jsonb("key_points").$type<string[]>(),
    summary: text("summary"),
    // Methodological limitations and flaws
    limitations: jsonb("limitations").$type<string[]>(),
    // Legacy field — replaced by approved for visibility gating
    processed: boolean("processed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    yearIdx: index("idx_studies_year").on(table.year),
    createdIdx: index("idx_studies_created").on(table.createdAt),
    approvedIdx: index("idx_studies_approved").on(table.approved),
    processedIdx: index("idx_studies_processed").on(table.processed),
  }),
);

export const studySchema = z.object({
  id: z.number().int(),
  headline: z.string().max(500).nullable(),
  title: z.string().max(1000).nullable(),
  authors: z.string().max(500).nullable(),
  description: z.string().nullable(),
  year: z.number().int().nullable(),
  url: z.string(),
  displayUrl: z.string(),
  journal: z.string().max(500).nullable(),
  headlineTranslation: z.string().nullable(),
  titleTranslation: z.string().nullable(),
  descriptionTranslation: z.string().nullable(),
  approved: z.boolean().default(false),
  fullText: z.string().nullable(),
  abstract: z.string().nullable(),
  conclusion: z.string().nullable(),
  keyPoints: z.array(z.string()).nullable(),
  keyPointsTranslation: z.string().nullable(),
  summary: z.string().nullable(),
  limitations: z.array(z.string()).nullable(),
  processed: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Study = z.infer<typeof studySchema>;

// Normalized study tags
export const studyTags = pgTable("study_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  // Translations as JSON object: {"en": "...", "fr": "...", "es": "..."}
  translations: text("translations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyTagRelations = pgTable(
  "study_tag_relations",
  {
    studyId: integer("study_id").notNull(),
    tagId: integer("tag_id").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studyId, table.tagId] }),
  }),
);

export const studyTagSchema = z.object({
  id: z.number().int(),
  name: z.string().max(100),
  translations: z.string().nullable(),
  createdAt: z.date(),
});

export const studyTagRelationSchema = z.object({
  studyId: z.number().int(),
  tagId: z.number().int(),
});

export type StudyTag = z.infer<typeof studyTagSchema>;
export type StudyTagRelation = z.infer<typeof studyTagRelationSchema>;

// Per-locale translated slug segments for study detail URLs (/studies/[slug]).
// Rows are regenerated from the localized headline/title whenever a study is
// created or edited (see app/lib/study-slugs.ts).
export const studySlugs = pgTable(
  "study_slugs",
  {
    studyId: integer("study_id")
      .notNull()
      .references(() => studies.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studyId, table.locale] }),
    // Unique per locale so two studies can never share a public URL
    localeSlugIdx: uniqueIndex("idx_study_slugs_locale_slug").on(
      table.locale,
      table.slug,
    ),
  }),
);

export const studySlugSchema = z.object({
  studyId: z.number().int(),
  locale: z.string().max(10),
  slug: z.string().max(255),
});

export type StudySlug = z.infer<typeof studySlugSchema>;

export type Video = z.infer<typeof videoSchema>;
export type UserTag = z.infer<typeof userTagSchema>;

// Chat feedback table (thumbs up/down per message)
export const chatFeedback = pgTable(
  "chat_feedback",
  {
    id: serial("id").primaryKey(),
    conversationUuid: varchar("conversation_uuid", { length: 36 })
      .notNull()
      .references(() => chatConversations.uuid, { onDelete: "cascade" }),
    messageId: varchar("message_id", { length: 36 }).notNull(),
    vote: varchar("vote", { length: 4 }).notNull(), // 'up' or 'down'
    feedbackText: text("feedback_text"), // Optional feedback text (only for downvotes)
    ipAddress: varchar("ip_address", { length: 45 }),
    username: varchar("username", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationMessageIdx: index("idx_chat_feedback_conversation_message").on(
      table.conversationUuid,
      table.messageId,
    ),
    ipAddressIdx: index("idx_chat_feedback_ip_address").on(table.ipAddress),
    usernameIdx: index("idx_chat_feedback_username").on(table.username),
    // One vote per user per message (by IP for anonymous, by username for logged-in)
    uniqueIpMessage: index("idx_chat_feedback_unique_ip_message").on(
      table.ipAddress,
      table.messageId,
    ),
    uniqueUsernameMessage: index(
      "idx_chat_feedback_unique_username_message",
    ).on(table.username, table.messageId),
  }),
);

export const chatFeedbackSchema = z.object({
  id: z.number().int(),
  conversationUuid: z.string(),
  messageId: z.string(),
  vote: z.enum(["up", "down"]),
  feedbackText: z.string().nullable(),
  ipAddress: z.string().max(45).nullable(),
  username: z.string().max(255).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ChatFeedback = z.infer<typeof chatFeedbackSchema>;

// ---------------------------------------------------------------------------
// Wiki pages (agent-managed, admin-only CRUD; public at /topics/[...slug])
// ---------------------------------------------------------------------------

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    // Default-locale segment (slugified)
    slug: varchar("slug", { length: 255 }).notNull(),
    // Self-referencing hierarchy; children survive parent deletion as orphans
    parentId: integer("parent_id").references((): AnyPgColumn => pages.id, {
      onDelete: "set null",
    }),
    // Materialized default-locale full path, e.g. "topicname/subtopic/page"
    path: text("path").notNull().unique(),
    title: varchar("title", { length: 500 }).notNull(),
    titleTranslation: text("title_translation"), // JSON { locale: title }
    // Short blurb: meta description + og:description + listPages snippet
    summary: text("summary"),
    summaryTranslation: text("summary_translation"), // JSON { locale: summary }
    content: text("content").notNull(), // markdown (default locale)
    contentTranslation: text("content_translation"), // JSON { locale: markdown }
    published: boolean("published").default(false).notNull(),
    isStub: boolean("is_stub").default(false).notNull(),
    viewsCount: integer("views_count").default(0).notNull(),
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pathIdx: index("idx_pages_path").on(table.path),
    parentIdIdx: index("idx_pages_parent_id").on(table.parentId),
    publishedIdx: index("idx_pages_published").on(table.published),
  }),
);

// Per-locale translated slug segments (only stored when they differ from default)
export const pageSlugs = pgTable(
  "page_slugs",
  {
    pageId: integer("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.pageId, table.locale] }),
    localeSlugIdx: index("idx_page_slugs_locale_slug").on(
      table.locale,
      table.slug,
    ),
  }),
);

export const pageSchema = z.object({
  id: z.number().int(),
  slug: z.string().max(255),
  parentId: z.number().int().nullable(),
  path: z.string(),
  title: z.string().max(500),
  titleTranslation: z.string().nullable(),
  summary: z.string().nullable(),
  summaryTranslation: z.string().nullable(),
  content: z.string(),
  contentTranslation: z.string().nullable(),
  published: z.boolean(),
  isStub: z.boolean(),
  viewsCount: z.number().int().min(0).default(0),
  createdBy: z.string().max(255).nullable(),
  updatedBy: z.string().max(255).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const pageSlugSchema = z.object({
  pageId: z.number().int(),
  locale: z.string().max(10),
  slug: z.string().max(255),
});

export type Page = z.infer<typeof pageSchema>;
export type PageSlug = z.infer<typeof pageSlugSchema>;

// ---------------------------------------------------------------------------
// Profile reprocessing + feature extraction staging (shadow until cutover)
// ---------------------------------------------------------------------------

export const detransProcessingRuns = pgTable("detrans_processing_runs", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 50 }).notNull(), // 'profiles' | 'features'
  model: varchar("model", { length: 100 }),
  taxonomyVersion: varchar("taxonomy_version", { length: 50 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  stats: jsonb("stats"),
  notes: text("notes"),
});

export const detransUserProfiles = pgTable(
  "detrans_user_profiles",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => detransProcessingRuns.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull(),
    experience: text("experience"),
    experienceSummary: text("experience_summary"),
    redFlagsReport: text("red_flags_report"),
    sex: varchar("sex", { length: 1 }),
    commentCount: integer("comment_count"),
    postCount: integer("post_count"),
    charCount: integer("char_count"),
    chunkCount: integer("chunk_count").default(0).notNull(),
    firstItemDate: timestamp("first_item_date"),
    model: varchar("model", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runUsername: uniqueIndex("idx_detrans_user_profiles_run_username").on(
      table.runId,
      table.username,
    ),
    usernameIdx: index("idx_detrans_user_profiles_username").on(table.username),
  }),
);

export const detransUserProfileChunks = pgTable(
  "detrans_user_profile_chunks",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => detransProcessingRuns.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    dateStart: timestamp("date_start"),
    dateEnd: timestamp("date_end"),
    itemCount: integer("item_count"),
    charCount: integer("char_count"),
    summary: jsonb("summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runUserChunk: uniqueIndex(
      "idx_detrans_user_profile_chunks_run_user_chunk",
    ).on(table.runId, table.username, table.chunkIndex),
  }),
);

export const detransUserTimelines = pgTable(
  "detrans_user_timelines",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => detransProcessingRuns.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull(),
    firstDysphoriaAge: integer("first_dysphoria_age"),
    transitionAge: integer("transition_age"),
    detransitionAge: integer("detransition_age"),
    hormonesAge: integer("hormones_age"),
    topSurgeryAge: integer("top_surgery_age"),
    bottomSurgeryAge: integer("bottom_surgery_age"),
    pubertyBlockersAge: integer("puberty_blockers_age"),
    transitionYear: integer("transition_year"),
    detransitionYear: integer("detransition_year"),
    timeline: jsonb("timeline"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runUsername: uniqueIndex("idx_detrans_user_timelines_run_username").on(
      table.runId,
      table.username,
    ),
    usernameIdx: index("idx_detrans_user_timelines_username").on(
      table.username,
    ),
  }),
);

export const detransFeatures = pgTable("detrans_features", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  group: varchar("group", { length: 50 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  kind: varchar("kind", { length: 10 }).notNull(),
  question: jsonb("question").notNull(),
  tagName: varchar("tag_name", { length: 255 }),
  tagType: varchar("tag_type", { length: 50 }),
  threshold: real("threshold"),
  choiceTagMap: jsonb("choice_tag_map"),
  choiceTagThreshold: real("choice_tag_threshold"),
  enabled: boolean("enabled").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const detransUserFeatures = pgTable(
  "detrans_user_features",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => detransProcessingRuns.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull(),
    featureId: integer("feature_id")
      .notNull()
      .references(() => detransFeatures.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 10 }).notNull(),
    noul: real("noul"),
    score: real("score"),
    choice: varchar("choice", { length: 100 }),
    confidence: real("confidence"),
    probabilities: jsonb("probabilities"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runUserFeature: uniqueIndex(
      "idx_detrans_user_features_run_user_feature",
    ).on(table.runId, table.username, table.featureId),
    usernameIdx: index("idx_detrans_user_features_username").on(table.username),
    featureIdx: index("idx_detrans_user_features_feature").on(table.featureId),
  }),
);

export const detransProcessingRunSchema = z.object({
  id: z.number().int(),
  kind: z.string().max(50),
  model: z.string().max(100).nullable(),
  taxonomyVersion: z.string().max(50).nullable(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  stats: z.unknown().nullable(),
  notes: z.string().nullable(),
});

export const detransUserProfileSchema = z.object({
  id: z.number().int(),
  runId: z.number().int(),
  username: z.string().max(255),
  experience: z.string().nullable(),
  experienceSummary: z.string().nullable(),
  redFlagsReport: z.string().nullable(),
  sex: z.string().max(1).nullable(),
  commentCount: z.number().int().nullable(),
  postCount: z.number().int().nullable(),
  charCount: z.number().int().nullable(),
  chunkCount: z.number().int(),
  firstItemDate: z.date().nullable(),
  model: z.string().max(100).nullable(),
  createdAt: z.date(),
});

export const detransUserTimelineSchema = z.object({
  id: z.number().int(),
  runId: z.number().int(),
  username: z.string().max(255),
  firstDysphoriaAge: z.number().int().nullable(),
  transitionAge: z.number().int().nullable(),
  detransitionAge: z.number().int().nullable(),
  hormonesAge: z.number().int().nullable(),
  topSurgeryAge: z.number().int().nullable(),
  bottomSurgeryAge: z.number().int().nullable(),
  pubertyBlockersAge: z.number().int().nullable(),
  transitionYear: z.number().int().nullable(),
  detransitionYear: z.number().int().nullable(),
  timeline: z.unknown().nullable(),
  createdAt: z.date(),
});

export const detransFeatureSchema = z.object({
  id: z.number().int(),
  key: z.string().max(100),
  label: z.string().max(255),
  group: z.string().max(50),
  tier: z.string().max(20),
  kind: z.string().max(10),
  question: z.unknown(),
  tagName: z.string().max(255).nullable(),
  tagType: z.string().max(50).nullable(),
  threshold: z.number().nullable(),
  choiceTagMap: z.unknown().nullable(),
  choiceTagThreshold: z.number().nullable(),
  enabled: z.boolean(),
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const detransUserFeatureSchema = z.object({
  id: z.number().int(),
  runId: z.number().int(),
  username: z.string().max(255),
  featureId: z.number().int(),
  kind: z.string().max(10),
  noul: z.number().nullable(),
  score: z.number().nullable(),
  choice: z.string().max(100).nullable(),
  confidence: z.number().nullable(),
  probabilities: z.unknown().nullable(),
  createdAt: z.date(),
});

export type DetransProcessingRun = z.infer<typeof detransProcessingRunSchema>;
export type DetransUserProfile = z.infer<typeof detransUserProfileSchema>;
export type DetransUserTimeline = z.infer<typeof detransUserTimelineSchema>;
export type DetransFeature = z.infer<typeof detransFeatureSchema>;
export type DetransUserFeature = z.infer<typeof detransUserFeatureSchema>;
