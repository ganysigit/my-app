import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notionConnections, type NewNotionConnection } from '@/lib/db/schema';
import { NotionService } from '@/lib/services/notion';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  databaseId: z.string().min(1, 'Database ID is required'),
});

const updateConnectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required').optional(),
  apiKey: z.string().min(1, 'API key is required').optional(),
  databaseId: z.string().min(1, 'Database ID is required').optional(),
  isActive: z.boolean().optional(),
});

// GET - List all Notion connections
export async function GET() {
  try {
    const connections = await db
      .select({
        id: notionConnections.id,
        name: notionConnections.name,
        databaseId: notionConnections.databaseId,
        isActive: notionConnections.isActive,
        createdAt: notionConnections.createdAt,
        updatedAt: notionConnections.updatedAt,
      })
      .from(notionConnections)
      .orderBy(notionConnections.createdAt);

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching Notion connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// POST - Create new Notion connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createConnectionSchema.parse(body);

    // Test the connection before saving
    const testConnection = {
      id: 'test',
      ...validatedData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const notionService = new NotionService(testConnection);
    const isValid = await notionService.testConnection();

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Notion API key or database ID' },
        { status: 400 }
      );
    }

    // Save the connection
    const newConnection: NewNotionConnection = {
      id: uuidv4(),
      ...validatedData,
      isActive: true,
    };

    await db.insert(notionConnections).values(newConnection);

    return NextResponse.json(
      { message: 'Connection created successfully', id: newConnection.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating Notion connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

// PUT - Update Notion connection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateConnectionSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Check if connection exists
    const existingConnection = await db
      .select()
      .from(notionConnections)
      .where(eq(notionConnections.id, id))
      .limit(1);

    if (existingConnection.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // If API key or database ID is being updated, test the connection
    if (updateData.apiKey || updateData.databaseId) {
      const testConnection = {
        ...existingConnection[0],
        ...updateData,
      };

      const notionService = new NotionService(testConnection);
      const isValid = await notionService.testConnection();

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid Notion API key or database ID' },
          { status: 400 }
        );
      }
    }

    // Update the connection
    await db
      .update(notionConnections)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notionConnections.id, id));

    return NextResponse.json({ message: 'Connection updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating Notion connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Notion connection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Check if connection exists
    const existingConnection = await db
      .select()
      .from(notionConnections)
      .where(eq(notionConnections.id, id))
      .limit(1);

    if (existingConnection.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Delete the connection (this will cascade delete related records)
    await db
      .delete(notionConnections)
      .where(eq(notionConnections.id, id));

    return NextResponse.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting Notion connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}