import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const dramasTable = pgTable('dramas', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  genre: text('genre').notNull(),
  description: text('description').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull().default(''),
  totalEpisodes: integer('total_episodes').notNull().default(0),
  freeEpisodes: integer('free_episodes').notNull().default(2),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  isNew: boolean('is_new').notNull().default(false),
  isTrending: boolean('is_trending').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type InsertDrama = typeof dramasTable.$inferInsert;
export type Drama = typeof dramasTable.$inferSelect;

export const episodesTable = pgTable(
  'episodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dramaId: uuid('drama_id')
      .notNull()
      .references(() => dramasTable.id, { onDelete: 'cascade' }),
    episodeNumber: integer('episode_number').notNull(),
    title: text('title').notNull(),
    durationSeconds: integer('duration_seconds').notNull().default(120),
    videoUrl: text('video_url'),
    thumbnailUrl: text('thumbnail_url').notNull().default(''),
    isLocked: boolean('is_locked').notNull().default(true),
    coinCost: integer('coin_cost').notNull().default(5),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('episodes_drama_ep_idx').on(table.dramaId, table.episodeNumber)],
);

export type InsertEpisode = typeof episodesTable.$inferInsert;
export type Episode = typeof episodesTable.$inferSelect;

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  coinBalance: integer('coin_balance').notNull().default(10),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const unlocksTable = pgTable(
  'unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('unlocks_user_episode_idx').on(table.userId, table.episodeId)],
);

export type InsertUnlock = typeof unlocksTable.$inferInsert;
export type Unlock = typeof unlocksTable.$inferSelect;

export const coinTransactionsTable = pgTable('coin_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  episodeId: uuid('episode_id').references(() => episodesTable.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type InsertCoinTransaction = typeof coinTransactionsTable.$inferInsert;
export type CoinTransaction = typeof coinTransactionsTable.$inferSelect;

export const likesTable = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('likes_user_episode_idx').on(table.userId, table.episodeId)],
);

export type InsertLike = typeof likesTable.$inferInsert;
export type Like = typeof likesTable.$inferSelect;

export const dramasRelations = relations(dramasTable, ({ many }) => ({
  episodes: many(episodesTable),
}));

export const episodesRelations = relations(episodesTable, ({ one, many }) => ({
  drama: one(dramasTable, { fields: [episodesTable.dramaId], references: [dramasTable.id] }),
  unlocks: many(unlocksTable),
  likes: many(likesTable),
  coinTransactions: many(coinTransactionsTable),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  unlocks: many(unlocksTable),
  likes: many(likesTable),
  coinTransactions: many(coinTransactionsTable),
}));

export const unlocksRelations = relations(unlocksTable, ({ one }) => ({
  user: one(usersTable, { fields: [unlocksTable.userId], references: [usersTable.id] }),
  episode: one(episodesTable, { fields: [unlocksTable.episodeId], references: [episodesTable.id] }),
}));

export const likesRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, { fields: [likesTable.userId], references: [usersTable.id] }),
  episode: one(episodesTable, { fields: [likesTable.episodeId], references: [episodesTable.id] }),
}));

export const coinTransactionsRelations = relations(coinTransactionsTable, ({ one }) => ({
  user: one(usersTable, { fields: [coinTransactionsTable.userId], references: [usersTable.id] }),
  episode: one(episodesTable, {
    fields: [coinTransactionsTable.episodeId],
    references: [episodesTable.id],
  }),
}));
