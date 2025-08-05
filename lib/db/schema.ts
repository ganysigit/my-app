import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Notion database connections
export const notionConnections = sqliteTable('notion_connections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull(),
  databaseId: text('database_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Discord channel configurations
export const discordChannels = sqliteTable('discord_channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  botToken: text('bot_token').notNull(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Sync mappings between Notion databases and Discord channels
export const syncMappings = sqliteTable('sync_mappings', {
  id: text('id').primaryKey(),
  notionConnectionId: text('notion_connection_id').notNull().references(() => notionConnections.id, { onDelete: 'cascade' }),
  discordChannelId: text('discord_channel_id').notNull().references(() => discordChannels.id, { onDelete: 'cascade' }),
  projectFilter: text('project_filter'), // Filter by project name, null means all projects
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Issues cache for tracking and deduplication
export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(), // This will be the issue-id from Notion
  issueId: text('issue_id'), // Additional issue identifier
  notionPageId: text('notion_page_id'), // Notion page ID
  notionConnectionId: text('notion_connection_id').notNull().references(() => notionConnections.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // open, fixed, etc.
  project: text('project'),
  bugName: text('bug_name').notNull(),
  bugDescription: text('bug_description'),
  attachedFiles: text('attached_files'), // JSON string of file URLs
  severity: text('severity'),
  notionUrl: text('notion_url'),
  lastSyncedAt: text('last_synced_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Discord messages for tracking synced issues
export const discordMessages = sqliteTable('discord_messages', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  discordChannelId: text('discord_channel_id').notNull().references(() => discordChannels.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull(), // Discord message ID
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Sync operation logs
export const syncLogs = sqliteTable('sync_logs', {
  id: text('id').primaryKey(),
  syncMappingId: text('sync_mapping_id').references(() => syncMappings.id, { onDelete: 'set null' }),
  mappingId: text('mapping_id').references(() => syncMappings.id, { onDelete: 'set null' }),
  operation: text('operation').notNull(), // 'fetch', 'create', 'update', 'delete'
  status: text('status').notNull(), // 'success', 'error', 'warning'
  message: text('message'),
  details: text('details'), // Additional details field
  errorDetails: text('error_details'),
  issuesProcessed: integer('issues_processed').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Application settings
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  description: text('description'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Types for TypeScript
export type NotionConnection = typeof notionConnections.$inferSelect;
export type NewNotionConnection = typeof notionConnections.$inferInsert;

export type DiscordChannel = typeof discordChannels.$inferSelect;
export type NewDiscordChannel = typeof discordChannels.$inferInsert;

export type SyncMapping = typeof syncMappings.$inferSelect;
export type NewSyncMapping = typeof syncMappings.$inferInsert;

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;

export type DiscordMessage = typeof discordMessages.$inferSelect;
export type NewDiscordMessage = typeof discordMessages.$inferInsert;

export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;