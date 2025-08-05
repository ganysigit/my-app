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
  private client: any;
  private channel: DiscordChannel;
  private isReady: boolean = false;
  private discordModule: any;

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
      const { Client, GatewayIntentBits } = discord;

      // Create the client with compression disabled to avoid zlib-sync
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
        ws: {
          compress: false, // Disable compression to avoid zlib-sync dependency
        },
      });

      // Set up event handlers after client creation
      this.setupEventHandlers();

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
    this.client.on('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
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
      const { Client, GatewayIntentBits } = discord;

      const testClient = new Client({
        intents: [GatewayIntentBits.Guilds],
        ws: { compress: false }
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
      const channel = await this.client.channels.fetch(this.channel.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel or channel is not text-based');
      }

      const message = await channel.send(content);
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
    const priority = issue.priority || 'Medium';
    const assignee = issue.assignee || 'Unassigned';
    
    let message = `**${issue.title}**\n`;
    message += `📋 **Status:** ${status}\n`;
    message += `🔥 **Priority:** ${priority}\n`;
    message += `👤 **Assignee:** ${assignee}\n`;
    
    if (issue.description) {
      const truncatedDesc = issue.description.length > 200 
        ? issue.description.substring(0, 200) + '...' 
        : issue.description;
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
    const content = this.formatIssueMessage(issue);
    const result = await this.sendMessage(content);
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