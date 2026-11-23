'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, ClipboardList, Settings, ArrowLeft, UserPlus, BarChart3 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CreateListDialog } from '@/components/create-list-dialog';
import { AssignTrackersDialog } from '@/components/assign-trackers-dialog';
import { ProjectInviteDialog } from '@/components/project-invite-dialog';
import { ListsTab } from '@/components/lists-tab';
import { ReportDialog } from '@/components/report-dialog';

export default function ProjectDetailPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAssignTrackers, setShowAssignTrackers] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && projectId) {
      loadProject();
    }
  }, [status, router, projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else if (res.status === 403) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error cargando proyecto:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Proyecto no encontrado</h3>
          <Button onClick={() => router.push('/dashboard')}>
            Volver al Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';

  const totalAttendees = (project?.lists || []).reduce((sum: number, l: any) => sum + (l._count?.attendees || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Proyectos
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project?.name}</h1>
              <p className="text-muted-foreground mt-1">{project?.description || 'Sin descripción'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {project?.lists?.length || 0} listas
                </Badge>
                <Badge variant="outline">
                  {totalAttendees} asistentes
                </Badge>
                {isAdmin && (
                  <Badge variant="outline">
                    {project?.assignments?.length || 0} trackers asignados
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lists" className="w-full">
          <TabsList className={isAdmin ? "grid w-full grid-cols-2" : ""}>
            <TabsTrigger value="lists" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Listas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lists" className="space-y-4">
            <div className="flex justify-end gap-2">
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={() => setShowReportDialog(true)}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Reportes
                  </Button>
                  <Button onClick={() => setShowCreateList(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Lista
                  </Button>
                </>
              )}
            </div>
            <ListsTab 
              lists={project?.lists || []} 
              isAdmin={isAdmin}
              onUpdate={loadProject}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Asignación de Trackers</CardTitle>
                  <CardDescription>
                    Asigna usuarios con rol Tracker a este proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Trackers Asignados:</p>
                      <div className="flex flex-wrap gap-2">
                        {project?.assignments?.length > 0 ? (
                          project.assignments.map((assignment: any) => (
                            <Badge key={assignment?.id} variant="secondary">
                              {assignment?.user?.name}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay trackers asignados</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowAssignTrackers(true)}
                      variant="outline"
                    >
                      Modificar Asignaciones
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invitaciones al Proyecto</CardTitle>
                  <CardDescription>
                    Genera códigos de invitación para que los trackers puedan unirse al proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowInviteDialog(true)}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Gestionar Invitaciones
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {showCreateList && (
        <CreateListDialog
          open={showCreateList}
          projectId={projectId}
          onClose={() => setShowCreateList(false)}
          onSuccess={() => {
            setShowCreateList(false);
            loadProject();
          }}
        />
      )}

      {showAssignTrackers && (
        <AssignTrackersDialog
          open={showAssignTrackers}
          project={project}
          onClose={() => setShowAssignTrackers(false)}
          onSuccess={() => {
            setShowAssignTrackers(false);
            loadProject();
          }}
        />
      )}

      {showInviteDialog && (
        <ProjectInviteDialog
          open={showInviteDialog}
          projectId={projectId}
          projectName={project?.name || ''}
          onClose={() => setShowInviteDialog(false)}
        />
      )}

      {showReportDialog && (
        <ReportDialog
          open={showReportDialog}
          projectId={projectId}
          projectName={project?.name || ''}
          lists={project?.lists || []}
          onClose={() => setShowReportDialog(false)}
        />
      )}
    </DashboardLayout>
  );
}
