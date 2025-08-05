import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Discord connection without importing discord.js at build time
 */
export async function GET(request: NextRequest) {
  try {
    // Test if we can dynamically import discord.js at runtime
    const discordModule = await import('discord.js');
    const { Client, GatewayIntentBits } = discordModule;
    
    // Create a minimal client to test the import
    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });
    
    // Don't actually connect, just test if the client can be created
    const status = {
      success: true,
      message: 'Discord.js module loaded successfully',
      clientCreated: !!client,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Discord test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}