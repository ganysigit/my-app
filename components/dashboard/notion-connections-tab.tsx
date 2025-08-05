'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
  });

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notion Connections</h2>
          <p className="text-muted-foreground">Manage your Notion database connections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
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

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">{connection.name}</CardTitle>
              </div>
              <Badge variant={connection.isActive ? 'default' : 'secondary'}>
                {connection.isActive ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {connection.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Database: {connection.databaseId.slice(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(connection.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(connection)}
                  >
                    {connection.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(connection)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(connection.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {connections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Notion connections</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first Notion database connection to start syncing issues.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}