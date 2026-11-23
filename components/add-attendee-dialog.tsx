'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface AddAttendeeDialogProps {
  open: boolean;
  listId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAttendeeDialog({ open, listId, onClose, onSuccess }: AddAttendeeDialogProps) {
  const [name, setName] = useState('');
  const [senas, setSenas] = useState('');
  const [refreshmentCount, setRefreshmentCount] = useState('1');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          name,
          senas,
          email,
          refreshmentCount: parseInt(refreshmentCount, 10) || 1
        })
      });

      if (res.ok) {
        setName('');
        setSenas('');
        setRefreshmentCount('1');
        setEmail('');
        onSuccess();
      } else {
        const data = await res.json();
        setError(data?.error || 'Error al agregar asistente');
      }
    } catch (err) {
      setError('Error al agregar asistente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Asistente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo asistente para esta lista
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nombre completo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senas">Señas (opcional)</Label>
            <Input
              id="senas"
              value={senas}
              onChange={(e) => setSenas(e.target.value)}
              placeholder="Característica distintiva (ej. camisa azul, silla de ruedas)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refreshmentCount">Refrigerios a retirar</Label>
            <Input
              id="refreshmentCount"
              type="number"
              min={1}
              step={1}
              value={refreshmentCount}
              onChange={(e) => setRefreshmentCount(e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              Cantidad de refrigerios/invitaciones de esta persona (según su ficha). Por defecto 1.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
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
                  Agregando...
                </>
              ) : (
                'Agregar Asistente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
