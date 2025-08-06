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

### shadcn/ui Component Guidelines
- SelectItem components must never have empty string or space-only values
- Use "all" as the value for filter reset options instead of empty strings
- Always handle "all" value in onValueChange handlers to clear filters
- DataTable template requires proper value handling for all Select components

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

### UI Table Improvements (RESOLVED)
- Fixed issue ID truncation by removing `.slice(0, 8)` limitation
- Added hyphen formatting to issue IDs using regex: `issue.issueId.replace(/^([A-Z]+)(\d+)$/, '$1-$2')`
- Made data table horizontally scrollable with `overflow-x-auto w-full` and `min-w-full`
- Added `whitespace-nowrap` to table headers and cells to prevent text wrapping
- Issue IDs now display in full ISS-57 format instead of truncated ISS57... format
- Removed Actions column and associated ExternalLink functionality as it was not useful
- Cleaned up unused ExternalLink import and openNotionPage function
- Redesigned filters layout following shadcn/ui themes:
  - Removed card backgrounds for cleaner look
  - Improved search bar with integrated search icon
  - Used flex layout for better responsive filter controls
  - Added proper placeholders and minimum widths for select components
  - Replaced card-based table container with simple border styling
  - Updated "No issues found" section with dashed border styling

### shadcn/ui Dashboard-01 Implementation
- Installed official shadcn/ui dashboard-01 component using `npx shadcn@latest add dashboard-01`
- Updated stats cards with gradient styling, container queries, and data-slot attributes
- Applied tabular-nums font for consistent number display
- Implemented responsive @container queries for adaptive layouts
- Updated filters section with compact controls (h-9 height, text-xs size)
- Applied modern table styling with improved spacing and hover effects
- Used tracking-tight for headings and consistent text-xs for smaller elements
- Implemented group hover effects and proper padding (px-4 py-3)
- Applied rounded-lg borders and bg-card backgrounds consistently
- Used flex-col gap-4 patterns for consistent spacing throughout

### Dashboard Template Adjustment
- Replaced template components with actual app functionality
- Removed unused imports: ChartAreaInteractive, DataTable, SectionCards
- Integrated IssuesTab component as main dashboard content
- Maintained shadcn/ui sidebar and header structure
- Kept responsive layout with @container/main patterns
- Dashboard now shows actual issues tracking functionality instead of template data

### DataTable Template Implementation
- Implemented shadcn/ui DataTable template for issues display
- Added advanced filtering capabilities (search, status, project, severity, sync status)
- Integrated sorting functionality for all columns
- Added pagination with customizable page sizes
- Implemented column visibility controls
- Added row selection with bulk actions support
- Replaced custom table implementation with template-based solution
- Maintained issue-specific styling and color coding