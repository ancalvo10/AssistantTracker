'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface AssignTrackersDialogProps {
  open: boolean;
  project: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignTrackersDialog({ open, project, onClose, onSuccess }: AssignTrackersDialogProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (open) {
      loadUsers();
      // Pre-seleccionar usuarios ya asignados
      const assignedIds = project?.assignments?.map((a: any) => a.userId) || [];
      setSelectedUserIds(assignedIds);
    }
  }, [open, project]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Filtrar solo trackers
        const trackers = data.filter((u: any) => u.role === 'TRACKER');
        setUsers(trackers);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds })
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data?.error || 'Error al asignar trackers');
      }
    } catch (err) {
      setError('Error al asignar trackers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Trackers</DialogTitle>
          <DialogDescription>
            Selecciona los trackers que tendrán acceso a este proyecto
          </DialogDescription>
        </DialogHeader>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay trackers disponibles
                </p>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={user.id}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                    <Label 
                      htmlFor={user.id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600 ml-2">{error}</p>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Asignaciones'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
