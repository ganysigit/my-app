'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, Bug, CheckCircle, XCircle, Clock } from 'lucide-react';
import { IssuesDataTable } from './issues-data-table';

interface Issue {
  id: string;
  issueId: string;
  status: string;
  project: string;
  bugName: string;
  bugDescription: string;
  attachedFiles: string | null;
  severity: string;
  notionPageId: string;
  notionConnectionId: string;
  isSynced: boolean;
  discordMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  notionConnectionName: string;
  notionDatabaseId: string;
}

interface IssueStats {
  total: number;
  open: number;
  fixed: number;
  synced: number;
  unsynced: number;
  byProject: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface IssuesTabProps {
  refreshTrigger: number;
}

export function IssuesTab({ refreshTrigger }: IssuesTabProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchIssues = useCallback(async () => {
    try {
      const response = await fetch('/api/issues');
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || data);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      setMessage({ type: 'error', text: 'Failed to fetch issues' });
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stats' }),
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchIssues(), fetchStats()]);
    setIsRefreshing(false);
  }, [fetchIssues]);


  useEffect(() => {
    Promise.all([fetchIssues(), fetchStats()]).finally(() => setIsLoading(false));
  }, [fetchIssues]);

  useEffect(() => {
    refreshData();
  }, [refreshTrigger, refreshData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading issues...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
          <p className="text-muted-foreground">View and manage all issues from your Notion databases</p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
          <Card className="@container/card" data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="@container/card" data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 tabular-nums @[250px]/card:text-3xl">{stats.open}</div>
            </CardContent>
          </Card>
          <Card className="@container/card" data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fixed Issues</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 tabular-nums @[250px]/card:text-3xl">{stats.fixed}</div>
            </CardContent>
          </Card>
          <Card className="@container/card" data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Synced</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 tabular-nums @[250px]/card:text-3xl">{stats.synced}</div>
            </CardContent>
          </Card>
          <Card className="@container/card" data-slot="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unsynced</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 tabular-nums @[250px]/card:text-3xl">{stats.unsynced}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues Data Table */}
      <IssuesDataTable data={issues} />
    </div>
  );
}