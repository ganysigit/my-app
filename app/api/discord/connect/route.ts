import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discordChannels, type NewDiscordChannel } from '@/lib/db/schema';
import { DiscordServerService } from '@/lib/services/discord-server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createChannelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  botToken: z.string().min(1, 'Bot token is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
  guildId: z.string().min(1, 'Guild ID is required'),
});

const updateChannelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required').optional(),
  botToken: z.string().min(1, 'Bot token is required').optional(),
  channelId: z.string().min(1, 'Channel ID is required').optional(),
  guildId: z.string().min(1, 'Guild ID is required').optional(),
  isActive: z.boolean().optional(),
});

// GET - List all Discord channels
export async function GET() {
  try {
    const channels = await db
      .select({
        id: discordChannels.id,
        name: discordChannels.name,
        channelId: discordChannels.channelId,
        guildId: discordChannels.guildId,
        isActive: discordChannels.isActive,
        createdAt: discordChannels.createdAt,
        updatedAt: discordChannels.updatedAt,
      })
      .from(discordChannels)
      .orderBy(discordChannels.createdAt);

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST - Create new Discord channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createChannelSchema.parse(body);

    // Test the connection before saving
    const testChannel = {
      id: 'test',
      ...validatedData,
      isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const discordService = new DiscordServerService(testChannel);
    const isValid = await discordService.testConnection();

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Discord bot token or channel ID' },
        { status: 400 }
      );
    }

    // Save the channel
    const newChannel: NewDiscordChannel = {
      id: uuidv4(),
      ...validatedData,
      isActive: true,
    };

    await db.insert(discordChannels).values(newChannel);

    return NextResponse.json(
      { message: 'Channel created successfully', id: newChannel.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating Discord channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}

// PUT - Update Discord channel
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateChannelSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Check if channel exists
    const existingChannel = await db
      .select()
      .from(discordChannels)
      .where(eq(discordChannels.id, id))
      .limit(1);

    if (existingChannel.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // If bot token or channel ID is being updated, test the connection
    if (updateData.botToken || updateData.channelId || updateData.guildId) {
      const testChannel = {
        ...existingChannel[0],
        ...updateData,
      };

      const discordService = new DiscordServerService(testChannel);
      const isValid = await discordService.testConnection();

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid Discord bot token or channel ID' },
          { status: 400 }
        );
      }
    }

    // Update the channel
    await db
      .update(discordChannels)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(discordChannels.id, id));

    return NextResponse.json({ message: 'Channel updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating Discord channel:', error);
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Discord channel
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Check if channel exists
    const existingChannel = await db
      .select()
      .from(discordChannels)
      .where(eq(discordChannels.id, id))
      .limit(1);

    if (existingChannel.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Delete the channel (this will cascade delete related records)
    await db
      .delete(discordChannels)
      .where(eq(discordChannels.id, id));

    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting Discord channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    );
  }
}