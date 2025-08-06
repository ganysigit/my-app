'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconRefresh, IconCheck, IconX, IconClock } from '@tabler/icons-react';

interface SyncLogEntry {
  id: string;
  timestamp: string;
  operation: string;
  status: 'success' | 'error' | 'pending';
  source: string;
  target: string;
  details: string;
  duration?: number;
}

// Mock data for demonstration
const mockSyncLogs: SyncLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15 14:30:25',
    operation: 'Notion to Discord Sync',
    status: 'success',
    source: 'Notion Database',
    target: 'Discord Channel #general',
    details: 'Synced 15 new items successfully',
    duration: 2.3
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:25:10',
    operation: 'Discord to Notion Sync',
    status: 'error',
    source: 'Discord Channel #updates',
    target: 'Notion Database',
    details: 'Failed to authenticate with Notion API',
    duration: 0.8
  },
  {
    id: '3',
    timestamp: '2024-01-15 14:20:05',
    operation: 'Scheduled Sync',
    status: 'pending',
    source: 'Notion Database',
    target: 'Discord Channel #announcements',
    details: 'Sync operation in progress...',
  },
  {
    id: '4',
    timestamp: '2024-01-15 14:15:42',
    operation: 'Manual Sync',
    status: 'success',
    source: 'Discord Channel #feedback',
    target: 'Notion Database',
    details: 'Synced 8 messages and 3 reactions',
    duration: 1.7
  },
  {
    id: '5',
    timestamp: '2024-01-15 14:10:18',
    operation: 'Bulk Import',
    status: 'success',
    source: 'Notion Database',
    target: 'Discord Channel #archive',
    details: 'Imported 127 historical records',
    duration: 15.2
  }
];

function getStatusIcon(status: SyncLogEntry['status']) {
  switch (status) {
    case 'success':
      return <IconCheck className="h-4 w-4 text-green-600" />;
    case 'error':
      return <IconX className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <IconClock className="h-4 w-4 text-yellow-600" />;
  }
}

function getStatusBadge(status: SyncLogEntry['status']) {
  const variants = {
    success: 'default',
    error: 'destructive',
    pending: 'secondary'
  } as const;
  
  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}

export function SyncLogTab() {
  const [logs, setLogs] = useState<SyncLogEntry[]>(mockSyncLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync Log</h1>
          <p className="text-muted-foreground">
            Monitor and track all synchronization operations between Notion and Discord.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <IconRefresh className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Operations</CardTitle>
          <CardDescription>
            Latest synchronization activities and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(log.status)}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{log.operation}</p>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.source} → {log.target}
                    </p>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-mono">{log.timestamp}</p>
                  {log.duration && (
                    <p className="text-xs text-muted-foreground">
                      {log.duration}s
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Statistics</CardTitle>
          <CardDescription>
            Overview of sync operations performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(log => log.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {logs.filter(log => log.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {logs.filter(log => log.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}