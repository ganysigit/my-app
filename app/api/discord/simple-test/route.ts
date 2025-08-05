import { NextRequest, NextResponse } from 'next/server';
import { SimpleDiscordService } from '@/lib/services/discord-simple';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Discord bot token not configured' },
        { status: 500 }
      );
    }

    // Initialize Discord service
    const discordService = new SimpleDiscordService();
    await discordService.initialize(token);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Discord using simple client'
    });
    
  } catch (error) {
    console.error('Discord connection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to Discord',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}