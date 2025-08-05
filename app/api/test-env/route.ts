import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    
    return NextResponse.json({
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 10) + '...' : 'No token',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('DISCORD')),
      nodeEnv: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('Environment test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check environment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}