# Notion-Discord Sync Service

A full-stack Next.js application that provides robust two-way synchronization between Notion databases and Discord channels. The service monitors Notion databases for "open" issues and syncs them to Discord channels with beautiful embeds, allowing users to update issue statuses directly from Discord with interactive buttons.

## Features

- **Multi-Database Support**: Connect multiple Notion databases
- **Multi-Channel Sync**: Sync to multiple Discord channels with project-based filtering
- **Two-Way Sync**: Update issue status from Discord back to Notion
- **Real-time Dashboard**: Monitor connections, sync status, and issue statistics with analytics
- **Smart Filtering**: Only syncs "open" status issues from Notion with project-based filtering
- **Interactive Discord Bot**: Mark issues as "Fixed" directly from Discord with button interactions
- **Robust Error Handling**: Gracefully handles Discord message sync failures and API errors
- **Comprehensive Logging**: Track all sync operations, errors, and recovery actions
- **Beautiful Discord Embeds**: Rich, formatted issue displays with severity indicators

## Tech Stack

- **Framework**: Next.js 15 (Full-stack with App Router)
- **UI**: shadcn/ui + Tailwind CSS + Lucide Icons
- **Database**: SQLite with Drizzle ORM and migrations
- **APIs**: Notion API v1, Discord API v10
- **Charts**: Recharts for analytics visualization
- **Deployment**: Compatible with Cloudflare Workers and traditional hosting

## Prerequisites

1. **Notion Integration**: Create a Notion integration and get your API key
2. **Discord Bot**: Create a Discord application and bot
3. **Node.js**: Version 18 or higher

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd my-app
npm install
```

### 2. Environment Configuration

Copy `.env.local` and fill in your API credentials:

```bash
# Notion API Configuration
NOTION_API_KEY=your_notion_api_key_here

# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_APPLICATION_ID=your_discord_application_id_here
DISCORD_PUBLIC_KEY=your_discord_public_key_here

# Database Configuration
DATABASE_URL=./sqlite.db

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Notion Database Schema

Your Notion database must have these columns:

- **issue-id** (Title or Text): Unique identifier for each issue
- **status** (Select): Issue status (must include "open" and "fixed" options)
- **project** (Select): Project categorization for filtering
- **bug-name** (Text): Issue title/name
- **bug-description** (Text): Detailed description
- **attached-files** (Files): File attachments
- **severity** (Select): Issue severity level

### 5. Discord Bot Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and get the bot token
3. Enable "Message Content Intent" in bot settings
4. Invite the bot to your Discord server with appropriate permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Read Message History

### 6. Run the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### 1. Dashboard Access

Navigate to `http://localhost:3000/dashboard` to access the main dashboard.

### 2. Setup Connections

1. **Notion Connections**: Add your Notion database connections
   - Provide database ID (found in Notion database URL)
   - Test connection to verify access

2. **Discord Channels**: Add Discord channel connections
   - Provide channel ID and guild ID
   - Test connection to verify bot access

### 3. Create Sync Mappings

1. Go to "Sync Mappings" tab
2. Create mappings between Notion databases and Discord channels
3. Specify project filters to control which issues sync to which channels

### 4. Monitor Sync Status

- View sync statistics on the Overview tab
- Monitor individual issues in the Issues tab
- Check sync logs for troubleshooting

## API Endpoints

### Notion Connections
- `GET /api/notion/connect` - List connections
- `POST /api/notion/connect` - Create connection
- `PUT /api/notion/connect` - Update connection
- `DELETE /api/notion/connect` - Delete connection

### Discord Channels
- `GET /api/discord/connect` - List channels
- `POST /api/discord/connect` - Create channel
- `PUT /api/discord/connect` - Update channel
- `DELETE /api/discord/connect` - Delete channel

### Sync Operations
- `GET /api/sync/mappings` - List sync mappings
- `POST /api/sync/mappings` - Create mapping
- `PUT /api/sync/mappings` - Update mapping
- `DELETE /api/sync/mappings` - Delete mapping
- `POST /api/sync/run` - Run sync operation
- `GET /api/sync/run` - Get sync status

### Issues
- `GET /api/issues` - List issues with filtering
- `POST /api/issues` - Get issue statistics

### Discord Interactions
- `POST /api/discord/interactions` - Handle Discord button interactions

## Database Schema

The application uses SQLite with the following tables:

- **notion_connections**: Notion database connections
- **discord_channels**: Discord channel configurations
- **sync_mappings**: Mappings between Notion and Discord
- **issues**: Cached issue data from Notion
- **discord_messages**: Discord message tracking
- **sync_logs**: Sync operation logs
- **settings**: Application configuration

## Deployment

### Cloudflare Workers

This application is compatible with Cloudflare Workers Node.js runtime:

1. Ensure `nodejs_compat` flag is enabled
2. Use Cloudflare D1 for the database instead of SQLite
3. Update database configuration in `drizzle.config.ts`
4. Deploy using Wrangler CLI

### Traditional Hosting

Can be deployed to any Node.js hosting platform:
- Vercel
- Netlify
- Railway
- DigitalOcean App Platform

## Troubleshooting

### Common Issues

1. **Notion API Errors**: Verify API key and database permissions
2. **Discord Bot Errors**: Check bot token and server permissions
3. **Discord Message Sync Failures**: The system automatically handles "Unknown Message" errors by recreating messages
4. **Sync Issues**: Review sync logs in the dashboard for detailed error information
5. **Database Errors**: Ensure migrations are run correctly

### Debug Mode

Set `NODE_ENV=development` for detailed logging.

### Database Management

```bash
# View database in browser
npm run db:studio

# Reset database
rm sqlite.db
npm run db:migrate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
