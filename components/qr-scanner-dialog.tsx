'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { QrCode, Camera, CameraOff, CheckCircle2, Loader2, XCircle, UserCheck, AlertTriangle, Coffee } from 'lucide-react';

interface QRScannerDialogProps {
  open: boolean;
  listId: string;
  onClose: () => void;
  onAttendanceMarked: () => void;
}

type AttendeeInfo = {
  id: string;
  name: string;
  senas?: string | null;
  refreshmentCount: number;
  email?: string | null;
};

type PendingScan = {
  attendee: AttendeeInfo;
  alreadyPresent: boolean;
  qrToken: string;
};

export function QRScannerDialog({ open, listId, onClose, onAttendanceMarked }: QRScannerDialogProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingScan | null>(null);
  const [marking, setMarking] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const scannerRef = useRef<any>(null);
  // Previene múltiples lecturas simultáneas del mismo fotograma
  const busyRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear?.();
      } catch (e) {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleScannedToken = useCallback(
    async (qrToken: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLookupLoading(true);
      setError('');

      try {
        const res = await fetch('/api/attendance/qr-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrToken, listId })
        });
        const data = await res.json();

        if (res.ok) {
          // Detenemos la cámara de inmediato para liberar recursos.
          await stopScanner();
          setPending({
            attendee: data.attendee,
            alreadyPresent: data.alreadyPresent,
            qrToken
          });
        } else {
          setError(data.error || 'Código QR no válido');
          // Permite reintentar después de un breve lapso
          setTimeout(() => {
            setError('');
            busyRef.current = false;
          }, 2500);
          return;
        }
      } catch (err) {
        setError('Error de conexión');
        setTimeout(() => {
          setError('');
          busyRef.current = false;
        }, 2500);
        return;
      } finally {
        setLookupLoading(false);
      }
    },
    [listId, stopScanner]
  );

  const startScanner = useCallback(async () => {
    setError('');
    setPending(null);
    busyRef.current = false;

    try {
      // Solicitar permiso de cámara
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission('granted');

      const { Html5Qrcode } = await import('html5-qrcode');

      // Limpiar instancia previa
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState?.();
          if (state === 2) await scannerRef.current.stop();
          scannerRef.current.clear?.();
        } catch {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText: string) => {
          handleScannedToken(decodedText);
        },
        () => {
          // ignorar fallos de escaneo (no hay QR todavía)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        setCameraPermission('denied');
        setError('Permiso de cámara denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.');
      } else {
        setError('No se pudo iniciar la cámara. Verifica que tu dispositivo tiene cámara disponible.');
      }
    }
  }, [handleScannedToken]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setPending(null);
      setError('');
      busyRef.current = false;
      return;
    }

    // Iniciar cámara al abrir (si no hay pending)
    if (!pending) {
      const t = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = async () => {
    if (!pending) return;
    setMarking(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          attendeeId: pending.attendee.id,
          isPresent: true
        })
      });

      if (res.ok) {
        onAttendanceMarked();
        setPending(null);
        busyRef.current = false;
        // Reinicia la cámara para seguir escaneando
        setTimeout(() => startScanner(), 150);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al registrar asistencia');
      }
    } catch {
      setError('Error de conexión al registrar asistencia');
    } finally {
      setMarking(false);
    }
  };

  const handleRetry = async () => {
    setPending(null);
    setError('');
    busyRef.current = false;
    await startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    setPending(null);
    setError('');
    busyRef.current = false;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Escáner de Código QR
          </DialogTitle>
          <DialogDescription>
            {pending
              ? 'Verifica la información del asistente y confirma para registrar su asistencia.'
              : 'Apunta la cámara al código QR del asistente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!pending ? (
            <>
              {/* Scanner container */}
              <div className="relative rounded-lg overflow-hidden bg-gray-900 min-h-[300px] flex items-center justify-center">
                <div id="qr-reader" className="w-full" />

                {!scanning && !error && cameraPermission !== 'denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
                    <Camera className="w-12 h-12 mb-3 opacity-60" />
                    <p className="text-sm opacity-60">Iniciando cámara...</p>
                    <Loader2 className="w-6 h-6 animate-spin mt-2 opacity-60" />
                  </div>
                )}

                {lookupLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="text-sm mt-3">Verificando código...</p>
                  </div>
                )}

                {cameraPermission === 'denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
                    <CameraOff className="w-12 h-12 mb-3 text-red-400" />
                    <p className="text-sm text-center px-4">Permiso de cámara denegado</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setCameraPermission('prompt');
                        startScanner();
                      }}
                    >
                      Reintentar
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Pantalla de confirmación */}
              <div
                className={`rounded-lg border-2 p-6 text-center ${
                  pending.alreadyPresent
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-center mb-3">
                  {pending.alreadyPresent ? (
                    <AlertTriangle className="w-14 h-14 text-yellow-500" />
                  ) : (
                    <UserCheck className="w-14 h-14 text-green-600" />
                  )}
                </div>

                <p
                  className={`text-sm font-medium mb-1 ${
                    pending.alreadyPresent ? 'text-yellow-800' : 'text-green-800'
                  }`}
                >
                  {pending.alreadyPresent
                    ? 'Este asistente ya está marcado como presente'
                    : 'Código QR leído correctamente'}
                </p>

                <h3 className="text-xl font-bold text-foreground mt-3">
                  {pending.attendee.name}
                </h3>
                {pending.attendee.senas && (
                  <p className="text-sm text-muted-foreground mt-1">{pending.attendee.senas}</p>
                )}
                {pending.attendee.email && (
                  <p className="text-xs text-muted-foreground mt-1">{pending.attendee.email}</p>
                )}

                {/* Refrigerios a entregar — destacado para el personal */}
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-sm">
                  <Coffee className="w-5 h-5" />
                  <span className="text-base font-bold">
                    Refrigerios a entregar: {pending.attendee.refreshmentCount ?? 1}
                  </span>
                </div>
              </div>

              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button variant="outline" onClick={handleRetry} disabled={marking}>
                  Escanear otro
                </Button>
                {!pending.alreadyPresent ? (
                  <Button onClick={handleConfirm} disabled={marking} className="gap-2">
                    {marking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar asistencia
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={handleRetry} disabled={marking}>
                    Continuar
                  </Button>
                )}
                <Button variant="ghost" onClick={handleClose} disabled={marking}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
