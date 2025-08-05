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
import { Loader2, Plus, Edit, Trash2, GitBranch, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SyncMapping | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingMappingId, setSyncingMappingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    reset({ notionConnectionId: '', discordChannelId: '', projectFilter: '' });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    Promise.all([fetchMappings(), fetchConnections()]);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sync Mappings</h2>
          <p className="text-muted-foreground">Configure which Notion projects sync to which Discord channels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={notionConnections.length === 0 || discordChannels.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
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
                        {notionConnections.map((connection) => (
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
                        {discordChannels.map((channel) => (
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
                <Input
                  id="projectFilter"
                  placeholder="e.g., Frontend, Backend, Mobile"
                  {...register('projectFilter')}
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

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {mappings.map((mapping) => (
          <Card key={mapping.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <GitBranch className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">
                  {mapping.notionConnectionName} → {mapping.discordChannelName}
                </CardTitle>
              </div>
              <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                {mapping.isActive ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {mapping.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Project:</span> {mapping.projectFilter}
                </p>
                <p className="text-xs text-muted-foreground">
                  Notion DB: {mapping.notionDatabaseId?.slice(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Discord: #{mapping.discordChannelIdValue}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(mapping.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSyncForMapping(mapping.id)}
                    disabled={!mapping.isActive || syncingMappingId === mapping.id}
                  >
                    {syncingMappingId === mapping.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(mapping)}
                  >
                    {mapping.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(mapping)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(mapping.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mappings.length === 0 && notionConnections.length > 0 && discordChannels.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sync mappings</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first sync mapping to connect Notion projects with Discord channels.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}