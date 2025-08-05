'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, RefreshCw, Database, GitBranch, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { NotionConnectionsTab } from '@/components/dashboard/notion-connections-tab';
import { DiscordChannelsTab } from '@/components/dashboard/discord-channels-tab';
import { SyncMappingsTab } from '@/components/dashboard/sync-mappings-tab';
import { IssuesDataTable } from '@/components/dashboard/issues-data-table';

interface DashboardStats {
  totalIssues: number;
  totalMappings: number;
  totalNotionConnections: number;
  totalDiscordChannels: number;
  issuesByStatus: Array<{ status: string; count: number }>;
  issuesBySeverity: Array<{ severity: string; count: number }>;
  activeMappings: Array<{ id: string; notionDatabase: string; discordChannel: string; lastSync: string | null }>;
  recentSyncActivity: Array<{ id: string; timestamp: string; status: string; issuesProcessed: number; errors: string | null }>;
  syncSuccessRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    
    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSyncMessage('Sync completed successfully!');
        await fetchStats(); // Refresh stats after sync
      } else {
        setSyncMessage(`Sync failed: ${data.error}`);
      }
    } catch {
      setSyncMessage('Sync failed: Network error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notion-Discord Sync Dashboard</h1>
          <p className="text-muted-foreground">Manage your Notion databases and Discord channel synchronization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runSync} disabled={isSyncing} size="sm">
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Sync
          </Button>
        </div>
      </div>

      {syncMessage && (
        <Alert className={syncMessage.includes('failed') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{syncMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notion">Notion</TabsTrigger>
          <TabsTrigger value="discord">Discord</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalIssues || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.issuesByStatus?.find(s => s.status === 'Open')?.count || 0} open, {stats?.issuesByStatus?.find(s => s.status === 'Fixed')?.count || 0} fixed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notion Connections</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalNotionConnections || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Connected databases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Discord Channels</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalDiscordChannels || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Connected channels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Mappings</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeMappings?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {stats?.totalMappings || 0} total mappings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Project and Severity Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Issues by Status</CardTitle>
                <CardDescription>Issues grouped by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.issuesByStatus?.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm">{item.status}</span>
                      <Badge variant={item.status === 'Fixed' ? 'default' : 'secondary'}>{item.count}</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No status data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues by Severity</CardTitle>
                <CardDescription>Open issues grouped by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.issuesBySeverity?.map((item) => (
                    <div key={item.severity} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{item.severity}</span>
                      <Badge 
                        variant={item.severity === 'High' || item.severity === 'Critical' ? 'destructive' : 
                                item.severity === 'Medium' ? 'default' : 'secondary'}
                      >
                        {item.count}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No severity data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Status and Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sync Performance</CardTitle>
                <CardDescription>Overall synchronization success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{Math.round(stats?.syncSuccessRate || 0)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">Success Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Mappings</CardTitle>
                <CardDescription>Currently configured sync mappings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {stats?.activeMappings?.slice(0, 3).map((mapping) => (
                    <div key={mapping.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{mapping.notionDatabase} → {mapping.discordChannel}</span>
                      <Badge variant="outline" className="text-xs">
                        {mapping.lastSync ? new Date(mapping.lastSync).toLocaleDateString() : 'Never'}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No active mappings</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sync Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Latest synchronization operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentSyncActivity?.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' : 
                        activity.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">
                          {activity.status === 'success' ? 'Sync Completed' : 
                           activity.status === 'error' ? 'Sync Failed' : 'Sync In Progress'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.issuesProcessed} issues</p>
                      {activity.errors && (
                        <p className="text-xs text-red-600 truncate max-w-32">{activity.errors}</p>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent sync activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notion">
          <NotionConnectionsTab onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="discord">
          <DiscordChannelsTab onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="mappings">
          <SyncMappingsTab onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesDataTable issues={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}