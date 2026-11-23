'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardList, Eye, EyeOff, Trash2, Calendar, ChevronDown, ChevronUp, CalendarPlus } from 'lucide-react';

interface ListsTabProps {
  lists: any[];
  isAdmin: boolean;
  onUpdate: () => void;
}

export function ListsTab({ lists, isAdmin, onUpdate }: ListsTabProps) {
  const router = useRouter();
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [hiddenListsOpen, setHiddenListsOpen] = useState(false);

  const handleToggleVisibility = async (listId: string, currentVisibility: boolean) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error cambiando visibilidad:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteListId) return;

    try {
      const res = await fetch(`/api/lists/${deleteListId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error eliminando lista:', error);
    } finally {
      setDeleteListId(null);
    }
  };

  const handleExportCalendar = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/lists/${listId}/calendar`;
    link.download = `evento-${listId}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const visibleLists = lists.filter(l => l.isVisible);
  const hiddenLists = lists.filter(l => !l.isVisible);

  if (lists.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay listas creadas</h3>
          <p className="text-muted-foreground">
            {isAdmin ? 'Crea una lista para comenzar a registrar asistencia' : 'Aún no hay listas disponibles'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderListCard = (list: any, isHidden = false) => (
    <Card 
      key={list.id} 
      className={`hover:shadow-lg transition-shadow group relative ${isHidden ? 'opacity-60' : ''}`}
    >
      <div 
        className="cursor-pointer"
        onClick={() => router.push(`/dashboard/lists/${list.id}`)}
      >
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-lg group-hover:from-purple-200 group-hover:to-violet-200 dark:group-hover:from-purple-800/40 dark:group-hover:to-violet-800/40 transition-colors">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {list.description}
          </CardTitle>
          <CardDescription>
            <span className="font-medium">{list._count?.attendees || 0}</span> asistentes · <span className="font-medium">{list._count?.attendances || 0}</span> presentes
          </CardDescription>
          {list.eventDate && (
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDate(list.eventDate)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => handleExportCalendar(e, list.id)}
                title="Exportar al calendario"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-primary" />
              </Button>
            </div>
          )}
        </CardHeader>
      </div>
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleVisibility(list.id, list.isVisible);
            }}
            title={list.isVisible ? 'Ocultar lista' : 'Mostrar lista'}
          >
            {list.isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteListId(list.id);
            }}
            title="Eliminar lista"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Listas Visibles */}
        {visibleLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleLists.map((list) => renderListCard(list))}
          </div>
        )}

        {/* Listas Ocultas */}
        {isAdmin && hiddenLists.length > 0 && (
          <Collapsible open={hiddenListsOpen} onOpenChange={setHiddenListsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Listas Ocultas ({hiddenLists.length})
                </span>
                {hiddenListsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hiddenLists.map((list) => renderListCard(list, true))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La lista y todos sus registros de asistencia serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
