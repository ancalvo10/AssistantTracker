'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, CheckCircle2, User, Lock, Palette, Sun, Moon } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  required?: boolean;
}

export function SettingsDialog({ open, onClose, required = false }: SettingsDialogProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession() || {};
  const { theme, setTheme } = useTheme();

  // Profile state
  const [name, setName] = useState(session?.user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        setProfileMessage({ type: 'success', text: 'Nombre actualizado exitosamente' });
        // Update the session so the header shows the new name
        await updateSession({ name });
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        const data = await res.json();
        setProfileMessage({ type: 'error', text: data?.error || 'Error al actualizar perfil' });
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Error al actualizar perfil' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        if (required) {
          setTimeout(async () => {
            await signOut({ redirect: false });
            router.push('/login');
          }, 2000);
        }
      } else {
        const data = await res.json();
        setPasswordMessage({ type: 'error', text: data?.error || 'Error al cambiar contraseña' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Error al cambiar contraseña' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const defaultTab = required ? 'password' : 'profile';

  return (
    <Dialog open={open} onOpenChange={required ? undefined : onClose}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={required ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle>{required ? 'Cambiar Contraseña' : 'Configuración'}</DialogTitle>
          <DialogDescription>
            {required
              ? 'Debes cambiar tu contraseña temporal antes de continuar'
              : 'Administra tu perfil, contraseña y preferencias de apariencia'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          {!required && (
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
                <User className="w-3.5 h-3.5" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-1.5 text-xs sm:text-sm">
                <Lock className="w-3.5 h-3.5" />
                Contraseña
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
                <Palette className="w-3.5 h-3.5" />
                Apariencia
              </TabsTrigger>
            </TabsList>
          )}

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Nombre</Label>
                <Input
                  id="profileName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input
                  value={session?.user?.email || ''}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
              </div>

              {profileMessage && (
                <Alert className={profileMessage.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}>
                  <div className="flex items-center gap-2">
                    {profileMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <p className={`text-sm ${profileMessage.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {profileMessage.text}
                    </p>
                  </div>
                </Alert>
              )}

              <Button type="submit" disabled={profileLoading} className="w-full">
                {profileLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="mt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {passwordMessage && (
                <Alert className={passwordMessage.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}>
                  <div className="flex items-center gap-2">
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {passwordMessage.text}
                    </p>
                  </div>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                {!required && (
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={passwordLoading} className="flex-1">
                  {passwordLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cambiando...</>
                  ) : (
                    'Cambiar Contraseña'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Tema de la aplicación</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                      <Sun className="w-6 h-6 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium">Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center shadow-sm">
                      <Moon className="w-6 h-6 text-purple-300" />
                    </div>
                    <span className="text-sm font-medium">Oscuro</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El tema seleccionado se guardará automáticamente en tu navegador.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
