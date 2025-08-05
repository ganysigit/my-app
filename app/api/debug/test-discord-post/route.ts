import { NextResponse } from 'next/server';
import { DiscordServerService } from '@/lib/services/discord-server';
import { db } from '@/lib/db';
import { discordChannels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('=== TESTING DISCORD POST ===');
    
    // Get the first active Discord channel
    const channels = await db
      .select()
      .from(discordChannels)
      .where(eq(discordChannels.isActive, true))
      .limit(1);
    
    if (channels.length === 0) {
      console.log('No active Discord channels found');
      return NextResponse.json({ error: 'No active Discord channels found' }, { status: 404 });
    }
    
    const channel = channels[0];
    console.log(`Using Discord channel: ${channel.name} (${channel.channelId})`);
    
    // Create Discord service instance
    const discordService = new DiscordServerService(channel);
    
    // Test issue data
    const testIssue = {
      id: 'test-issue-' + Date.now(),
      title: 'Test Discord Posting',
      status: 'Open',
      priority: 'High',
      assignee: 'Test User',
      description: 'This is a test message to verify Discord posting functionality.',
      url: 'https://example.com/test-issue'
    };
    
    console.log('Attempting to post test issue to Discord...');
    const messageId = await discordService.postIssue(testIssue);
    console.log(`Discord post result - messageId: ${messageId}`);
    
    if (messageId) {
      return NextResponse.json({
        success: true,
        message: 'Test message posted successfully',
        messageId,
        channelId: channel.channelId,
        channelName: channel.name
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to post test message - no messageId returned'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error testing Discord post:', error);
    return NextResponse.json(
      { error: 'Failed to test Discord post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}