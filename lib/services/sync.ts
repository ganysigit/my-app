/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  syncMappings, 
  issues, 
  discordMessages, 
  syncLogs, 
  notionConnections, 
  discordChannels,
  type SyncMapping,
  type Issue,
  type NewIssue,
  type NewDiscordMessage,
  type NewSyncLog
} from '../db/schema';
import { NotionService, type NotionIssue } from './notion';
import { SimpleDiscordService } from './discord-simple';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
  success: boolean;
  issuesProcessed: number;
  errors: string[];
  warnings: string[];
}

export class SyncService {
  /**
   * Run sync for all active mappings
   */
  static async runFullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      issuesProcessed: 0,
      errors: [],
      warnings: []
    };

    try {
      // Get all active sync mappings with their connections
      const mappings = await db
        .select({
          mapping: syncMappings,
          notionConnection: notionConnections,
          discordChannel: discordChannels,
        })
        .from(syncMappings)
        .innerJoin(notionConnections, eq(syncMappings.notionConnectionId, notionConnections.id))
        .innerJoin(discordChannels, eq(syncMappings.discordChannelId, discordChannels.id))
        .where(and(
          eq(syncMappings.isActive, true),
          eq(notionConnections.isActive, true),
          eq(discordChannels.isActive, true)
        ));

      console.log(`Found ${mappings.length} active sync mappings`);

      for (const { mapping, notionConnection, discordChannel } of mappings) {
        try {
          const syncResult = await this.syncMapping(mapping, notionConnection, discordChannel);
          result.issuesProcessed += syncResult.issuesProcessed;
          result.errors.push(...syncResult.errors);
          result.warnings.push(...syncResult.warnings);
          
          if (!syncResult.success) {
            result.success = false;
          }
        } catch (error: unknown) {
          const errorMsg = `Failed to sync mapping ${mapping.id}: ${error}`;
          result.errors.push(errorMsg);
          result.success = false;
          console.error(errorMsg);
        }
      }

      // Log overall sync result
      await this.logSyncOperation(null, 'full_sync', result.success ? 'success' : 'error', 
        `Processed ${result.issuesProcessed} issues`, result.errors.join('; '), result.issuesProcessed);

    } catch (error: unknown) {
      result.success = false;
      result.errors.push(`Full sync failed: ${error}`);
      console.error('Full sync failed:', error);
    }

    return result;
  }

  /**
   * Sync a specific mapping
   */
  static async syncMapping(
    mapping: SyncMapping, 
    notionConnection: any, 
    discordChannel: any
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      issuesProcessed: 0,
      errors: [],
      warnings: []
    };

    try {
      console.log(`Syncing mapping ${mapping.id}: ${notionConnection.name} -> ${discordChannel.name}`);

      // Initialize services
      const notionService = new NotionService(notionConnection);
      const discordService = new SimpleDiscordService(discordChannel);

      // Test connections
      const [notionOk, discordOk] = await Promise.all([
        notionService.testConnection(),
        discordService.testConnection()
      ]);

      if (!notionOk) {
        throw new Error('Notion connection failed');
      }
      if (!discordOk) {
        throw new Error('Discord connection failed');
      }

      // Fetch open issues from Notion
      const notionIssues = await notionService.fetchOpenIssues();
      console.log(`Fetched ${notionIssues.length} open issues from Notion`);

      // Filter by project if specified
      const filteredIssues = mapping.projectFilter 
        ? notionIssues.filter(issue => issue.project === mapping.projectFilter)
        : notionIssues;

      console.log(`${filteredIssues.length} issues match project filter`);

      // Get existing issues for this mapping
      const existingIssues = await db
        .select()
        .from(issues)
        .where(eq(issues.notionConnectionId, notionConnection.id));

      const existingIssueIds = new Set(existingIssues.map(issue => issue.id));
      const currentIssueIds = new Set(filteredIssues.map(issue => issue.id));

      // Process new and updated issues
      for (const notionIssue of filteredIssues) {
        try {
          if (existingIssueIds.has(notionIssue.id)) {
            // Update existing issue
            await this.updateIssue(notionIssue, notionConnection, discordService, mapping.discordChannelId);
          } else {
            // Create new issue
            await this.createIssue(notionIssue, notionConnection, discordService, mapping.discordChannelId);
          }
          result.issuesProcessed++;
        } catch (error: unknown) {
          result.errors.push(`Failed to process issue ${notionIssue.id}: ${error}`);
          console.error(`Error processing issue ${notionIssue.id}:`, error);
        }
      }

      // Remove issues that are no longer open or don't match filter
      const issuesToRemove = existingIssues.filter(issue => !currentIssueIds.has(issue.id));
      for (const issue of issuesToRemove) {
        try {
          await this.removeIssue(issue, discordService);
          result.issuesProcessed++;
        } catch (error: unknown) {
          result.errors.push(`Failed to remove issue ${issue.id}: ${error}`);
          console.error(`Error removing issue ${issue.id}:`, error);
        }
      }

      // Cleanup Discord service
      await discordService.cleanup();

      // Log sync result for this mapping
      await this.logSyncOperation(mapping.id, 'sync', result.success ? 'success' : 'error',
        `Synced ${filteredIssues.length} issues`, result.errors.join('; '), result.issuesProcessed);

    } catch (error: unknown) {
      result.success = false;
      result.errors.push(`Mapping sync failed: ${error}`);
      console.error(`Mapping sync failed for ${mapping.id}:`, error);
      
      await this.logSyncOperation(mapping.id, 'sync', 'error', 
        `Sync failed: ${error}`, String(error), 0);
    }

    return result;
  }

  /**
   * Create a new issue
   */
  private static async createIssue(
    notionIssue: NotionIssue,
    notionConnection: NotionConnection,
    discordService: SimpleDiscordService,
    discordChannelId: string
  ): Promise<void> {
    // Save issue to database
    const newIssue: NewIssue = {
      id: notionIssue.id,
      notionConnectionId: notionConnection.id,
      status: notionIssue.status,
      project: notionIssue.project,
      bugName: notionIssue.bugName,
      bugDescription: notionIssue.bugDescription,
      attachedFiles: JSON.stringify(notionIssue.attachedFiles),
      severity: notionIssue.severity,
      notionUrl: notionIssue.url,
      lastSyncedAt: new Date().toISOString(),
    };

    await db.insert(issues).values(newIssue);

    // Post to Discord
    const messageId = await discordService.postIssue(notionIssue);
    if (messageId) {
      const newDiscordMessage: NewDiscordMessage = {
        id: uuidv4(),
        issueId: notionIssue.id,
        discordChannelId: discordChannelId,
        messageId: messageId,
      };
      await db.insert(discordMessages).values(newDiscordMessage);
    }

    console.log(`Created issue ${notionIssue.id}`);
  }

  /**
   * Update an existing issue
   */
  private static async updateIssue(
    notionIssue: NotionIssue,
    notionConnection: NotionConnection,
    discordService: SimpleDiscordService,
    discordChannelId: string
  ): Promise<void> {
    // Update issue in database
    await db
      .update(issues)
      .set({
        status: notionIssue.status,
        project: notionIssue.project,
        bugName: notionIssue.bugName,
        bugDescription: notionIssue.bugDescription,
        attachedFiles: JSON.stringify(notionIssue.attachedFiles),
        severity: notionIssue.severity,
        notionUrl: notionIssue.url,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(issues.id, notionIssue.id));

    // Update Discord message
    const discordMessage = await db
      .select()
      .from(discordMessages)
      .where(and(
        eq(discordMessages.issueId, notionIssue.id),
        eq(discordMessages.discordChannelId, discordChannelId)
      ))
      .limit(1);

    if (discordMessage.length > 0) {
      await discordService.updateIssue(discordMessage[0].messageId, notionIssue);
    }

    console.log(`Updated issue ${notionIssue.id}`);
  }

  /**
   * Remove an issue (no longer open or doesn't match filter)
   */
  private static async removeIssue(issue: Issue, discordService: SimpleDiscordService): Promise<void> {
    // Get Discord messages for this issue
    const discordMessageList = await db
      .select()
      .from(discordMessages)
      .where(eq(discordMessages.issueId, issue.id));

    // Delete Discord messages
    for (const discordMessage of discordMessageList) {
      await discordService.deleteIssue(discordMessage.messageId);
      await db
        .delete(discordMessages)
        .where(eq(discordMessages.id, discordMessage.id));
    }

    // Delete issue from database
    await db
      .delete(issues)
      .where(eq(issues.id, issue.id));

    console.log(`Removed issue ${issue.id}`);
  }

  /**
   * Handle Discord button interaction (mark as fixed)
   */
  static async handleDiscordInteraction(issueId: string, action: string): Promise<boolean> {
    try {
      if (action !== 'fix') {
        return false;
      }

      // Get the issue
      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .limit(1);

      if (issue.length === 0) {
        console.error(`Issue ${issueId} not found`);
        return false;
      }

      // Get the Notion connection
      const notionConnection = await db
        .select()
        .from(notionConnections)
        .where(eq(notionConnections.id, issue[0].notionConnectionId))
        .limit(1);

      if (notionConnection.length === 0) {
        console.error(`Notion connection not found for issue ${issueId}`);
        return false;
      }

      // Update status in Notion
      const notionService = new NotionService(notionConnection[0]);
      
      // We need to find the Notion page ID - this might be stored differently
      // For now, we'll assume the issue ID is the page ID or we need to search for it
      await notionService.updateIssueStatus(issueId, 'fixed');

      // The issue will be removed in the next sync cycle since it's no longer "open"
      console.log(`Marked issue ${issueId} as fixed in Notion`);
      
      return true;
    } catch (error: unknown) {
      console.error(`Failed to handle Discord interaction for issue ${issueId}:`, error);
      return false;
    }
  }

  /**
   * Log sync operation
   */
  private static async logSyncOperation(
    syncMappingId: string | null,
    operation: string,
    status: string,
    message: string,
    errorDetails: string,
    issuesProcessed: number
  ): Promise<void> {
    try {
      const logEntry: NewSyncLog = {
        id: uuidv4(),
        syncMappingId,
        operation,
        status,
        message,
        errorDetails: errorDetails || null,
        issuesProcessed,
      };
      
      await db.insert(syncLogs).values(logEntry);
    } catch (error: unknown) {
      console.error('Failed to log sync operation:', error);
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(): Promise<{
    totalIssues: number;
    activeIssues: number;
    inactiveIssues: number;
    lastSyncTime: string | null;
    recentErrors: number;
  }> {
    try {
      // Get total issues count
      const totalIssuesResult = await db
        .select({ count: issues.id })
        .from(issues);
      
      const totalIssues = totalIssuesResult.length;

      // Get active issues (those with Discord messages)
      const activeIssuesResult = await db
        .select({ issueId: discordMessages.issueId })
        .from(discordMessages)
        .groupBy(discordMessages.issueId);
      
      const activeIssues = activeIssuesResult.length;
      const inactiveIssues = totalIssues - activeIssues;

      // Get last sync time
      const lastSyncResult = await db
        .select({ createdAt: syncLogs.createdAt })
        .from(syncLogs)
        .where(eq(syncLogs.operation, 'full_sync'))
        .orderBy(syncLogs.createdAt)
        .limit(1);
      
      const lastSyncTime = lastSyncResult.length > 0 ? lastSyncResult[0].createdAt : null;

      // Get recent errors (last 24 hours)
      const recentErrorsResult = await db
        .select({ id: syncLogs.id })
        .from(syncLogs)
        .where(and(
          eq(syncLogs.status, 'error'),
          // Note: SQLite date comparison might need adjustment
        ));
      
      const recentErrors = recentErrorsResult.length;

      return {
        totalIssues,
        activeIssues,
        inactiveIssues,
        lastSyncTime,
        recentErrors,
      };
    } catch (error: unknown) {
      console.error('Failed to get sync stats:', error);
      return {
        totalIssues: 0,
        activeIssues: 0,
        inactiveIssues: 0,
        lastSyncTime: null,
        recentErrors: 0,
      };
    }
  }

  /**
   * Instance method to sync a specific mapping (for cron jobs)
   */
  async syncMapping(mappingData: {
    id: string;
    notionConnection: any;
    discordChannel: any;
    projectFilter?: string | null;
    lastSyncAt?: Date | null;
  }): Promise<{ syncedCount: number; message: string }> {
    try {
      const result = await SyncService.syncMapping(
        {
          id: mappingData.id,
          notionConnectionId: mappingData.notionConnection.id,
          discordChannelId: mappingData.discordChannel.id,
          projectFilter: mappingData.projectFilter,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSyncAt: mappingData.lastSyncAt
        },
        mappingData.notionConnection,
        mappingData.discordChannel
      );

      return {
        syncedCount: result.issuesProcessed,
        message: result.success 
          ? `Successfully synced ${result.issuesProcessed} issues`
          : `Sync completed with errors: ${result.errors.join(', ')}`
      };
    } catch (error) {
      throw new Error(`Sync mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}