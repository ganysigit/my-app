'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, GitBranch, CheckCircle, XCircle, AlertCircle, Play, Search, Grid3X3, List, Filter } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const mappingSchema = z.object({
  notionConnectionId: z.string().min(1, 'Notion connection is required'),
  discordChannelId: z.string().min(1, 'Discord channel is required'),
  projectFilter: z.string().min(1, 'Project filter is required'),
});

type MappingFormData = z.infer<typeof mappingSchema>;

interface SyncMapping {
  id: string;
  notionConnectionId: string;
  discordChannelId: string;
  projectFilter: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  notionConnectionName: string;
  notionDatabaseId: string;
  discordChannelName: string;
  discordChannelIdValue: string;
  discordGuildId: string;
}

interface NotionConnection {
  id: string;
  name: string;
  databaseId: string;
  isActive: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  channelId: string;
  guildId: string;
  isActive: boolean;
}

interface SyncMappingsTabProps {
  onUpdate: () => void;
}

export function SyncMappingsTab({ onUpdate }: SyncMappingsTabProps) {
  const [mappings, setMappings] = useState<SyncMapping[]>([]);
  const [notionConnections, setNotionConnections] = useState<NotionConnection[]>([]);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SyncMapping | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingMappingId, setSyncingMappingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MappingFormData>({
    resolver: zodResolver(mappingSchema),
  });

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/sync/mappings');
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const [notionResponse, discordResponse] = await Promise.all([
        fetch('/api/notion/connect'),
        fetch('/api/discord/connect'),
      ]);

      if (notionResponse.ok) {
        const notionData = await notionResponse.json();
        setNotionConnections(notionData.connections.filter((c: NotionConnection) => c.isActive));
      }

      if (discordResponse.ok) {
        const discordData = await discordResponse.json();
        setDiscordChannels(discordData.channels.filter((c: DiscordChannel) => c.isActive));
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const onSubmit = async (data: MappingFormData) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = '/api/sync/mappings';
      const method = editingMapping ? 'PUT' : 'POST';
      const body = editingMapping 
        ? { id: editingMapping.id, ...data }
        : data;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: editingMapping ? 'Mapping updated successfully!' : 'Mapping created successfully!' 
        });
        setIsDialogOpen(false);
        reset();
        setEditingMapping(null);
        await fetchMappings();
        onUpdate();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save mapping' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (mapping: SyncMapping) => {
    setEditingMapping(mapping);
    reset({
      notionConnectionId: mapping.notionConnectionId,
      discordChannelId: mapping.discordChannelId,
      projectFilter: mapping.projectFilter,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sync mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sync/mappings?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Mapping deleted successfully!' });
        await fetchMappings();
        onUpdate();
      } else {
        const result = await response.json();
        setMessage({ type: 'error', text: result.error || 'Failed to delete mapping' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const toggleActive = async (mapping: SyncMapping) => {
    try {
      const response = await fetch('/api/sync/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mapping.id,
          isActive: !mapping.isActive,
        }),
      });

      if (response.ok) {
        await fetchMappings();
        onUpdate();
      }
    } catch {
      console.error('Error toggling mapping status');
    }
  };

  const runSyncForMapping = async (mappingId: string) => {
    setSyncingMappingId(mappingId);
    setMessage(null);

    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingId }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Sync completed successfully!' });
        onUpdate();
      } else {
        setMessage({ type: 'error', text: result.error || 'Sync failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSyncingMappingId(null);
    }
  };

  const openCreateDialog = () => {
    setEditingMapping(null);
    reset({ notionConnectionId: '', discordChannelId: '', projectFilter: 'all' });
    setIsDialogOpen(true);
  };

  const getIconColor = (mapping: SyncMapping) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const index = mapping.id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const filterMappings = () => {
    return mappings.filter(mapping => {
      const matchesSearch = mapping.notionConnectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mapping.discordChannelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mapping.projectFilter.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && mapping.isActive) ||
                           (statusFilter === 'inactive' && !mapping.isActive);
      
      return matchesSearch && matchesStatus;
    });
  };

  const filteredMappings = filterMappings();
  const activeCount = mappings.filter(m => m.isActive).length;

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchConnections(),
        fetchMappings(),
        fetchProjects(),
      ]);
      setIsLoading(false);
    };

    fetchData();
  }, []);

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
        <span className="ml-2">Loading mappings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sync Mappings ({mappings.length})</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={notionConnections.length === 0 || discordChannels.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingMapping ? 'Edit Sync Mapping' : 'Add Sync Mapping'}
              </DialogTitle>
              <DialogDescription>
                Create a mapping between a Notion database and Discord channel for a specific project.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notionConnectionId">Notion Connection</Label>
                <Controller
                  name="notionConnectionId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Notion connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {notionConnections.filter(connection => connection.id && connection.id.trim() !== "").map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.notionConnectionId && (
                  <p className="text-sm text-red-600">{errors.notionConnectionId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="discordChannelId">Discord Channel</Label>
                <Controller
                  name="discordChannelId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Discord channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {discordChannels.filter(channel => channel.id && channel.id.trim() !== "").map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.discordChannelId && (
                  <p className="text-sm text-red-600">{errors.discordChannelId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectFilter">Project Filter</Label>
                <Controller
                  name="projectFilter"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.filter(project => project && project.trim() !== "").map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.projectFilter && (
                  <p className="text-sm text-red-600">{errors.projectFilter.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingMapping ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              {statusFilter === 'active' ? `Active (${activeCount})` : 
               statusFilter === 'inactive' ? `Inactive (${mappings.length - activeCount})` :
               `All Mappings (${mappings.length})`}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for Mapping..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {(notionConnections.length === 0 || discordChannels.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need at least one active Notion connection and one active Discord channel to create sync mappings.
          </AlertDescription>
        </Alert>
      )}

      {/* Mappings Grid */}
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredMappings.map((mapping) => (
          <Card key={mapping.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${getIconColor(mapping)} flex items-center justify-center`}>
                    <GitBranch className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {mapping.notionConnectionName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mapping.projectFilter === 'all' ? 'All projects sync to' : `${mapping.projectFilter} project syncs to`} #{mapping.discordChannelName}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={mapping.isActive ? 'default' : 'secondary'} className="text-xs">
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Public
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(mapping.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Notion: {mapping.notionDatabaseId?.slice(0, 12)}...</p>
                  <p>Discord: {mapping.discordChannelIdValue}</p>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runSyncForMapping(mapping.id)}
                      disabled={!mapping.isActive || syncingMappingId === mapping.id}
                      className="h-8 w-8 p-0"
                    >
                      {syncingMappingId === mapping.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(mapping)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(mapping.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant={mapping.isActive ? 'outline' : 'default'}
                    onClick={() => toggleActive(mapping)}
                    className="text-xs h-7"
                  >
                    {mapping.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMappings.length === 0 && mappings.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mappings found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your search or filter criteria.
            </p>
          </CardContent>
        </Card>
      )}
      
      {mappings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No sync mappings yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first sync mapping to start syncing data between Notion and Discord. Connect your databases and channels to automate your workflow.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Mapping
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}