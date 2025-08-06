'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IconRefresh, IconCheck, IconX, IconClock, IconArrowRight, IconDatabase, IconBrandDiscord, IconCalendar, IconUser } from '@tabler/icons-react';

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
    timestamp: '2024-01-14 18:10:18',
    operation: 'Bulk Import',
    status: 'success',
    source: 'Notion Database',
    target: 'Discord Channel #archive',
    details: 'Imported 127 historical records',
    duration: 15.2
  },
  {
    id: '6',
    timestamp: '2024-01-14 16:45:30',
    operation: 'Auto Sync',
    status: 'success',
    source: 'Discord Channel #general',
    target: 'Notion Database',
    details: 'Automated sync completed successfully',
    duration: 3.1
  }
];

// Helper function to group logs by date
function groupLogsByDate(logs: SyncLogEntry[]) {
  const groups: { [key: string]: SyncLogEntry[] } = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
  });
  
  return groups;
}

// Helper function to format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }
}

// Helper function to get operation icon
function getOperationIcon(operation: string) {
  if (operation.includes('Scheduled') || operation.includes('Auto')) {
    return <IconCalendar className="h-4 w-4" />;
  } else if (operation.includes('Manual') || operation.includes('Bulk')) {
    return <IconUser className="h-4 w-4" />;
  } else if (operation.includes('Discord')) {
    return <IconBrandDiscord className="h-4 w-4" />;
  } else {
    return <IconDatabase className="h-4 w-4" />;
  }
}

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

  const groupedLogs = groupLogsByDate(logs);
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-6">


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Sync History</CardTitle>
              <CardDescription>
                Monitor and track all synchronization operations between Notion and Discord
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
              <IconRefresh className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedDates.map((dateString) => {
            const dateEntries = groupedLogs[dateString].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            return (
              <div key={dateString} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>{formatDate(dateString)}</span>
                  <span className="text-xs">{new Date(dateString).getFullYear()}</span>
                </div>
                
                <div className="space-y-3">
                  {dateEntries.map((log) => {
                    const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                    
                    return (
                      <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Timestamp */}
                        <div className="text-sm font-mono text-muted-foreground min-w-[3rem]">
                          {time}
                        </div>
                        
                        {/* Avatar/Icon */}
                        <div className="flex-shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-muted">
                              {getOperationIcon(log.operation)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{log.operation}</span>
                            {getStatusBadge(log.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{log.source}</span>
                            <IconArrowRight className="h-3 w-3" />
                            <span>{log.target}</span>
                          </div>
                          
                          {log.details && (
                            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-muted-foreground/20">
                              <span className="text-xs font-medium text-muted-foreground/80">Operation details:</span>
                              <p className="mt-1">{log.details}</p>
                              {log.duration && (
                                <p className="text-xs mt-1 text-muted-foreground/60">
                                  Duration: {log.duration}s
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {getStatusIcon(log.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sync Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Successful Operations Card */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6">
          <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <IconCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="leading-none font-semibold">Successful</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Completed operations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-green-600">
                {logs.filter(log => log.status === 'success').length}
              </div>
              <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +{Math.round((logs.filter(log => log.status === 'success').length / logs.length) * 100)}%
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Operations completed
            </div>
          </CardContent>
        </Card>

        {/* Failed Operations Card */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6">
          <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <IconX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="leading-none font-semibold">Failed</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Error operations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-red-600">
                {logs.filter(log => log.status === 'error').length}
              </div>
              <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                -{Math.round((logs.filter(log => log.status === 'error').length / logs.length) * 100)}%
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Operations failed
            </div>
          </CardContent>
        </Card>

        {/* Pending Operations Card */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6">
          <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <IconClock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="leading-none font-semibold">Pending</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">In progress operations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-yellow-600">
                {logs.filter(log => log.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                {Math.round((logs.filter(log => log.status === 'pending').length / logs.length) * 100)}%
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Operations in queue
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}