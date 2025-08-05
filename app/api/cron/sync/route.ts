import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncMappings, notionConnections, discordChannels, issues, syncLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NotionService } from '@/lib/services/notion';
import { SimpleDiscordService } from '@/lib/services/discord-simple';
import { SyncService } from '@/lib/services/sync';

// This endpoint can be called by external cron services like Vercel Cron or GitHub Actions
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled sync job...');
    
    // Get all active sync mappings
    const activeMappings = await db.select({
      id: syncMappings.id,
      notionConnectionId: syncMappings.notionConnectionId,
      discordChannelId: syncMappings.discordChannelId,
      projectFilter: syncMappings.projectFilter,
      lastSyncAt: syncMappings.lastSyncAt
    })
    .from(syncMappings)
    .where(eq(syncMappings.isActive, true));

    if (activeMappings.length === 0) {
      console.log('No active sync mappings found');
      return NextResponse.json({ message: 'No active sync mappings', synced: 0 });
    }

    let totalSynced = 0;
    const results = [];

    // Process each mapping
    for (const mapping of activeMappings) {
      try {
        console.log(`Processing mapping ${mapping.id}...`);
        
        // Get Notion connection
        const notionConnection = await db.select()
          .from(notionConnections)
          .where(eq(notionConnections.id, mapping.notionConnectionId))
          .limit(1);
        
        if (notionConnection.length === 0) {
          console.error(`Notion connection ${mapping.notionConnectionId} not found`);
          continue;
        }

        // Get Discord channel
        const discordChannel = await db.select()
          .from(discordChannels)
          .where(eq(discordChannels.id, mapping.discordChannelId))
          .limit(1);
        
        if (discordChannel.length === 0) {
          console.error(`Discord channel ${mapping.discordChannelId} not found`);
          continue;
        }

        // Initialize services
        const notionService = new NotionService(notionConnection[0]);
        const discordService = new SimpleDiscordService(discordChannel[0]);
        const syncService = new SyncService();

        // Perform sync
        const syncResult = await syncService.syncMapping({
          id: mapping.id,
          notionConnection: notionConnection[0],
          discordChannel: discordChannel[0],
          projectFilter: mapping.projectFilter,
          lastSyncAt: mapping.lastSyncAt
        });

        totalSynced += syncResult.syncedCount;
        results.push({
          mappingId: mapping.id,
          success: true,
          syncedCount: syncResult.syncedCount,
          message: syncResult.message
        });

        // Log successful sync
        await db.insert(syncLogs).values({
          operation: 'scheduled_sync',
          mappingId: mapping.id,
          status: 'success',
          details: `Synced ${syncResult.syncedCount} issues`,
          createdAt: new Date()
        });

        // Update last sync time
        await db.update(syncMappings)
          .set({ lastSyncAt: new Date() })
          .where(eq(syncMappings.id, mapping.id));

      } catch (error) {
        console.error(`Error syncing mapping ${mapping.id}:`, error);
        
        results.push({
          mappingId: mapping.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Log failed sync
        await db.insert(syncLogs).values({
          operation: 'scheduled_sync',
          mappingId: mapping.id,
          status: 'error',
          details: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          createdAt: new Date()
        });
      }
    }

    console.log(`Scheduled sync completed. Total synced: ${totalSynced}`);
    
    return NextResponse.json({
      message: 'Scheduled sync completed',
      totalMappings: activeMappings.length,
      totalSynced,
      results
    });
    
  } catch (error) {
    console.error('Scheduled sync error:', error);
    
    // Log the error
    await db.insert(syncLogs).values({
      operation: 'scheduled_sync',
      status: 'error',
      details: `Scheduled sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      createdAt: new Date()
    });
    
    return NextResponse.json(
      { error: 'Scheduled sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle POST requests for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}