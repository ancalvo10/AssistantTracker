'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Download, BarChart3, Users, CheckCircle2, AlertCircle, FileSpreadsheet, Coffee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ReportDialogProps {
  open: boolean;
  projectId: string;
  projectName: string;
  lists: any[];
  onClose: () => void;
}

export function ReportDialog({ open, projectId, projectName, lists, onClose }: ReportDialogProps) {
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedLists(lists.map(l => l.id));
      setSelectAll(true);
      setReportData(null);
      setError('');
    }
  }, [open, lists]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedLists(lists.map(l => l.id));
    } else {
      setSelectedLists([]);
    }
  };

  const handleToggleList = (listId: string) => {
    setSelectedLists(prev => {
      const next = prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId];
      setSelectAll(next.length === lists.length);
      return next;
    });
  };

  const handleGenerateReport = async () => {
    if (selectedLists.length === 0) {
      setError('Selecciona al menos una lista');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listIds: selectAll ? 'all' : selectedLists,
          format: 'json'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al generar reporte');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting('csv');
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listIds: selectAll ? 'all' : selectedLists,
          format: 'csv'
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Error al exportar CSV');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    setExporting('pdf');
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        setError('Error al generar PDF. Intenta de nuevo.');
      }
    } catch (err) {
      setError('Error al exportar PDF');
    } finally {
      setExporting(null);
    }
  };

  const attendanceChartData = reportData?.lists?.map((l: any) => ({
    name: l.description.length > 20 ? l.description.substring(0, 20) + '...' : l.description,
    presentes: l.presentCount,
    ausentes: l.absentCount,
    tasa: l.attendanceRate
  })) || [];

  const refreshmentChartData = reportData?.lists?.map((l: any) => ({
    name: l.description.length > 20 ? l.description.substring(0, 20) + '...' : l.description,
    planificados: l.totalRefreshments,
    entregados: l.distributedRefreshments
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Reportes - {projectName}
          </DialogTitle>
          <DialogDescription>
            Selecciona las listas y genera reportes con estadísticas y exportación
          </DialogDescription>
        </DialogHeader>

        {!reportData ? (
          <div className="space-y-4">
            {/* List Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="selectAll"
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <Label htmlFor="selectAll" className="font-medium">Todas las listas ({lists.length})</Label>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                {lists.map(list => (
                  <div key={list.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`list-${list.id}`}
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => handleToggleList(list.id)}
                    />
                    <Label htmlFor={`list-${list.id}`} className="text-sm cursor-pointer flex-1">
                      {list.description}
                      {list.eventDate && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({new Date(list.eventDate).toLocaleDateString('es')})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleGenerateReport}
                disabled={loading || selectedLists.length === 0}
                className="flex-1"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                ) : (
                  <><BarChart3 className="mr-2 h-4 w-4" /> Generar Reporte</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" className="text-xs sm:text-sm">Resumen</TabsTrigger>
              <TabsTrigger value="charts" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
              <TabsTrigger value="refreshments" className="text-xs sm:text-sm">Refrigerios</TabsTrigger>
              <TabsTrigger value="export" className="text-xs sm:text-sm">Exportar</TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{reportData.summary.totalLists}</div>
                    <div className="text-xs text-muted-foreground">Listas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.summary.totalPresent}</div>
                    <div className="text-xs text-muted-foreground">Presentes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{reportData.summary.overallRate}%</div>
                    <div className="text-xs text-muted-foreground">Tasa General</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reportData.summary.uniqueAttendees}</div>
                    <div className="text-xs text-muted-foreground">Únicos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Refreshments summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Coffee className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-sm">Refrigerios</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{reportData.summary.totalRefreshments}</div>
                      <div className="text-xs text-muted-foreground">Planificados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.summary.distributedRefreshments}</div>
                      <div className="text-xs text-muted-foreground">Entregados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reportData.summary.pendingRefreshments}</div>
                      <div className="text-xs text-muted-foreground">Pendientes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-list summary */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Detalle por lista</h4>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {reportData.lists.map((list: any) => (
                    <div key={list.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{list.description}</p>
                        {list.eventDate && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(list.eventDate).toLocaleDateString('es')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-green-600 dark:text-green-400 font-medium">{list.presentCount}/{list.totalAttendees}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {list.attendanceRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="mt-4 space-y-6">
              {attendanceChartData.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3">Asistencia por Lista</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="presentes" fill="#7c3aed" name="Presentes" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ausentes" fill="#e5e7eb" name="Ausentes" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {refreshmentChartData.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3">Refrigerios por Lista</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={refreshmentChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="planificados" fill="#c084fc" name="Planificados" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="entregados" fill="#7c3aed" name="Entregados" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Refreshments Tab */}
            <TabsContent value="refreshments" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{reportData.summary.totalRefreshments}</div>
                    <div className="text-xs text-muted-foreground">Planificados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.summary.distributedRefreshments}</div>
                    <div className="text-xs text-muted-foreground">Entregados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reportData.summary.pendingRefreshments}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </CardContent>
                </Card>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left font-medium">Lista</th>
                      <th className="p-3 text-center font-medium">Planificados</th>
                      <th className="p-3 text-center font-medium">Entregados</th>
                      <th className="p-3 text-center font-medium">Pendientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.lists.map((l: any) => (
                      <tr key={l.id}>
                        <td className="p-3 font-medium">{l.description}</td>
                        <td className="p-3 text-center">{l.totalRefreshments}</td>
                        <td className="p-3 text-center text-green-600 dark:text-green-400">{l.distributedRefreshments}</td>
                        <td className="p-3 text-center text-amber-600 dark:text-amber-400">{l.pendingRefreshments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="mt-4 space-y-4">
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-4"
                  onClick={handleExportPDF}
                  disabled={exporting === 'pdf'}
                >
                  {exporting === 'pdf' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{exporting === 'pdf' ? 'Generando PDF...' : 'Exportar a PDF'}</p>
                    <p className="text-xs text-muted-foreground">Reporte completo con tablas y estadísticas</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-4"
                  onClick={handleExportCSV}
                  disabled={exporting === 'csv'}
                >
                  {exporting === 'csv' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{exporting === 'csv' ? 'Exportando...' : 'Exportar a CSV/Excel'}</p>
                    <p className="text-xs text-muted-foreground">Datos tabulares para hojas de cálculo</p>
                  </div>
                </Button>
              </div>

              {error && (
                <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        )}

        {reportData && (
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setReportData(null)} className="flex-1">
              Volver a Seleccionar
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
