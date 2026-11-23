'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Search, CheckCircle2, Clock, Plus, Upload, Users, QrCode, Trash2, Mail, Send, CalendarPlus, Calendar, Coffee } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AddAttendeeDialog } from '@/components/add-attendee-dialog';
import { UploadCSVDialog } from '@/components/upload-csv-dialog';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';
import { QRViewDialog } from '@/components/qr-view-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ListDetailPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const listId = params?.id as string;

  const [list, setList] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [showUploadCSV, setShowUploadCSV] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRView, setShowQRView] = useState<string | null>(null);
  const [deleteAttendeeId, setDeleteAttendeeId] = useState<string | null>(null);
  const [sendingBulkQRs, setSendingBulkQRs] = useState(false);
  const [bulkSendResult, setBulkSendResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmBulkSend, setConfirmBulkSend] = useState(false);

  const loadListData = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) setLoading(true);

      const [listRes, attendancesRes] = await Promise.all([
        fetch(`/api/lists/${listId}`),
        fetch(`/api/attendance?listId=${listId}`)
      ]);

      if (listRes.ok && attendancesRes.ok) {
        const listData = await listRes.json();
        const attendancesData = await attendancesRes.json();
        setList(listData);
        setAttendances(attendancesData);
        setLastUpdate(new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else if (listRes.status === 403) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error cargando datos de lista:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [listId, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && listId) {
      loadListData(true);
    }
  }, [status, router, listId, loadListData]);

  // Polling en intervalo — se pausa cuando el escáner QR está abierto
  // para evitar que el re-render interfiera con el video de la cámara.
  useEffect(() => {
    if (status !== 'authenticated' || !listId) return;
    if (showQRScanner) return; // no polling mientras escanea

    const interval = setInterval(() => {
      loadListData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [status, listId, loadListData, showQRScanner]);

  const handleToggleAttendance = async (attendeeId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          attendeeId,
          isPresent: !currentStatus
        })
      });

      if (res.ok) {
        loadListData(false);
      }
    } catch (error) {
      console.error('Error actualizando asistencia:', error);
    }
  };

  const handleBulkSendQRs = async () => {
    setSendingBulkQRs(true);
    setBulkSendResult(null);
    try {
      const res = await fetch(`/api/lists/${listId}/send-qrs`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        let text = data.message || 'Códigos QR enviados';
        if (data.failures?.length) {
          text += ` (${data.failures.length} fallaron)`;
        }
        if (data.withoutEmail) {
          text += `. ${data.withoutEmail} asistente(s) sin correo.`;
        }
        setBulkSendResult({ type: 'success', text });
      } else {
        setBulkSendResult({ type: 'error', text: data.error || 'Error al enviar los códigos QR' });
      }
    } catch (error) {
      setBulkSendResult({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSendingBulkQRs(false);
      setConfirmBulkSend(false);
    }
  };

  const handleDeleteAttendee = async () => {
    if (!deleteAttendeeId) return;
    try {
      const res = await fetch(`/api/attendees?id=${deleteAttendeeId}`, { method: 'DELETE' });
      if (res.ok) {
        loadListData(false);
      }
    } catch (error) {
      console.error('Error eliminando asistente:', error);
    } finally {
      setDeleteAttendeeId(null);
    }
  };

  if (status === 'loading' || loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!list) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Lista no encontrada</h3>
          <Button onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';
  const attendees = list?.attendees || [];
  
  const attendanceMap = new Map();
  attendances.forEach(att => {
    attendanceMap.set(att.attendeeId, att.isPresent);
  });

  const filteredAttendees = attendees.filter((a: any) => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.senas || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = attendances.filter(a => a.isPresent).length;
  const totalCount = attendees.length;
  const attendeesWithEmailCount = attendees.filter((a: any) => !!a.email).length;

  // Refrigerios: total planificado y total entregado (asistentes presentes)
  const totalRefreshments = attendees.reduce((sum: number, a: any) => sum + (a.refreshmentCount ?? 1), 0);
  const distributedRefreshments = attendees.reduce(
    (sum: number, a: any) => (attendanceMap.get(a.id) ? sum + (a.refreshmentCount ?? 1) : sum),
    0
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Lista de Asistencia</h1>
              <p className="text-muted-foreground mt-1">{list?.description}</p>
              <p className="text-sm text-muted-foreground mt-1">Proyecto: {list?.project?.name}</p>
              {list?.eventDate && (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {new Date(list.eventDate).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-3">
                <Badge 
                  variant="default" 
                  className="text-base px-3 py-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {presentCount} de {totalCount} presentes
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-base px-3 py-1"
                  title="Refrigerios entregados (presentes) de total planificado"
                >
                  <Coffee className="w-4 h-4 mr-1" />
                  {distributedRefreshments} / {totalRefreshments} refrigerios
                </Badge>
                {lastUpdate && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {lastUpdate}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {list?.eventDate && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/lists/${listId}/calendar`;
                    link.download = `evento-${listId}.ics`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  Calendario
                </Button>
              )}
              <Button
                onClick={() => setShowQRScanner(true)}
                variant="outline"
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                Escanear QR
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmBulkSend(true)}
                    disabled={attendeesWithEmailCount === 0 || sendingBulkQRs}
                    className="gap-2"
                    title={
                      attendeesWithEmailCount === 0
                        ? 'No hay asistentes con correo registrado'
                        : `Enviar código QR a ${attendeesWithEmailCount} asistente(s) con correo`
                    }
                  >
                    {sendingBulkQRs ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {sendingBulkQRs ? 'Enviando...' : `Enviar QRs (${attendeesWithEmailCount})`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadCSV(true)}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Importar CSV
                  </Button>
                  <Button onClick={() => setShowAddAttendee(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar Asistente
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resultado envío masivo */}
        {bulkSendResult && (
          <Alert
            className={`mb-4 ${
              bulkSendResult.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {bulkSendResult.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Mail className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription
                  className={
                    bulkSendResult.type === 'success' ? 'text-green-800' : 'text-red-700'
                  }
                >
                  {bulkSendResult.text}
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setBulkSendResult(null)}
              >
                Cerrar
              </Button>
            </div>
          </Alert>
        )}

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o señas"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Asistencia */}
        <Card>
          <CardHeader>
            <CardTitle>Asistentes</CardTitle>
            <CardDescription>
              Marca o desmarca la asistencia de cada persona. Puedes usar el botón de QR para ver el código de cada asistente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron resultados' : 'No hay asistentes registrados en esta lista'}
                </p>
                {!searchTerm && isAdmin && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Agrega asistentes manualmente o importa un archivo CSV
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Presente</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-center">Refrigerios</TableHead>
                      <TableHead className="hidden sm:table-cell">Señas</TableHead>
                      <TableHead className="hidden md:table-cell">Correo</TableHead>
                      <TableHead className="w-20 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendees.map((attendee: any) => {
                      const isPresent = attendanceMap.get(attendee.id) || false;
                      return (
                        <TableRow 
                          key={attendee.id}
                          className={isPresent ? 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isPresent}
                              onCheckedChange={() => handleToggleAttendance(attendee.id, isPresent)}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{attendee.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="gap-1 font-semibold">
                              <Coffee className="w-3 h-3" />
                              {attendee.refreshmentCount ?? 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {attendee.senas || <span className="text-muted-foreground italic">—</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {attendee.email || <span className="text-muted-foreground italic">N/A</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShowQRView(attendee.id)}
                                title="Ver código QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeleteAttendeeId(attendee.id)}
                                  title="Eliminar asistente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-4">
              Mostrando {filteredAttendees.length} de {attendees.length} asistentes
            </p>
          </CardContent>
        </Card>
      </div>

      {showAddAttendee && (
        <AddAttendeeDialog
          open={showAddAttendee}
          listId={listId}
          onClose={() => setShowAddAttendee(false)}
          onSuccess={() => {
            setShowAddAttendee(false);
            loadListData(false);
          }}
        />
      )}

      {showUploadCSV && (
        <UploadCSVDialog
          open={showUploadCSV}
          listId={listId}
          onClose={() => setShowUploadCSV(false)}
          onSuccess={() => {
            setShowUploadCSV(false);
            loadListData(false);
          }}
        />
      )}

      {showQRScanner && (
        <QRScannerDialog
          open={showQRScanner}
          listId={listId}
          onClose={() => setShowQRScanner(false)}
          onAttendanceMarked={() => loadListData(false)}
        />
      )}

      {showQRView && (
        <QRViewDialog
          open={!!showQRView}
          attendeeId={showQRView}
          onClose={() => setShowQRView(null)}
        />
      )}

      <AlertDialog open={confirmBulkSend} onOpenChange={(o) => !o && setConfirmBulkSend(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar códigos QR masivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un correo con su código QR personal a{' '}
              <strong>{attendeesWithEmailCount}</strong> asistente(s) con correo electrónico registrado
              en esta lista. Esta acción puede tardar algunos segundos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingBulkQRs}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSendQRs} disabled={sendingBulkQRs}>
              {sendingBulkQRs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onClick={handleDeleteAttendee}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
