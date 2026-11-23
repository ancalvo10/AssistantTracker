import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const listId = formData.get('listId') as string;

    if (!file || !listId) {
      return NextResponse.json(
        { error: 'Archivo y listId son requeridos' },
        { status: 400 }
      );
    }

    // Leer el contenido del archivo
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    // Validar que tenga al menos el encabezado y una fila
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'El archivo CSV debe tener al menos una fila de datos' },
        { status: 400 }
      );
    }

    // Procesar el CSV (formato: Nombre,Señas,Refrigerios,Correo)
    // Solo el Nombre es obligatorio. Señas, Refrigerios y Correo son opcionales.
    const attendees = [];
    const errors = [];

    const isEmail = (v: string) => /@/.test(v);

    // Omitir el encabezado
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());

      const name = parts[0];
      if (!name) {
        errors.push(`Línea ${i + 1}: El nombre es requerido`);
        continue;
      }

      const senas = parts[1] && !isEmail(parts[1]) ? parts[1] : null;

      // Refrigerios: acepta un número en la 3.ª columna; por defecto 1.
      let refreshmentCount = 1;
      if (parts[2] && !isEmail(parts[2])) {
        const n = Math.floor(Number(parts[2]));
        if (Number.isFinite(n) && n > 0) refreshmentCount = n;
      }

      // Correo: busca la primera columna que parezca un correo.
      const email = parts.slice(1).find(p => isEmail(p)) || null;

      attendees.push({
        listId,
        name,
        senas,
        refreshmentCount,
        email,
        qrToken: crypto.randomBytes(16).toString('hex')
      });
    }

    if (attendees.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron procesar asistentes válidos', errors },
        { status: 400 }
      );
    }

    // Crear los asistentes en la base de datos
    await prisma.attendee.createMany({
      data: attendees
    });

    return NextResponse.json({
      message: `${attendees.length} asistente(s) importado(s) exitosamente`,
      count: attendees.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error procesando CSV:', error);
    return NextResponse.json(
      { error: 'Error al procesar archivo CSV' },
      { status: 500 }
    );
  }
}
