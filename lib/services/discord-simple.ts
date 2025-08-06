// Simple Discord client implementation that avoids zlib-sync dependency
// This uses a basic WebSocket connection without compression

import { EventEmitter } from 'events';

interface DiscordMessage {
  op: number;
  d?: Record<string, unknown>;
  s?: number;
  t?: string;
}

interface DiscordGatewayInfo {
  url: string;
  shards: number;
  session_start_limit: {
    total: number;
    remaining: number;
    reset_after: number;
    max_concurrency: number;
  };
}

export class SimpleDiscordClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private token: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastSequence: number | null = null;
  private sessionId: string | null = null;
  private isReady = false;

  constructor(token: string) {
    super();
    this.token = token;
  }

  async connect(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        // Server-side: just validate the token without WebSocket connection
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: {
            'Authorization': `Bot ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to validate token: ${response.status}`);
        }

        // Simulate ready state for server-side
        this.isReady = true;
        setTimeout(() => this.emit('ready'), 100);
        return;
      }

      // Get gateway URL from Discord API
      const gatewayResponse = await fetch('https://discord.com/api/v10/gateway/bot', {
        headers: {
          'Authorization': `Bot ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!gatewayResponse.ok) {
        throw new Error(`Failed to get gateway info: ${gatewayResponse.status}`);
      }

      const gatewayInfo: DiscordGatewayInfo = await gatewayResponse.json();
      const gatewayUrl = `${gatewayInfo.url}/?v=10&encoding=json`;

      // Connect to WebSocket (browser only)
      this.ws = new WebSocket(gatewayUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to Discord Gateway');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = (event) => {
        console.log('Discord WebSocket closed:', event.code, event.reason);
        this.cleanup();
      };

      this.ws.onerror = (error) => {
        console.error('Discord WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      throw error;
    }
  }

  private handleMessage(message: DiscordMessage): void {
    const { op, d, s, t } = message;

    if (s !== null && s !== undefined) {
      this.lastSequence = s;
    }

    switch (op) {
      case 10: // Hello
        if (d && typeof d === 'object' && 'heartbeat_interval' in d) {
          this.startHeartbeat(d.heartbeat_interval as number);
        }
        this.identify();
        break;

      case 11: // Heartbeat ACK
        console.log('Heartbeat acknowledged');
        break;

      case 0: // Dispatch
        if (d) {
          this.handleDispatch(t!, d);
        }
        break;

      default:
        console.log('Unknown opcode:', op);
    }
  }

  private handleDispatch(eventType: string, data: Record<string, unknown>): void {
    switch (eventType) {
      case 'READY':
        this.sessionId = typeof data.session_id === 'string' ? data.session_id : null;
        this.isReady = true;
        console.log('Discord client ready!');
        this.emit('ready');
        break;

      case 'GUILD_CREATE':
        console.log('Guild available:', data.name);
        break;

      default:
        console.log('Unhandled event:', eventType);
    }
  }

  private startHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          op: 1,
          d: this.lastSequence
        }));
      }
    }, interval);
  }

  private identify(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        op: 2,
        d: {
          token: this.token,
          intents: 513, // GUILDS + GUILD_MESSAGES
          properties: {
            os: 'linux',
            browser: 'simple-discord-client',
            device: 'simple-discord-client'
          }
        }
      }));
    }
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isReady = false;
    this.sessionId = null;
    this.lastSequence = null;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
      } else {
        this.once('ready', resolve);
      }
    });
  }
}

export class DiscordInteractionHandler {
  static parseCustomId(customId: string): { action: string; issueId?: string } {
    // Parse custom IDs like "issue_123_update"
    const parts = customId.split('_');
    if (parts.length >= 2) {
      return {
        action: parts[parts.length - 1],
        issueId: parts.length > 2 ? parts[1] : undefined
      };
    }
    return { action: customId };
  }
}

export class SimpleDiscordService {
  private client: SimpleDiscordClient | null = null;
  private token: string | null = null;
  private channelId: string | null = null;

  constructor(discordChannel: { botToken: string; channelId: string }) {
    this.token = discordChannel.botToken;
    this.channelId = discordChannel.channelId;
  }

  async initialize(token: string): Promise<void> {
    this.token = token;
    this.client = new SimpleDiscordClient(token);
    
    await this.client.connect();
    await this.client.waitForReady();
  }

  async testConnection(channelId?: string): Promise<boolean> {
    try {
      if (!this.token) {
        console.error('Discord token is missing');
        return false;
      }

      // Test basic API access
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Discord API authentication failed: ${response.status} ${response.statusText}`);
        return false;
      }

      // Test access to the configured channel or provided channelId
      const targetChannelId = channelId || this.channelId;
      if (targetChannelId) {
        const channelResponse = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}`, {
          headers: {
            'Authorization': `Bot ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!channelResponse.ok) {
          console.error(`Discord channel access failed for channel ${targetChannelId}: ${channelResponse.status} ${channelResponse.statusText}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Discord connection test failed:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.client !== null;
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup method for sync operations
    // This method is called after sync operations to clean up resources
    this.disconnect();
  }
}