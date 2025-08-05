import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('./sqlite.db');
export const db = drizzle(sqlite, { schema });

// Initialize database with default settings
export async function initializeDatabase() {
  try {
    // Insert default settings if they don't exist
    const defaultSettings = [
      {
        id: 'sync-interval',
        key: 'sync_interval_minutes',
        value: '5',
        description: 'Sync interval in minutes',
      },
      {
        id: 'max-retries',
        key: 'max_sync_retries',
        value: '3',
        description: 'Maximum number of sync retries on failure',
      },
      {
        id: 'webhook-secret',
        key: 'discord_webhook_secret',
        value: '',
        description: 'Discord webhook verification secret',
      },
    ];

    for (const setting of defaultSettings) {
      await db.insert(schema.settings)
        .values(setting)
        .onConflictDoNothing();
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}