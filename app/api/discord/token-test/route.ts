import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Discord bot token not configured' },
        { status: 500 }
      );
    }

    // Simple token validation using Discord API
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: 'Invalid Discord bot token',
          details: `HTTP ${response.status}: ${errorText}`
        },
        { status: 401 }
      );
    }

    const botInfo = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Discord bot token is valid',
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        discriminator: botInfo.discriminator
      }
    });
    
  } catch (error) {
    console.error('Discord token validation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate Discord token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}