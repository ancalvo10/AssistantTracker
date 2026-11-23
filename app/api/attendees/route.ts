import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Obtener asistentes de una lista
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get('listId');
    const projectId = searchParams.get('projectId');

    if (listId) {
      const attendees = await prisma.attendee.findMany({
        where: { listId },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(attendees);
    } else if (projectId) {
      // Legacy: get all attendees across all lists for a project
      const attendees = await prisma.attendee.findMany({
        where: {
          OR: [
            { projectId },
            { list: { projectId } }
          ]
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(attendees);
    }

    return NextResponse.json(
      { error: 'listId o projectId es requerido' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error obteniendo asistentes:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistentes' },
      { status: 500 }
    );
  }
}

// Crear asistente manualmente (solo Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { listId, name, senas, email, refreshmentCount } = body;

    if (!listId || !name) {
      return NextResponse.json(
        { error: 'listId y name son requeridos' },
        { status: 400 }
      );
    }

    const parsedCount = Math.floor(Number(refreshmentCount));
    const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;

    const qrToken = crypto.randomBytes(16).toString('hex');

    const attendee = await prisma.attendee.create({
      data: {
        listId,
        name: name.trim(),
        senas: (typeof senas === 'string' && senas.trim()) ? senas.trim() : null,
        refreshmentCount: count,
        email: email || null,
        qrToken
      }
    });

    return NextResponse.json(
      { message: 'Asistente creado exitosamente', attendee },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creando asistente:', error);
    return NextResponse.json(
      { error: 'Error al crear asistente' },
      { status: 500 }
    );
  }
}

// Eliminar asistente (solo Admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const attendeeId = searchParams.get('id');

    if (!attendeeId) {
      return NextResponse.json(
        { error: 'ID de asistente requerido' },
        { status: 400 }
      );
    }

    await prisma.attendee.delete({
      where: { id: attendeeId }
    });

    return NextResponse.json(
      { message: 'Asistente eliminado exitosamente' }
    );
  } catch (error: any) {
    console.error('Error eliminando asistente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asistente' },
      { status: 500 }
    );
  }
}
