import { Client, GatewayIntentBits } from 'discord.js';

/**
 * Custom Discord client wrapper that handles optional dependencies gracefully
 */
export function createDiscordClient(options: {
  intents: GatewayIntentBits[];
  ws?: Record<string, unknown>;
}) {
  try {
    // Create client with minimal WebSocket options to avoid zlib-sync dependency
    const client = new Client({
      intents: options.intents,
      ws: {
        // Set WebSocket options
        ...options.ws
      },
    });
    
    return client;
  } catch (error) {
    console.error('Failed to create Discord client:', error);
    throw error;
  }
}

/**
 * Alternative client creation with error handling for missing dependencies
 */
export async function createDiscordClientSafe(options: {
  intents: GatewayIntentBits[];
  ws?: Record<string, unknown>;
}) {
  try {
    return createDiscordClient(options);
  } catch (error) {
    console.warn('Primary Discord client creation failed, trying fallback:', error);
    
    // Fallback: Create client with minimal configuration
    const client = new Client({
      intents: options.intents,
      ws: {
        version: 10,
      },
    });
    
    return client;
  }
}