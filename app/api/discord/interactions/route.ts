import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync';
import { DiscordInteractionHandler } from '@/lib/services/discord-simple';
import { z } from 'zod';

const interactionSchema = z.object({
  type: z.number(),
  data: z.object({
    custom_id: z.string(),
    component_type: z.number(),
  }).optional(),
  member: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
    }),
  }).optional(),
  user: z.object({
    id: z.string(),
    username: z.string(),
  }).optional(),
  token: z.string(),
  id: z.string(),
  application_id: z.string(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  message: z.object({
    id: z.string(),
  }).optional(),
});

// POST - Handle Discord interactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Discord sends a PING interaction to verify the endpoint
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // Handle button interactions
    if (body.type === 3) {
      const validatedData = interactionSchema.parse(body);
      
      if (!validatedData.data?.custom_id) {
        return NextResponse.json(
          { error: 'Invalid interaction data' },
          { status: 400 }
        );
      }

      const result = DiscordInteractionHandler.parseCustomId(validatedData.data.custom_id);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Invalid custom_id format' },
          { status: 400 }
        );
      }
      
      const { issueId, action } = result;

      const user = validatedData.member?.user || validatedData.user;

      if (action === 'fix') {
        if (!issueId) {
          return NextResponse.json(
            { error: 'Issue ID is required for fix action' },
            { status: 400 }
          );
        }
        
        // Handle "Mark as Fixed" button
        const result = await SyncService.handleDiscordInteraction(
          issueId,
          'fix'
        );

        if (result) {
          return NextResponse.json({
            type: 4,
            data: {
              content: `✅ Issue **${issueId}** has been marked as fixed by ${user?.username || 'Unknown User'}!`,
              flags: 64, // Ephemeral message (only visible to the user who clicked)
            },
          });
        } else {
          return NextResponse.json({
            type: 4,
            data: {
              content: `❌ Failed to mark issue **${issueId}** as fixed`,
              flags: 64, // Ephemeral message
            },
          });
        }
      } else if (action === 'view') {
          // Handle "View Details" button - for now just show a message
          return NextResponse.json({
            type: 4,
            data: {
              content: `👁️ Viewing details for issue ${issueId}`,
              flags: 64, // Ephemeral
            },
          });
      }

      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Unsupported interaction type' },
      { status: 400 }
    );
  } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: err.errors },
          { status: 400 }
        );
      }

      console.error('Error handling Discord interaction:', err);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}

// GET - Health check for Discord webhook
export async function GET() {
  return NextResponse.json({ status: 'Discord interaction endpoint is active' });
}