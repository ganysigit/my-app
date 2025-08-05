import { DiscordServerService } from '@/lib/services/discord-server';
import { DiscordChannel } from '@/lib/db/schema';

export async function GET() {
  try {
    // Create a test channel object for testing
    const testChannel: DiscordChannel = {
      id: 'test-channel-id',
      guildId: 'test-guild-id',
      channelId: 'test-channel-id',
      botToken: process.env.DISCORD_BOT_TOKEN || 'test-token',
      name: 'Test Channel',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const discordService = new DiscordServerService(testChannel);
    await discordService.initialize();
    
    return Response.json({ 
      success: true, 
      message: 'Discord bot connected successfully with DiscordServerService!' 
    });
  } catch (error) {
    console.error('Discord connection error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}