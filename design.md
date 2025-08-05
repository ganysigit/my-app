# Technical Design

## 1. Architecture Overview
- **Framework**: Next.js 14 with App Router for full-stack application
- **Database**: SQLite with Drizzle ORM for type-safe database operations
- **External APIs**: Notion API and Discord API for data synchronization
- **Deployment**: Vercel with cron job support for automated tasks

## 2. Component Breakdown

### Backend Services
- **SyncService**: Core synchronization logic between Notion and Discord
  - `fullSync()`: Complete synchronization of all active mappings
  - `syncMapping()`: Sync individual Notion-Discord mapping
  - Instance methods for cron job compatibility

- **NotionService**: Handles Notion API interactions
  - Database connection management
  - Issue fetching and filtering
  - Status updates for fixed issues

- **DiscordService**: Manages Discord bot operations
  - Message posting with rich embeds
  - Button interaction handling
  - Channel management and validation

### API Endpoints
- **`/api/sync/run`**: Manual sync trigger endpoint
- **`/api/sync/webhook`**: Discord webhook handler for button interactions
- **`/api/cron/sync`**: Automated sync endpoint for Vercel cron
- **`/api/dashboard/stats`**: Analytics data endpoint

### Frontend Components
- **Dashboard**: Main analytics interface with real-time statistics
- **Connection Management**: Notion and Discord connection configuration
- **Sync Mappings**: Configure which Notion databases sync to Discord channels
- **Issue Tracking**: View and manage synchronized issues

## 3. Database Schema

### Core Tables
- **notionConnections**: Store Notion API credentials and database info
- **discordChannels**: Discord channel configurations
- **syncMappings**: Link Notion databases to Discord channels
- **issues**: Cached issue data from Notion
- **syncLogs**: Track sync operations and errors
- **discordMessages**: Map Discord messages to Notion issues

## 4. Data Flow

### Sync Process
1. Cron job triggers `/api/cron/sync` every 6 hours
2. SyncService fetches all active sync mappings
3. For each mapping:
   - Initialize Notion and Discord services
   - Fetch issues from Notion database
   - Compare with cached issues in local database
   - Post new/updated issues to Discord with action buttons
   - Update local cache

### Webhook Process
1. User clicks "Mark as Fixed" button in Discord
2. Discord sends webhook to `/api/sync/webhook`
3. Verify webhook signature and parse interaction
4. Update issue status in Notion
5. Update Discord message to reflect new status
6. Log the interaction

## 5. Security Measures
- **Discord Webhook Verification**: Validate all incoming webhooks
- **Environment Variables**: Secure storage of API keys and secrets
- **CRON Secret**: Protect automated endpoints with secret tokens
- **Input Validation**: Sanitize all user inputs and API responses

## 6. Performance Optimizations
- **Incremental Sync**: Only process changed issues
- **Connection Pooling**: Reuse API connections where possible
- **Error Handling**: Robust error recovery and logging
- **Rate Limiting**: Respect API rate limits for external services