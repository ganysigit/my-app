/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@notionhq/client';
import { NotionConnection } from '../db/schema';

export interface NotionIssue {
  id: string;
  status: string;
  project: string;
  bugName: string;
  bugDescription: string;
  attachedFiles: string[];
  severity: string;
  url: string;
  lastEditedTime: string;
}

export class NotionService {
  private client: Client;
  private connection: NotionConnection;

  constructor(connection: NotionConnection) {
    this.connection = connection;
    this.client = new Client({
      auth: connection.apiKey,
    });
  }

  /**
   * Get database schema to understand property types
   */
  async getDatabaseSchema(): Promise<any> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: this.connection.databaseId
      });
      return database.properties;
    } catch (error) {
      console.error('Error fetching database schema:', error);
      throw new Error(`Failed to fetch database schema: ${error}`);
    }
  }

  /**
   * Create appropriate filter based on property type
   */
  private createStatusFilter(propertyType: string): any {
    switch (propertyType) {
      case 'status':
        return {
          property: 'status',
          status: {
            equals: 'open'
          }
        };
      case 'multi_select':
        return {
          property: 'status',
          multi_select: {
            contains: 'open'
          }
        };
      case 'select':
        return {
          property: 'status',
          select: {
            equals: 'open'
          }
        };
      case 'checkbox':
        return {
          property: 'status',
          checkbox: {
            equals: true
          }
        };
      default:
        // Fallback to status type
        return {
          property: 'status',
          status: {
            equals: 'open'
          }
        };
    }
  }

  /**
   * Fetch all open issues from the Notion database
   */
  async fetchOpenIssues(): Promise<NotionIssue[]> {
    try {
      // Get database schema to determine status property type
      const schema = await this.getDatabaseSchema();
      const statusProperty = schema.status;
      
      if (!statusProperty) {
        throw new Error('Status property not found in database schema');
      }

      const filter = this.createStatusFilter(statusProperty.type);

      const response = await this.client.databases.query({
        database_id: this.connection.databaseId,
        filter,
        sorts: [
          {
            property: 'issue-id',
            direction: 'ascending'
          }
        ]
      });

      const issues: NotionIssue[] = [];

      for (const page of response.results) {
        if ('properties' in page) {
          const issue = await this.parseNotionPage(page);
          if (issue) {
            issues.push(issue);
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Error fetching issues from Notion:', error);
      throw new Error(`Failed to fetch issues: ${error}`);
    }
  }

  /**
   * Create appropriate status property update based on property type
   */
  private createStatusUpdate(propertyType: string, status: string): any {
    switch (propertyType) {
      case 'status':
        return {
          status: {
            name: status
          }
        };
      case 'multi_select':
        return {
          multi_select: [
            {
              name: status
            }
          ]
        };
      case 'select':
        return {
          select: {
            name: status
          }
        };
      case 'checkbox':
        return {
          checkbox: status === 'open' || status === 'true'
        };
      default:
        // Fallback to status type
        return {
          status: {
            name: status
          }
        };
    }
  }

  /**
   * Update issue status in Notion
   */
  async updateIssueStatus(pageId: string, status: string): Promise<void> {
    try {
      // Get database schema to determine status property type
      const schema = await this.getDatabaseSchema();
      const statusProperty = schema.status;
      
      if (!statusProperty) {
        throw new Error('Status property not found in database schema');
      }

      const statusUpdate = this.createStatusUpdate(statusProperty.type, status);

      await this.client.pages.update({
        page_id: pageId,
        properties: {
          status: statusUpdate
        }
      });
    } catch (error) {
      console.error('Error updating issue status in Notion:', error);
      throw new Error(`Failed to update issue status: ${error}`);
    }
  }

  /**
   * Get a specific page by ID
   */
  async getPage(pageId: string): Promise<NotionIssue | null> {
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      
      if ('properties' in page) {
        return await this.parseNotionPage(page);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching page from Notion:', error);
      return null;
    }
  }

  /**
   * Parse a Notion page into our Issue format
   */
  private async parseNotionPage(page: Record<string, unknown>): Promise<NotionIssue | null> {
    try {
      const properties = page.properties as Record<string, unknown>;
      
      // Extract issue ID
      const issueId = await this.extractProperty(properties['issue-id'] as Record<string, unknown>, 'title') || 
                     await this.extractProperty(properties['issue-id'] as Record<string, unknown>, 'rich_text') ||
                     (page.id as string);
      
      // Extract other properties
      const status = await this.extractProperty(properties.status as Record<string, unknown>, 'select');
      const project = await this.extractProperty(properties.project as Record<string, unknown>, 'relation') || 
                     await this.extractProperty(properties.project as Record<string, unknown>, 'select') || 
                     await this.extractProperty(properties.project as Record<string, unknown>, 'rich_text');
      const bugName = await this.extractProperty(properties['bug-name'] as Record<string, unknown>, 'title') ||
                     await this.extractProperty(properties['bug-name'] as Record<string, unknown>, 'rich_text');
      const bugDescription = await this.extractProperty(properties['bug-description'] as Record<string, unknown>, 'rich_text');
      const severity = await this.extractProperty(properties.severity as Record<string, unknown>, 'select');
      
      // Extract attached files
      const attachedFiles = this.extractFiles(properties['attached-files'] as Record<string, unknown>);
      
      if (!issueId || !bugName) {
        console.warn('Missing required fields for issue:', page.id);
        return null;
      }

      return {
        id: issueId,
        status: status || 'open',
        project: project || '',
        bugName,
        bugDescription: bugDescription || '',
        attachedFiles,
        severity: severity || '',
        url: (page.url as string) || '',
        lastEditedTime: (page.last_edited_time as string) || '',
      };
    } catch (error) {
      console.error('Error parsing Notion page:', error);
      return null;
    }
  }

  /**
   * Fetch the title of a related page by its ID
   */
  private async fetchRelatedPageTitle(pageId: string): Promise<string> {
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      
      if ('properties' in page) {
        const properties = page.properties as Record<string, unknown>;
        
        // Try to find a title property (common names: title, name, Name, Title)
        const titleKeys = ['title', 'name', 'Name', 'Title'];
        
        for (const key of titleKeys) {
          if (properties[key]) {
            const titleProperty = properties[key] as Record<string, unknown>;
            if (titleProperty.type === 'title') {
              return (titleProperty.title as any)?.[0]?.plain_text || '';
            }
            if (titleProperty.type === 'rich_text') {
              return (titleProperty.rich_text as any)?.[0]?.plain_text || '';
            }
          }
        }
        
        // If no title property found, try to get the first title or rich_text property
        for (const [key, prop] of Object.entries(properties)) {
          const property = prop as Record<string, unknown>;
          if (property.type === 'title') {
            return (property.title as any)?.[0]?.plain_text || '';
          }
        }
      }
      
      return pageId; // Fallback to ID if no title found
    } catch (error) {
      console.error(`Error fetching related page title for ${pageId}:`, error);
      return pageId; // Fallback to ID on error
    }
  }

  /**
   * Extract property value based on type
   */
  private async extractProperty(property: Record<string, unknown>, type: string): Promise<string> {
    if (!property || property.type !== type) return '';
    
    switch (type) {
      case 'title':
      case 'rich_text':
        return (property[type] as any)?.[0]?.plain_text || '';
      case 'select':
        return (property.select as any)?.name || '';
      case 'number':
        return (property.number as any)?.toString() || '';
      case 'date':
        return (property.date as any)?.start || '';
      case 'relation':
        // For relation properties, fetch the related page title
        const relations = (property.relation as any) || [];
        if (relations.length > 0) {
          const relatedPageId = relations[0].id;
          if (relatedPageId) {
            return await this.fetchRelatedPageTitle(relatedPageId);
          }
        }
        return '';
      default:
        return '';
    }
  }

  /**
   * Extract file URLs from files property
   */
  private extractFiles(property: Record<string, unknown>): string[] {
    if (!property || property.type !== 'files') return [];
    
    return (property.files as any)?.map((file: Record<string, unknown>) => {
      if (file.type === 'external') {
        return (file.external as any).url;
      } else if (file.type === 'file') {
        return (file.file as any).url;
      }
      return null;
    }).filter(Boolean) || [];
  }

  /**
   * Test the connection to Notion
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.databases.retrieve({
        database_id: this.connection.databaseId,
      });
      return true;
    } catch (error) {
      console.error('Notion connection test failed:', error);
      return false;
    }
  }
}