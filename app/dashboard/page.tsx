'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2, FolderOpen, Users, ClipboardList, Eye, EyeOff, ChevronDown, ChevronUp, UserPlus, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [hiddenProjectsOpen, setHiddenProjectsOpen] = useState(false);
  
  // States for manual join code
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Verificar si debe cambiar contraseña
      if ((session?.user as any)?.mustChangePassword) {
        setShowChangePassword(true);
      }
      loadProjects();
    }
  }, [status, router, session]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectVisibility = async (projectId: string, currentVisibility: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });

      if (res.ok) {
        loadProjects();
      }
    } catch (error) {
      console.error('Error cambiando visibilidad:', error);
    }
  };

  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    
    if (!joinCode.trim()) {
      setJoinError('Por favor ingresa un código de invitación');
      return;
    }

    setJoinLoading(true);

    try {
      const res = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setJoinSuccess(`¡Te has unido al proyecto "${data.project.name}" exitosamente!`);
        setJoinCode('');
        loadProjects();
        setTimeout(() => setJoinSuccess(''), 5000);
      } else {
        setJoinError(data.error || 'Error al unirse al proyecto');
      }
    } catch (error) {
      setJoinError('Error al procesar la solicitud');
    } finally {
      setJoinLoading(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';
  const isTracker = userRole === 'TRACKER';

  const visibleProjects = projects.filter(p => p.isVisible);
  const hiddenProjects = projects.filter(p => !p.isVisible);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Proyectos</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Administra todos los proyectos' : 'Proyectos asignados a ti'}
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setShowCreateProject(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Proyecto
            </Button>
          )}
        </div>

        {/* Section for Trackers to join projects manually */}
        {isTracker && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-primary" />
                Unirse a un Proyecto
              </CardTitle>
              <CardDescription>
                Ingresa el código de invitación proporcionado por un administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinProject} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Código de invitación (ej: abc12345)"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="font-mono"
                      disabled={joinLoading}
                    />
                  </div>
                  <Button type="submit" disabled={joinLoading}>
                    {joinLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Unirse'
                    )}
                  </Button>
                </div>
                {joinError && (
                  <Alert variant="destructive">
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}
                {joinSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800 ml-2">{joinSuccess}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : projects?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {isAdmin ? 'No hay proyectos creados' : 'No tienes proyectos asignados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin ? 'Crea tu primer proyecto para comenzar' : 'Contacta a un administrador para que te asigne proyectos o usa un código de invitación'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Proyectos Visibles */}
            {visibleProjects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleProjects.map((project) => (
                  <Card 
                    key={project?.id} 
                    className="hover:shadow-lg transition-shadow group relative"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/projects/${project?.id}`)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg group-hover:from-purple-200 group-hover:to-violet-200 transition-colors">
                            <FolderOpen className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {project?.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project?.description || 'Sin descripción'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <ClipboardList className="w-4 h-4" />
                              <span>{project?._count?.lists || 0} listas</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                    {isAdmin && (
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectVisibility(project.id, project.isVisible);
                          }}
                          title="Ocultar proyecto"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Proyectos Ocultos */}
            {isAdmin && hiddenProjects.length > 0 && (
              <Collapsible open={hiddenProjectsOpen} onOpenChange={setHiddenProjectsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      Proyectos Ocultos ({hiddenProjects.length})
                    </span>
                    {hiddenProjectsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hiddenProjects.map((project) => (
                      <Card 
                        key={project?.id} 
                        className="hover:shadow-lg transition-shadow group relative opacity-60"
                      >
                        <div 
                          className="cursor-pointer"
                          onClick={() => router.push(`/dashboard/projects/${project?.id}`)}
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                              <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg group-hover:from-purple-200 group-hover:to-violet-200 transition-colors">
                                <FolderOpen className="w-6 h-6 text-primary" />
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              {project?.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {project?.description || 'Sin descripción'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <ClipboardList className="w-4 h-4" />
                                  <span>{project?._count?.lists || 0} listas</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProjectVisibility(project.id, project.isVisible);
                            }}
                            title="Mostrar proyecto"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>

      {showCreateProject && (
        <CreateProjectDialog
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            setShowCreateProject(false);
            loadProjects();
          }}
        />
      )}

      {showChangePassword && (
        <SettingsDialog
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          required={true}
        />
      )}
    </DashboardLayout>
  );
}