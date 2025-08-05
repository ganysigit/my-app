import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/sync';
import { z } from 'zod';

const runSyncSchema = z.object({
  mappingId: z.string().optional(),
  force: z.boolean().default(false),
});

// POST - Run sync operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappingId } = runSyncSchema.parse(body);

    let result;

    if (mappingId) {
      // Run sync for specific mapping
      // Note: This would need to be implemented to accept just mappingId
      // For now, we'll run full sync
      result = await SyncService.runFullSync();
    } else {
      // Run full sync for all active mappings
      result = await SyncService.runFullSync();
    }

    return NextResponse.json({
      message: 'Sync completed successfully',
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error running sync:', error);
    return NextResponse.json(
      { error: 'Failed to run sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Get sync status and statistics
export async function GET() {
  try {
    const stats = await SyncService.getSyncStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync stats' },
      { status: 500 }
    );
  }
}