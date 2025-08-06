// Server-only Discord service that only loads Discord.js in Node.js environment
import { DiscordChannel } from '../db/schema';
import { NotionIssue } from './notion';

export interface DiscordIssueMessage {
  messageId: string;
  channelId: string;
  issueId: string;
}

/**
 * Server-only Discord service that conditionally loads Discord.js
 * This prevents Next.js from trying to bundle Discord.js for the client
 */
export class DiscordServerService {
  private client: import('discord.js').Client | null = null;
  private channel: DiscordChannel;
  private isReady: boolean = false;
  private discordModule: typeof import('discord.js') | null = null;

  constructor(channel: DiscordChannel) {
    this.channel = channel;
  }

  /**
   * Check if we're running in a server environment
   */
  private isServerEnvironment(): boolean {
    return typeof window === 'undefined' && typeof process !== 'undefined';
  }

  /**
   * Dynamically import discord.js only in server environment
   */
  private async loadDiscordModule() {
    if (!this.isServerEnvironment()) {
      throw new Error('Discord.js can only be used in server environment');
    }

    if (this.discordModule) return this.discordModule;
    
    try {
      // Use eval to prevent Next.js from analyzing this import
      const importPath = 'discord.js';
      this.discordModule = await eval(`import('${importPath}')`);
      return this.discordModule;
    } catch (error) {
      console.error('Failed to load discord.js module:', error);
      throw new Error(`Discord module loading failed: ${error}`);
    }
  }

  /**
   * Initialize the Discord client
   */
  async initialize(): Promise<void> {
    if (!this.isServerEnvironment()) {
      throw new Error('Discord service can only be initialized on server');
    }

    if (this.isReady) return;

    try {
      // Load discord.js dynamically
      const discord = await this.loadDiscordModule();
      if (!discord) {
        throw new Error('Failed to load Discord module');
      }
      const { Client, GatewayIntentBits } = discord;

      // Create the client
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      // Set up event handlers after client creation
      this.setupEventHandlers();

      if (!this.client) {
        throw new Error('Discord client is not initialized');
      }
      await this.client.login(this.channel.botToken);
      await this.waitForReady();
      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize Discord client:', error);
      throw new Error(`Discord initialization failed: ${error}`);
    }
  }

  /**
   * Wait for the client to be ready
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        throw new Error('Discord client is not initialized');
      }
      if (this.client.isReady()) {
        resolve();
      } else {
        this.client.once('ready', () => resolve());
      }
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) {
      throw new Error('Discord client is not initialized');
    }
    this.client.on('ready', () => {
      console.log(`Discord bot logged in as ${this.client?.user?.tag}`);
    });

    this.client.on('error', (error: Error) => {
      console.error('Discord client error:', error);
    });

    this.client.on('warn', (warning: string) => {
      console.warn('Discord client warning:', warning);
    });
  }

  /**
   * Test the connection without full initialization
   */
  async testConnection(): Promise<boolean> {
    if (!this.isServerEnvironment()) {
      return false;
    }

    try {
      const discord = await this.loadDiscordModule();
      if (!discord) {
        throw new Error('Failed to load Discord module');
      }
      const { Client, GatewayIntentBits } = discord;

      const testClient = new Client({
        intents: [GatewayIntentBits.Guilds]
      });

      await testClient.login(this.channel.botToken);
      
      // Wait for ready state
      await new Promise<void>((resolve) => {
        if (testClient.isReady()) {
          resolve();
        } else {
          testClient.once('ready', () => resolve());
        }
      });

      // Test channel access
      const channel = await testClient.channels.fetch(this.channel.channelId);
      
      await testClient.destroy();
      return !!channel;
    } catch (error) {
      console.error('Discord connection test failed:', error);
      return false;
    }
  }

  /**
   * Send a message to the Discord channel
   */
  async sendMessage(content: string): Promise<DiscordIssueMessage | null> {
    if (!this.isServerEnvironment()) {
      throw new Error('Discord service can only send messages on server');
    }

    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (!this.client) {
        throw new Error('Discord client is not initialized');
      }
      const channel = await this.client.channels.fetch(this.channel.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel or channel is not text-based');
      }

      const textChannel = channel as import('discord.js').TextChannel | import('discord.js').NewsChannel;
      const message = await textChannel.send(content);
      return {
        messageId: message.id,
        channelId: this.channel.channelId,
        issueId: '', // Will be set by caller
      };
    } catch (error) {
      console.error('Failed to send Discord message:', error);
      return null;
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(messageId: string, content: string): Promise<boolean> {
    if (!this.isServerEnvironment()) {
      throw new Error('Discord service can only update messages on server');
    }

    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (!this.client) {
        throw new Error('Discord client is not initialized');
      }
      const channel = await this.client.channels.fetch(this.channel.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel or channel is not text-based');
      }

      const message = await channel.messages.fetch(messageId);
      await message.edit(content);
      return true;
    } catch (error) {
      console.error('Failed to update Discord message:', error);
      return false;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.isServerEnvironment()) {
      throw new Error('Discord service can only delete messages on server');
    }

    if (!this.isReady) {
      await this.initialize();
    }

    try {
      if (!this.client) {
        throw new Error('Discord client is not initialized');
      }
      const channel = await this.client.channels.fetch(this.channel.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel or channel is not text-based');
      }

      const message = await channel.messages.fetch(messageId);
      await message.delete();
      return true;
    } catch (error) {
      console.error('Failed to delete Discord message:', error);
      return false;
    }
  }

  /**
   * Format a Notion issue as a Discord message
   */
  formatIssueMessage(issue: NotionIssue): string {
    const status = issue.status || 'Unknown';
    const severity = issue.severity || 'Medium';
    const project = issue.project || 'No Project';
    
    let message = `**${issue.bugName}**\n`;
    message += `📋 **Status:** ${status}\n`;
    message += `🔥 **Severity:** ${severity}\n`;
    message += `📁 **Project:** ${project}\n`;
    
    if (issue.bugDescription) {
      const truncatedDesc = issue.bugDescription.length > 200 
        ? issue.bugDescription.substring(0, 200) + '...' 
        : issue.bugDescription;
      message += `📝 **Description:** ${truncatedDesc}\n`;
    }
    
    if (issue.url) {
      message += `🔗 **Link:** ${issue.url}`;
    }
    
    return message;
  }

  /**
   * Post a new issue to Discord
   */
  async postIssue(issue: NotionIssue): Promise<string | null> {
    console.log(`Discord postIssue called for issue: ${issue.id}`);
    const content = this.formatIssueMessage(issue);
    console.log(`Formatted Discord message content: ${content.substring(0, 100)}...`);
    const result = await this.sendMessage(content);
    console.log(`Discord sendMessage result:`, result);
    return result?.messageId || null;
  }

  /**
   * Update an existing issue message
   */
  async updateIssue(messageId: string, issue: NotionIssue): Promise<boolean> {
    const content = this.formatIssueMessage(issue);
    return await this.updateMessage(messageId, content);
  }

  /**
   * Delete an issue message
   */
  async deleteIssue(messageId: string): Promise<boolean> {
    return await this.deleteMessage(messageId);
  }

  /**
   * Cleanup method for sync operations
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isReady) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}