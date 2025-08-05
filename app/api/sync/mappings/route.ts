import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  syncMappings,
  notionConnections,
  discordChannels,
  type NewSyncMapping,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createMappingSchema = z.object({
  notionConnectionId: z.string().min(1, 'Notion connection ID is required'),
  discordChannelId: z.string().min(1, 'Discord channel ID is required'),
  projectFilter: z.string().min(1, 'Project filter is required'),
});

const updateMappingSchema = z.object({
  id: z.string(),
  notionConnectionId: z.string().min(1, 'Notion connection ID is required').optional(),
  discordChannelId: z.string().min(1, 'Discord channel ID is required').optional(),
  projectFilter: z.string().min(1, 'Project filter is required').optional(),
  isActive: z.boolean().optional(),
});

// GET - List all sync mappings with connection details
export async function GET() {
  try {
    const mappings = await db
      .select({
        id: syncMappings.id,
        notionConnectionId: syncMappings.notionConnectionId,
        discordChannelId: syncMappings.discordChannelId,
        projectFilter: syncMappings.projectFilter,
        isActive: syncMappings.isActive,
        createdAt: syncMappings.createdAt,
        updatedAt: syncMappings.updatedAt,
        notionConnectionName: notionConnections.name,
        notionDatabaseId: notionConnections.databaseId,
        discordChannelName: discordChannels.name,
        discordChannelIdValue: discordChannels.channelId,
        discordGuildId: discordChannels.guildId,
      })
      .from(syncMappings)
      .leftJoin(
        notionConnections,
        eq(syncMappings.notionConnectionId, notionConnections.id)
      )
      .leftJoin(
        discordChannels,
        eq(syncMappings.discordChannelId, discordChannels.id)
      )
      .orderBy(syncMappings.createdAt);

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching sync mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

// POST - Create new sync mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createMappingSchema.parse(body);

    // Check if Notion connection exists and is active
    const notionConnection = await db
      .select()
      .from(notionConnections)
      .where(
        and(
          eq(notionConnections.id, validatedData.notionConnectionId),
          eq(notionConnections.isActive, true)
        )
      )
      .limit(1);

    if (notionConnection.length === 0) {
      return NextResponse.json(
        { error: 'Notion connection not found or inactive' },
        { status: 400 }
      );
    }

    // Check if Discord channel exists and is active
    const discordChannel = await db
      .select()
      .from(discordChannels)
      .where(
        and(
          eq(discordChannels.id, validatedData.discordChannelId),
          eq(discordChannels.isActive, true)
        )
      )
      .limit(1);

    if (discordChannel.length === 0) {
      return NextResponse.json(
        { error: 'Discord channel not found or inactive' },
        { status: 400 }
      );
    }

    // Check if mapping already exists for this combination
    const existingMapping = await db
      .select()
      .from(syncMappings)
      .where(
        and(
          eq(syncMappings.notionConnectionId, validatedData.notionConnectionId),
          eq(syncMappings.discordChannelId, validatedData.discordChannelId),
          eq(syncMappings.projectFilter, validatedData.projectFilter)
        )
      )
      .limit(1);

    if (existingMapping.length > 0) {
      return NextResponse.json(
        { error: 'Mapping already exists for this combination' },
        { status: 400 }
      );
    }

    // Create the mapping
    const newMapping: NewSyncMapping = {
      id: uuidv4(),
      ...validatedData,
      isActive: true,
    };

    await db.insert(syncMappings).values(newMapping);

    return NextResponse.json(
      { message: 'Mapping created successfully', id: newMapping.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating sync mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 }
    );
  }
}

// PUT - Update sync mapping
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateMappingSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Check if mapping exists
    const existingMapping = await db
      .select()
      .from(syncMappings)
      .where(eq(syncMappings.id, id))
      .limit(1);

    if (existingMapping.length === 0) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    // If updating connections, validate they exist and are active
    if (updateData.notionConnectionId) {
      const notionConnection = await db
        .select()
        .from(notionConnections)
        .where(
          and(
            eq(notionConnections.id, updateData.notionConnectionId),
            eq(notionConnections.isActive, true)
          )
        )
        .limit(1);

      if (notionConnection.length === 0) {
        return NextResponse.json(
          { error: 'Notion connection not found or inactive' },
          { status: 400 }
        );
      }
    }

    if (updateData.discordChannelId) {
      const discordChannel = await db
        .select()
        .from(discordChannels)
        .where(
          and(
            eq(discordChannels.id, updateData.discordChannelId),
            eq(discordChannels.isActive, true)
          )
        )
        .limit(1);

      if (discordChannel.length === 0) {
        return NextResponse.json(
          { error: 'Discord channel not found or inactive' },
          { status: 400 }
        );
      }
    }

    // Update the mapping
    await db
      .update(syncMappings)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(syncMappings.id, id));

    return NextResponse.json({ message: 'Mapping updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating sync mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sync mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    // Check if mapping exists
    const existingMapping = await db
      .select()
      .from(syncMappings)
      .where(eq(syncMappings.id, id))
      .limit(1);

    if (existingMapping.length === 0) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    // Delete the mapping
    await db
      .delete(syncMappings)
      .where(eq(syncMappings.id, id));

    return NextResponse.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting sync mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}