'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader2, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface UploadCSVDialogProps {
  open: boolean;
  listId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadCSVDialog({ open, listId, onClose, onSuccess }: UploadCSVDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Por favor selecciona un archivo CSV');
        setFile(null);
      } else {
        setFile(selectedFile);
        setError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('listId', listId);

      const res = await fetch('/api/attendees/upload-csv', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        const data = await res.json();
        setError(data?.error || 'Error al procesar archivo');
      }
    } catch (err) {
      setError('Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Asistentes desde CSV</DialogTitle>
          <DialogDescription>
            Formato: Nombre,Señas,Refrigerios,Correo (una fila por asistente). Solo el Nombre es obligatorio.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {result?.message}
            </h3>
            {result?.errors && result.errors.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-sm font-medium text-foreground mb-2">Errores encontrados:</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-h-32 overflow-y-auto">
                  {result.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-yellow-800">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-sm text-primary hover:text-primary/80 font-medium">
                    Seleccionar archivo CSV
                  </span>
                </label>
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Archivo: {file.name}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ejemplo de formato (Refrigerios y las demás columnas son opcionales):
                <br />
                Nombre,Señas,Refrigerios,Correo
                <br />
                Juan Pérez,Camisa azul,3,juan@email.com
                <br />
                María Gómez,,1,
              </p>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600 ml-2">{error}</p>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !file}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Importar'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
