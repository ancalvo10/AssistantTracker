'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface CreateListDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateListDialog({ open, projectId, onClose, onSuccess }: CreateListDialogProps) {
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description,
          eventDate: eventDate || null
        })
      });

      if (res.ok) {
        setDescription('');
        setEventDate('');
        onSuccess();
      } else {
        const data = await res.json();
        setError(data?.error || 'Error al crear lista');
      }
    } catch (err) {
      setError('Error al crear lista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Lista de Asistencia</DialogTitle>
          <DialogDescription>
            Agrega una descripción y opcionalmente una fecha del evento
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Ej: Reunión - 15 de marzo 2024 - 7:00 PM"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Fecha del evento (opcional)</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si agregas fecha, los usuarios podrán exportar un recordatorio a su calendario
            </p>
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
                  Creando...
                </>
              ) : (
                'Crear Lista'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
