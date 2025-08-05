import { DiscordChannel } from '../db/schema';
import { NotionIssue } from './notion';

export interface DiscordIssueMessage {
  messageId: string;
  channelId: string;
  issueId: string;
}

export class DiscordService {
  private client: any;
  private channel: DiscordChannel;
  private isReady: boolean = false;
  private discordModule: any;

  constructor(channel: DiscordChannel) {
    this.channel = channel;
  }

  /**
   * Dynamically import discord.js to avoid build-time issues
   */
  private async loadDiscordModule() {
    if (this.discordModule) return this.discordModule;
    
    try {
      // Dynamic import to avoid build-time module resolution issues
      this.discordModule = await import('discord.js');
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
   * Get the Discord channel
   */
  private async getChannel(): Promise<any> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready');
    }

    const channel = await this.client.channels.fetch(this.channel.channelId);
    if (!channel) {
      throw new Error(`Channel ${this.channel.channelId} not found`);
    }

    return channel;
  }

  /**
   * Send a message to the Discord channel
   */
  async sendMessage(content: string): Promise<DiscordIssueMessage> {
    const channel = await this.getChannel();
    const message = await channel.send(content);
    
    return {
      messageId: message.id,
      channelId: channel.id,
      issueId: '', // Will be set by caller
    };
  }

  /**
   * Send an embed message for a Notion issue
   */
  async sendIssueEmbed(issue: NotionIssue): Promise<DiscordIssueMessage> {
    const discord = await this.loadDiscordModule();
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = discord;

    const embed = new EmbedBuilder()
      .setTitle(issue.title)
      .setDescription(issue.description || 'No description provided')
      .setColor(this.getStatusColor(issue.status))
      .addFields(
        { name: 'Status', value: issue.status, inline: true },
        { name: 'Priority', value: issue.priority || 'Not set', inline: true },
        { name: 'Assignee', value: issue.assignee || 'Unassigned', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Notion Issue Tracker' });

    if (issue.url) {
      embed.setURL(issue.url);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('View in Notion')
          .setStyle(ButtonStyle.Link)
          .setURL(issue.url || 'https://notion.so'),
        new ButtonBuilder()
          .setCustomId(`issue_${issue.id}_update`)
          .setLabel('Update Status')
          .setStyle(ButtonStyle.Secondary)
      );

    const channel = await this.getChannel();
    const message = await channel.send({
      embeds: [embed],
      components: [row]
    });

    return {
      messageId: message.id,
      channelId: channel.id,
      issueId: issue.id,
    };
  }

  /**
   * Update an existing message
   */
  async updateMessage(messageId: string, content: string): Promise<void> {
    const channel = await this.getChannel();
    const message = await channel.messages.fetch(messageId);
    await message.edit(content);
  }

  /**
   * Update an issue embed message
   */
  async updateIssueEmbed(messageId: string, issue: NotionIssue): Promise<void> {
    const discord = await this.loadDiscordModule();
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = discord;

    const embed = new EmbedBuilder()
      .setTitle(issue.title)
      .setDescription(issue.description || 'No description provided')
      .setColor(this.getStatusColor(issue.status))
      .addFields(
        { name: 'Status', value: issue.status, inline: true },
        { name: 'Priority', value: issue.priority || 'Not set', inline: true },
        { name: 'Assignee', value: issue.assignee || 'Unassigned', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Notion Issue Tracker (Updated)' });

    if (issue.url) {
      embed.setURL(issue.url);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('View in Notion')
          .setStyle(ButtonStyle.Link)
          .setURL(issue.url || 'https://notion.so'),
        new ButtonBuilder()
          .setCustomId(`issue_${issue.id}_update`)
          .setLabel('Update Status')
          .setStyle(ButtonStyle.Secondary)
      );

    const channel = await this.getChannel();
    const message = await channel.messages.fetch(messageId);
    await message.edit({
      embeds: [embed],
      components: [row]
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const channel = await this.getChannel();
    const message = await channel.messages.fetch(messageId);
    await message.delete();
  }

  /**
   * Get color based on issue status
   */
  private getStatusColor(status: string): number {
    switch (status.toLowerCase()) {
      case 'not started':
        return 0x6B7280; // Gray
      case 'in progress':
        return 0xF59E0B; // Yellow
      case 'done':
        return 0x10B981; // Green
      case 'blocked':
        return 0xEF4444; // Red
      default:
        return 0x3B82F6; // Blue
    }
  }

  /**
   * Test the Discord connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      const channel = await this.getChannel();
      return !!channel;
    } catch (error) {
      console.error('Discord connection test failed:', error);
      return false;
    }
  }

  /**
   * Disconnect the Discord client
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }

  /**
   * Get client status
   */
  getStatus(): { ready: boolean; user?: string } {
    return {
      ready: this.isReady,
      user: this.client?.user?.tag
    };
  }
}