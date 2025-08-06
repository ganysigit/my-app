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
import { Loader2, Plus, Edit, Trash2, MessageSquare, CheckCircle, XCircle, AlertCircle, Search, Grid3X3, List, Filter } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const getIconColor = (channel: DiscordChannel) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    const index = channel.id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const filterChannels = () => {
    return channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           channel.channelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           channel.guildId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && channel.isActive) ||
                           (statusFilter === 'inactive' && !channel.isActive);
      
      return matchesSearch && matchesStatus;
    });
  };

  const filteredChannels = filterChannels();
  const activeCount = channels.filter(c => c.isActive).length;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Discord Channels</h2>
          <p className="text-muted-foreground">
            {activeCount} of {channels.length} channels active
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Channel
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

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
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

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
        {filteredChannels.map((channel) => (
          <Card key={channel.id} className={viewMode === 'list' ? 'flex flex-row items-center' : ''}>
            {viewMode === 'grid' ? (
              <>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg ${getIconColor(channel)} flex items-center justify-center`}>
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Discord Channel</p>
                    </div>
                  </div>
                  <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                    {channel.isActive ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Channel ID:</span>
                      <span className="ml-2 text-muted-foreground font-mono">{channel.channelId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Guild ID:</span>
                      <span className="ml-2 text-muted-foreground font-mono">{channel.guildId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2 text-muted-foreground">
                        {new Date(channel.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Button
                       variant={channel.isActive ? 'outline' : 'default'}
                       size="sm"
                       onClick={() => toggleChannelActive(channel.id)}
                     >
                       {channel.isActive ? 'Deactivate' : 'Activate'}
                     </Button>
                     <div className="flex space-x-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => openEditDialog(channel)}
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => deleteChannel(channel.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardContent className="flex items-center justify-between w-full p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg ${getIconColor(channel)} flex items-center justify-center`}>
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{channel.name}</h3>
                        <Badge variant={channel.isActive ? 'default' : 'secondary'} className="text-xs">
                          {channel.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>Channel: <span className="font-mono">{channel.channelId}</span></span>
                        <span>Guild: <span className="font-mono">{channel.guildId}</span></span>
                        <span>Created: {new Date(channel.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                     <Button
                       variant={channel.isActive ? 'outline' : 'default'}
                       size="sm"
                       onClick={() => toggleChannelActive(channel.id)}
                     >
                       {channel.isActive ? 'Deactivate' : 'Activate'}
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => openEditDialog(channel)}
                     >
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => deleteChannel(channel.id)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>

      {filteredChannels.length === 0 && channels.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No channels found</h3>
            <p className="text-muted-foreground text-center mb-4">
              No channels match your current search and filter criteria.
            </p>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

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