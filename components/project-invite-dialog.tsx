'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Send, Check } from 'lucide-react';

interface ProjectInviteDialogProps {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectInviteDialog({ open, projectId, projectName, onClose }: ProjectInviteDialogProps) {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      loadInviteCode();
    }
  }, [open, projectId]);

  const loadInviteCode = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-invite`);
      const data = await res.json();
      
      if (res.ok && data.invite) {
        setCode(data.invite.code);
      }
    } catch (error) {
      console.error('Error cargando código:', error);
    }
  };

  const generateNewCode = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-invite`, {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok) {
        setCode(data.invite.code);
        setSuccess('Nuevo código generado exitosamente');
      } else {
        setError(data.error || 'Error al generar código');
      }
    } catch (error) {
      setError('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const appUrl = window.location.origin;
    const link = `${appUrl}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoadingEmail(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Invitación enviada por email exitosamente');
        setEmail('');
      } else {
        setError(data.error || 'Error al enviar invitación');
      }
    } catch (error) {
      setError('Error al procesar la solicitud');
    } finally {
      setLoadingEmail(false);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = `${appUrl}/join/${code}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a Proyecto</DialogTitle>
          <DialogDescription>
            Comparte este código o enlace para invitar trackers a: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Código de Invitación */}
          <div className="space-y-2">
            <Label>Código de Invitación</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyCode}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Enlace de Invitación */}
          <div className="space-y-2">
            <Label>Enlace de Invitación</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Generar Nuevo Código */}
          <Button
            onClick={generateNewCode}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar Nuevo Código'
            )}
          </Button>

          {/* Enviar por Email */}
          <div className="border-t pt-4">
            <form onSubmit={sendInviteEmail} className="space-y-3">
              <Label htmlFor="email">Enviar Invitación por Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="tracker@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loadingEmail}>
                  {loadingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
