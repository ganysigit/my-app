'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, Database, CheckCircle, XCircle, AlertCircle, Search, Grid3X3, List, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  databaseId: z.string().min(1, 'Database ID is required'),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface NotionConnection {
  id: string;
  name: string;
  databaseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotionConnectionsTabProps {
  onUpdate: () => void;
}

export function NotionConnectionsTab({ onUpdate }: NotionConnectionsTabProps) {
  const [connections, setConnections] = useState<NotionConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<NotionConnection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
  });

  // Helper function to get icon color based on connection ID
  const getIconColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500'
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Filter connections based on search and status
  const filterConnections = (connections: NotionConnection[]) => {
    return connections.filter(connection => {
      const matchesSearch = connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           connection.databaseId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && connection.isActive) ||
                           (statusFilter === 'inactive' && !connection.isActive);
      return matchesSearch && matchesStatus;
    });
  };

  const filteredConnections = filterConnections(connections);
  const activeCount = connections.filter(c => c.isActive).length;

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/notion/connect');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ConnectionFormData) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = editingConnection ? '/api/notion/connect' : '/api/notion/connect';
      const method = editingConnection ? 'PUT' : 'POST';
      const body = editingConnection 
        ? { id: editingConnection.id, ...data }
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
          text: editingConnection ? 'Connection updated successfully!' : 'Connection created successfully!' 
        });
        setIsDialogOpen(false);
        reset();
        setEditingConnection(null);
        await fetchConnections();
        onUpdate();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save connection' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (connection: NotionConnection) => {
    setEditingConnection(connection);
    reset({
      name: connection.name,
      apiKey: '', // Don't pre-fill API key for security
      databaseId: connection.databaseId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection? This will also delete all related sync mappings.')) {
      return;
    }

    try {
      const response = await fetch(`/api/notion/connect?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Connection deleted successfully!' });
        await fetchConnections();
        onUpdate();
      } else {
        const result = await response.json();
        setMessage({ type: 'error', text: result.error || 'Failed to delete connection' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const toggleActive = async (connection: NotionConnection) => {
    try {
      const response = await fetch('/api/notion/connect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: connection.id,
          isActive: !connection.isActive,
        }),
      });

      if (response.ok) {
        await fetchConnections();
        onUpdate();
      }
    } catch {
      console.error('Error toggling connection status:');
    }
  };

  const openCreateDialog = () => {
    setEditingConnection(null);
    reset({ name: '', apiKey: '', databaseId: '' });
    setIsDialogOpen(true);
  };

  useEffect(() => {
    fetchConnections();
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
        <span className="ml-2">Loading connections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Notion Connections ({connections.length})
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingConnection ? 'Edit Connection' : 'Add Notion Connection'}
              </DialogTitle>
              <DialogDescription>
                Connect to your Notion database to sync issues with Discord.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  placeholder="My Project Database"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Notion API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="secret_..."
                  {...register('apiKey')}
                />
                {errors.apiKey && (
                  <p className="text-sm text-red-600">{errors.apiKey.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="databaseId">Database ID</Label>
                <Input
                  id="databaseId"
                  placeholder="32-character database ID"
                  {...register('databaseId')}
                />
                {errors.databaseId && (
                  <p className="text-sm text-red-600">{errors.databaseId.message}</p>
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
                  {editingConnection ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{activeCount} active</span>
          <span>{connections.length - activeCount} inactive</span>
          <span>{connections.length} total</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Connections</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Connections Grid */}
      <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredConnections.map((connection) => (
          <Card key={connection.id} className="group hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getIconColor(connection.id)} flex items-center justify-center`}>
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">{connection.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Database connection for Notion sync
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(connection.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={connection.isActive ? 'default' : 'secondary'} className="text-xs">
                    {connection.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Public
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Database ID:</span>
                    <span className="ml-2 text-muted-foreground font-mono text-xs">
                      {connection.databaseId.slice(0, 12)}...
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={connection.isActive ? 'outline' : 'default'}
                    onClick={() => toggleActive(connection)}
                    className="flex-1"
                  >
                    {connection.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(connection)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(connection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty States */}
      {filteredConnections.length === 0 && connections.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No connections found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}

      {connections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No Notion connections</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Add your first Notion database connection to start syncing issues with Discord.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Connection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}