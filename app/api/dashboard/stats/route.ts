import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issues, syncMappings, notionConnections, discordChannels, syncLogs } from '@/lib/db/schema';
import { eq, count, and, gte, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total counts
    const [totalIssuesResult] = await db.select({ count: count() }).from(issues);
    const [totalMappingsResult] = await db.select({ count: count() }).from(syncMappings);
    const [totalNotionConnectionsResult] = await db.select({ count: count() }).from(notionConnections);
    const [totalDiscordChannelsResult] = await db.select({ count: count() }).from(discordChannels);

    // Get issues by status
    const issuesByStatusRaw = await db.select({
      status: issues.status,
      count: count()
    })
    .from(issues)
    .groupBy(issues.status);

    // Get issues by severity
    const issuesBySeverityRaw = await db.select({
      severity: issues.severity,
      count: count()
    })
    .from(issues)
    .groupBy(issues.severity);

    // Get active mappings with details
    const activeMappingsRaw = await db.select({
      id: syncMappings.id,
      notionConnectionId: syncMappings.notionConnectionId,
      discordChannelId: syncMappings.discordChannelId,
      updatedAt: syncMappings.updatedAt
    })
    .from(syncMappings)
    .where(eq(syncMappings.isActive, true));

    // Get recent sync activity
    const recentSyncActivityRaw = await db.select({
      id: syncLogs.id,
      status: syncLogs.status,
      createdAt: syncLogs.createdAt,
      issuesProcessed: syncLogs.issuesProcessed,
      errorDetails: syncLogs.errorDetails
    })
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(10);

    // Calculate sync success rate
    const [successfulSyncsResult] = await db.select({ count: count() })
      .from(syncLogs)
      .where(eq(syncLogs.status, 'success'));

    const [totalSyncsResult] = await db.select({ count: count() }).from(syncLogs);
    // Process the data safely
    const totalIssues = totalIssuesResult?.count || 0;
    const totalMappings = totalMappingsResult?.count || 0;
    const totalNotionConnections = totalNotionConnectionsResult?.count || 0;
    const totalDiscordChannels = totalDiscordChannelsResult?.count || 0;
    const successfulSyncs = successfulSyncsResult?.count || 0;
    const totalSyncs = totalSyncsResult?.count || 0;

    // Process issues by status - keep as array for dashboard compatibility
    const issuesByStatus = (issuesByStatusRaw || []).map(item => ({
      status: item.status || 'unknown',
      count: item.count
    }));

    // Process issues by severity - keep as array for dashboard compatibility
    const issuesBySeverity = (issuesBySeverityRaw || []).map(item => ({
      severity: item.severity || 'unknown',
      count: item.count
    }));

    // Process active mappings
    const activeMappings = (activeMappingsRaw || []).map(mapping => ({
      id: mapping.id,
      notionConnectionId: mapping.notionConnectionId,
      discordChannelId: mapping.discordChannelId,
      lastSync: mapping.updatedAt
    }));

    // Process recent sync activity
    const recentSyncActivity = (recentSyncActivityRaw || []).map(log => ({
      id: log.id,
      status: log.status,
      timestamp: log.createdAt,
      issuesProcessed: log.issuesProcessed || 0,
      error: log.errorDetails
    }));

    // Calculate sync success rate
    const syncSuccessRate = totalSyncs > 0 
      ? Math.round((successfulSyncs / totalSyncs) * 100)
      : 0;

    // Build the response structure that matches dashboard expectations
    const stats = {
      totalIssues,
      totalMappings,
      totalNotionConnections,
      totalDiscordChannels,
      issuesByStatus,
      issuesBySeverity,
      activeMappings,
      recentSyncActivity,
      syncSuccessRate
    };

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}