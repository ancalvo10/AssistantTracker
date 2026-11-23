'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader2, QrCode, Download, Mail, CheckCircle2, AlertCircle, Coffee } from 'lucide-react';

interface QRViewDialogProps {
  open: boolean;
  attendeeId: string;
  onClose: () => void;
}

export function QRViewDialog({ open, attendeeId, onClose }: QRViewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open && attendeeId) {
      loadQR();
    } else {
      setSendMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attendeeId]);

  const loadQR = async () => {
    setLoading(true);
    setError('');
    setSendMessage(null);
    try {
      const res = await fetch(`/api/attendees/${attendeeId}/qr`);
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
      } else {
        setError('Error al generar código QR');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.qrDataUrl;
    link.download = `qr-${qrData.attendee?.name?.replace(/\s+/g, '-') || 'asistente'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = async () => {
    if (!attendeeId) return;
    setSending(true);
    setSendMessage(null);
    try {
      const res = await fetch(`/api/attendees/${attendeeId}/send-qr`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSendMessage({ type: 'success', text: data.message || 'Código QR enviado exitosamente' });
      } else {
        setSendMessage({ type: 'error', text: data.error || 'Error al enviar el código QR' });
      }
    } catch (err) {
      setSendMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSending(false);
    }
  };

  const hasEmail = !!qrData?.attendee?.email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Código QR
          </DialogTitle>
          <DialogDescription>
            {qrData?.attendee
              ? qrData.attendee.senas
                ? `${qrData.attendee.name} - ${qrData.attendee.senas}`
                : qrData.attendee.name
              : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando código QR...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadQR}>
                Reintentar
              </Button>
            </div>
          ) : qrData?.qrDataUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <img
                  src={qrData.qrDataUrl}
                  alt={`QR de ${qrData.attendee?.name}`}
                  className="w-64 h-64"
                />
              </div>
              <p className="text-lg font-semibold mt-4 text-center">{qrData.attendee?.name}</p>
              {qrData.attendee?.senas && (
                <p className="text-sm text-muted-foreground">{qrData.attendee.senas}</p>
              )}
              {qrData.attendee?.email && (
                <p className="text-xs text-muted-foreground mt-1">{qrData.attendee.email}</p>
              )}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold">
                <Coffee className="w-4 h-4" />
                Refrigerios a retirar: {qrData.attendee?.refreshmentCount ?? 1}
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Descargar QR
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleSendEmail}
                  disabled={!hasEmail || sending}
                  title={!hasEmail ? 'Este asistente no tiene correo registrado' : 'Enviar código QR por correo'}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {sending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>

              {!hasEmail && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Sin correo electrónico registrado
                </p>
              )}

              {sendMessage && (
                <Alert
                  className={`mt-4 ${
                    sendMessage.type === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sendMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <p
                      className={`text-xs ${
                        sendMessage.type === 'success' ? 'text-green-800' : 'text-red-700'
                      }`}
                    >
                      {sendMessage.text}
                    </p>
                  </div>
                </Alert>
              )}
            </>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
