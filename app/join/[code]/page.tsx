'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';

export default function JoinProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession() || {};
  const code = params?.code as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?redirect=/join/${code}`);
    }
  }, [status, code, router]);

  const handleJoin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setProjectName(data.project.name);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Error al unirse al proyecto');
      }
    } catch (error) {
      setError('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">¡Te has unido exitosamente!</h3>
            <p className="text-muted-foreground">
              Ahora eres parte del proyecto: <span className="font-semibold">{projectName}</span>
              <br />
              Redirigiendo al dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Unirse a Proyecto</CardTitle>
          <CardDescription className="text-center">
            Código de invitación: <span className="font-mono font-semibold">{code}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-center text-muted-foreground mb-6">
            ¿Quieres unirte a este proyecto?
          </p>

          <Button
            onClick={handleJoin}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uniéndose...
              </>
            ) : (
              'Unirse al Proyecto'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
