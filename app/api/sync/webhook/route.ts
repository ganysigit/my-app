import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { db } from '@/lib/db';
import { issues, syncLogs, notionConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NotionService } from '@/lib/services/notion';

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    // Get Discord public key from environment
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      return NextResponse.json({ error: 'Discord public key not configured' }, { status: 500 });
    }

    // Verify Discord signature
    const isValidRequest = verifyKey(body, signature, timestamp, publicKey);
    if (!isValidRequest) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const interaction = JSON.parse(body);

    // Handle ping
    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // Handle button interactions
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data.custom_id;
      
      if (customId.startsWith('fix_issue_')) {
        const issueId = customId.replace('fix_issue_', '');
        
        try {
          // Find the issue in our database
          const issue = await db.select().from(issues).where(eq(issues.issueId, issueId)).limit(1);
          
          if (issue.length === 0) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Issue not found in database.',
                flags: 64 // Ephemeral
              }
            });
          }

          const issueData = issue[0];
          
          // Get the Notion connection for this issue
          const notionConnection = await db.select()
            .from(notionConnections)
            .where(eq(notionConnections.id, issueData.notionConnectionId))
            .limit(1);
          
          if (notionConnection.length === 0) {
            throw new Error('Notion connection not found');
          }
          
          // Update status in Notion
          const notionService = new NotionService(notionConnection[0]);
          await notionService.updateIssueStatus(issueData.notionPageId, 'Fixed');
          
          // Update status in our database
          await db.update(issues)
            .set({ 
              status: 'Fixed',
              updatedAt: new Date()
            })
            .where(eq(issues.issueId, issueId));
          
          // Log the sync operation
          await db.insert(syncLogs).values({
            operation: 'discord_mark_fixed',
            issueId: issueId,
            status: 'success',
            details: `Issue marked as fixed via Discord button by user ${interaction.member?.user?.username || 'unknown'}`,
            createdAt: new Date()
          });

          return NextResponse.json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
              content: `✅ Issue "${issueData.bugName}" has been marked as fixed!`,
              embeds: [],
              components: []
            }
          });
          
        } catch (error) {
          console.error('Error marking issue as fixed:', error);
          
          // Log the error
          await db.insert(syncLogs).values({
            operation: 'discord_mark_fixed',
            issueId: issueId,
            status: 'error',
            details: `Error marking issue as fixed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            createdAt: new Date()
          });
          
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Failed to mark issue as fixed. Please try again.',
              flags: 64 // Ephemeral
            }
          });
        }
      }
    }

    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ message: 'Discord webhook endpoint' });
}