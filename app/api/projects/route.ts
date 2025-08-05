import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issues } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get unique projects from issues table
    const projectsResult = await db
      .select({
        project: issues.project
      })
      .from(issues)
      .where(sql`${issues.project} IS NOT NULL AND ${issues.project} != ''`)
      .groupBy(issues.project)
      .orderBy(issues.project);

    const projects = projectsResult.map(row => row.project).filter(Boolean);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}