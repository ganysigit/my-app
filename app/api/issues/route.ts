import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issues, notionConnections } from '@/lib/db/schema';
import { eq, and, desc, asc, like, or, isNotNull, isNull, count } from 'drizzle-orm';
import { z } from 'zod';

const getIssuesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  project: z.string().optional(),
  severity: z.string().optional(),
  sortBy: z.enum(['issueId', 'status', 'project', 'severity', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET - List all issues with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = getIssuesSchema.parse(Object.fromEntries(searchParams));
    
    const { page, limit, search, status, project, severity, sortBy, sortOrder } = params;
    const offset = (page - 1) * limit;

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(issues.id, `%${search}%`),
          like(issues.bugName, `%${search}%`),
          like(issues.bugDescription, `%${search}%`),
          like(issues.project, `%${search}%`)
        )
      );
    }
    
    if (status) {
      conditions.push(eq(issues.status, status));
    }
    
    if (project) {
      conditions.push(eq(issues.project, project));
    }
    
    if (severity) {
      conditions.push(eq(issues.severity, severity));
    }

    // Apply sorting
     const sortColumn = {
       issueId: issues.id,
       status: issues.status,
       project: issues.project,
       severity: issues.severity,
       createdAt: issues.createdAt,
       updatedAt: issues.updatedAt,
     }[sortBy];

     // Build the complete query
     const baseQuery = db
       .select({
         id: issues.id,
         issueId: issues.id, // Use id as issueId for compatibility
         status: issues.status,
         project: issues.project,
         bugName: issues.bugName,
         bugDescription: issues.bugDescription,
         attachedFiles: issues.attachedFiles,
         severity: issues.severity,
         notionUrl: issues.notionUrl,
         lastSyncedAt: issues.lastSyncedAt,
         createdAt: issues.createdAt,
         updatedAt: issues.updatedAt,
         notionConnectionName: notionConnections.name,
       })
       .from(issues)
       .innerJoin(notionConnections, eq(issues.notionConnectionId, notionConnections.id))
       .$dynamic();

     let query = baseQuery;
     
     if (conditions.length > 0) {
       query = query.where(and(...conditions));
     }
     
     if (sortColumn) {
       query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
     }

    // Apply pagination
    const issuesList = await query.limit(limit).offset(offset);

    // Get total count for pagination
    const baseCountQuery = db
      .select({ count: count(issues.id) })
      .from(issues)
      .innerJoin(notionConnections, eq(issues.notionConnectionId, notionConnections.id))
      .$dynamic();

    let countQuery = baseCountQuery;
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: totalCount }] = await countQuery;
    const totalPages = Math.ceil(Number(totalCount) / limit);

    return NextResponse.json({
      issues: issuesList,
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

// GET - Get issue statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'stats') {
      // Get issue statistics
      const totalIssues = await db
        .select({ count: issues.id })
        .from(issues);

      const openIssues = await db
        .select({ count: issues.id })
        .from(issues)
        .where(eq(issues.status, 'open'));

      const fixedIssues = await db
        .select({ count: issues.id })
        .from(issues)
        .where(eq(issues.status, 'fixed'));

      const syncedIssues = await db
        .select({ count: issues.id })
        .from(issues)
        .where(and(
          eq(issues.status, 'open'),
          isNotNull(issues.lastSyncedAt)
        ));

      const unsyncedIssues = await db
        .select({ count: issues.id })
        .from(issues)
        .where(and(
          eq(issues.status, 'open'),
          isNull(issues.lastSyncedAt)
        ));

      // Get issues by project
      const issuesByProject = await db
        .select({
          project: issues.project,
          count: issues.id,
        })
        .from(issues)
        .where(eq(issues.status, 'open'))
        .groupBy(issues.project);

      // Get issues by severity
      const issuesBySeverity = await db
        .select({
          severity: issues.severity,
          count: issues.id,
        })
        .from(issues)
        .where(eq(issues.status, 'open'))
        .groupBy(issues.severity);

      return NextResponse.json({
        stats: {
          total: Number(totalIssues[0]?.count || 0),
          open: Number(openIssues[0]?.count || 0),
          fixed: Number(fixedIssues[0]?.count || 0),
          synced: Number(syncedIssues[0]?.count || 0),
          unsynced: Number(unsyncedIssues[0]?.count || 0),
          byProject: issuesByProject.map(item => ({
            project: item.project,
            count: Number(item.count),
          })),
          bySeverity: issuesBySeverity.map(item => ({
            severity: item.severity,
            count: Number(item.count),
          })),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}