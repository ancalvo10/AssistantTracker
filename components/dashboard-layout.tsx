'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, LogOut, Home, Users as UsersIcon, Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingsDialog } from './settings-dialog';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-[72px] sm:min-h-16 py-2 sm:py-0 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 bg-primary rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-primary truncate">
                  Assistant Tracker
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right flex flex-col items-end justify-center gap-0.5">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[110px] sm:max-w-none leading-tight">
                    {session?.user?.name}
                  </p>
                  <Badge
                    variant={isAdmin ? 'default' : 'secondary'}
                    className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 leading-none"
                  >
                    {isAdmin ? 'Admin' : 'Tracker'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setShowSettings(true)}
                  title="Configuración"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  onClick={handleSignOut}
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            <Button
              variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
              className="gap-2"
              onClick={() => router.push('/dashboard')}
            >
              <Home className="w-4 h-4" />
              Proyectos
            </Button>
            {isAdmin && (
              <Button
                variant={pathname === '/dashboard/users' ? 'secondary' : 'ghost'}
                className="gap-2"
                onClick={() => router.push('/dashboard/users')}
              >
                <UsersIcon className="w-4 h-4" />
                Usuarios
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {showSettings && (
        <SettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          required={false}
        />
      )}
    </div>
  );
}
