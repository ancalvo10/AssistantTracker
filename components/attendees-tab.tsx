'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2, Search, Coffee } from 'lucide-react';

interface AttendeesTabProps {
  attendees: any[];
  isAdmin: boolean;
  onUpdate: () => void;
}

export function AttendeesTab({ attendees, isAdmin, onUpdate }: AttendeesTabProps) {
  const [deleteAttendeeId, setDeleteAttendeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async () => {
    if (!deleteAttendeeId) return;

    try {
      const res = await fetch(`/api/attendees?id=${deleteAttendeeId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error eliminando asistente:', error);
    } finally {
      setDeleteAttendeeId(null);
    }
  };

  const filteredAttendees = attendees.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.senas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (attendees.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay asistentes registrados</h3>
          <p className="text-muted-foreground">
            {isAdmin ? 'Agrega asistentes manualmente o importa un archivo CSV' : 'Aún no hay asistentes en este proyecto'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, señas o correo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Refrigerios</TableHead>
                  <TableHead>Señas</TableHead>
                  <TableHead>Correo</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1 font-semibold">
                        <Coffee className="w-3 h-3" />
                        {attendee.refreshmentCount ?? 1}
                      </Badge>
                    </TableCell>
                    <TableCell>{attendee.senas || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell>{attendee.email || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAttendeeId(attendee.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAttendees.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground py-4">No se encontraron resultados</p>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            Mostrando {filteredAttendees.length} de {attendees.length} asistentes
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteAttendeeId} onOpenChange={() => setDeleteAttendeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asistente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El asistente y todos sus registros de asistencia serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
