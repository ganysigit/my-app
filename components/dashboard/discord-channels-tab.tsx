'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const channelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  botToken: z.string().min(1, 'Bot token is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
  guildId: z.string().min(1, 'Guild ID is required'),
});

type ChannelFormData = z.infer<typeof channelSchema>;

interface DiscordChannel {
  id: string;
  name: string;
  channelId: string;
  guildId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiscordChannelsTabProps {
  onUpdate: () => void;
}

export function DiscordChannelsTab({ onUpdate }: DiscordChannelsTabProps) {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DiscordChannel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
  });

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/discord/connect');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ChannelFormData) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = '/api/discord/connect';
      const method = editingChannel ? 'PUT' : 'POST';
      const body = editingChannel 
        ? { id: editingChannel.id, ...data }
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
          text: editingChannel ? 'Channel updated successfully!' : 'Channel created successfully!' 
        });
        setIsDialogOpen(false);
        reset();
        setEditingChannel(null);
        await fetchChannels();
        onUpdate();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save channel' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (channel: DiscordChannel) => {
    setEditingChannel(channel);
    reset({
      name: channel.name,
      botToken: '', // Don't pre-fill bot token for security
      channelId: channel.channelId,
      guildId: channel.guildId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel? This will also delete all related sync mappings.')) {
      return;
    }

    try {
      const response = await fetch(`/api/discord/connect?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Channel deleted successfully!' });
        await fetchChannels();
        onUpdate();
      } else {
        const result = await response.json();
        setMessage({ type: 'error', text: result.error || 'Failed to delete channel' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const toggleActive = async (channel: DiscordChannel) => {
    try {
      const response = await fetch('/api/discord/connect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: channel.id,
          isActive: !channel.isActive,
        }),
      });

      if (response.ok) {
        await fetchChannels();
        onUpdate();
      }
    } catch (err) {
      console.error('Error toggling channel status:', err);
    }
  };

  const openCreateDialog = () => {
    setEditingChannel(null);
    reset({ name: '', botToken: '', channelId: '', guildId: '' });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    fetchChannels();
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
        <span className="ml-2">Loading channels...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Discord Channels</h2>
          <p className="text-muted-foreground">Manage your Discord channel connections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Edit Channel' : 'Add Discord Channel'}
              </DialogTitle>
              <DialogDescription>
                Connect to your Discord channel to receive issue notifications.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  placeholder="Bug Reports Channel"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="Bot token from Discord Developer Portal"
                  {...register('botToken')}
                />
                {errors.botToken && (
                  <p className="text-sm text-red-600">{errors.botToken.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="channelId">Channel ID</Label>
                <Input
                  id="channelId"
                  placeholder="Discord channel ID (18-19 digits)"
                  {...register('channelId')}
                />
                {errors.channelId && (
                  <p className="text-sm text-red-600">{errors.channelId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guildId">Guild ID</Label>
                <Input
                  id="guildId"
                  placeholder="Discord server/guild ID (18-19 digits)"
                  {...register('guildId')}
                />
                {errors.guildId && (
                  <p className="text-sm text-red-600">{errors.guildId.message}</p>
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
                  {editingChannel ? 'Update' : 'Create'}
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">{channel.name}</CardTitle>
              </div>
              <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                {channel.isActive ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {channel.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Channel: {channel.channelId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Guild: {channel.guildId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(channel.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(channel)}
                  >
                    {channel.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(channel)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(channel.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {channels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Discord channels</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first Discord channel connection to start receiving issue notifications.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}