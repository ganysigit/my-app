# Project Memory

## Important Project Details

### Technology Stack
- **Framework**: Next.js 14 with App Router (latest stable version)
- **Database**: SQLite with Drizzle ORM for type-safe operations
- **UI Components**: Custom components with Tailwind CSS styling
- **External APIs**: Notion API v1 and Discord API v10
- **Deployment**: Vercel with cron job support
- **Discord Integration**: Discord.js v14.16.3 is installed and configured for bot functionality
- DiscordServerService created for server-only Discord.js usage to avoid Next.js bundling issues
- Uses conditional imports and eval() to prevent Next.js from analyzing Discord.js modules
- WebSocket compression disabled to avoid zlib-sync dependency issues
- Next.js config updated with proper externals and fallbacks for Discord.js
- Bot token validation and WebSocket connections are properly implemented
- All API routes updated to use DiscordServerService instead of SimpleDiscordService

### Code Patterns & Conventions
- Use TypeScript for all files with strict type checking
- Implement proper error handling with try-catch blocks
- Use async/await for all asynchronous operations
- Follow Next.js App Router conventions for API routes
- Use Drizzle ORM query builder syntax consistently

### Environment Variables Structure
- `DISCORD_PUBLIC_KEY`: For webhook signature verification
- `DISCORD_APPLICATION_ID`: Discord application identifier
- `CRON_SECRET`: Protection for automated endpoints
- `DATABASE_URL`: SQLite database connection string
- `NEXT_PUBLIC_APP_URL`: Public application URL for webhooks

### Database Schema Patterns
- All tables use auto-incrementing integer IDs
- Timestamps use `timestamp` type with default current time
- Foreign key relationships properly defined with references
- Use descriptive column names (e.g., `notionConnectionId`, `discordChannelId`)

### API Response Patterns
- Always return proper HTTP status codes
- Use consistent error response format: `{ error: string }`
- Include comprehensive error logging for debugging
- Handle null/undefined database results gracefully

### Discord Integration Specifics
- Custom ID format for buttons: `fix_issue_{issueId}`
- Embed colors mapped to issue severity levels
- Action rows contain "Mark as Fixed" and "View Details" buttons
- Webhook verification required for all Discord interactions

### Sync Logic Patterns
- Process mappings individually to isolate failures
- Cache issues locally to enable incremental sync
- Log all sync operations for analytics and debugging
- Use connection testing before attempting sync operations

### Dashboard Analytics Structure
- Flat data structure for better frontend consumption
- Safe data processing with null checks and fallbacks
- Real-time statistics without nested object complexity
- Consistent naming conventions across API and UI

### Security Considerations
- Never hardcode API keys or secrets in source code
- Verify all webhook signatures from external services
- Use environment variables for all sensitive configuration
- Implement proper input validation and sanitization

### Performance Optimizations
- Limit database queries with appropriate LIMIT clauses
- Use efficient Drizzle ORM query patterns
- Implement proper error boundaries and fallbacks
- Cache frequently accessed data when appropriate

### Deployment Notes
- Vercel cron jobs configured in `vercel.json`
- 6-hour sync schedule: `0 */6 * * *`
- CRON_SECRET environment variable required for security
- All API endpoints designed for serverless deployment

### File Organization
- Services in `/lib/services/` directory
- Database schema in `/lib/db/schema.ts`
- API routes follow Next.js App Router structure
- Shared types and utilities in `/lib/` directory

### Testing Approach
- Test API endpoints with PowerShell `Invoke-WebRequest`
- Verify database operations return expected data structures
- Check error handling with empty/null database scenarios
- Validate webhook signature verification works correctly

### Issue ID Extraction (RESOLVED)
- Notion `unique_id` properties must be extracted using the correct type parameter
- The `extractProperty` method requires 'unique_id' as the type for Notion unique ID fields
- Issue IDs now properly display as ISS57, ISS60, etc. instead of generated user-friendly IDs
- Count queries in API routes must include the same joins as main queries to avoid undefined errors