import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener asistencias de una lista
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

    if (!listId) {
      return NextResponse.json(
        { error: 'listId es requerido' },
        { status: 400 }
      );
    }

    const attendances = await prisma.attendance.findMany({
      where: { listId },
      include: {
        attendee: true
      }
    });

    return NextResponse.json(attendances);
  } catch (error: any) {
    console.error('Error obteniendo asistencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistencias' },
      { status: 500 }
    );
  }
}

// Marcar/desmarcar asistencia (Admin y Tracker)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { listId, attendeeId, isPresent } = body;

    if (!listId || !attendeeId || isPresent === undefined) {
      return NextResponse.json(
        { error: 'listId, attendeeId e isPresent son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un registro de asistencia
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        listId_attendeeId: {
          listId,
          attendeeId
        }
      }
    });

    let attendance;

    if (existingAttendance) {
      // Actualizar registro existente
      attendance = await prisma.attendance.update({
        where: {
          listId_attendeeId: {
            listId,
            attendeeId
          }
        },
        data: {
          isPresent,
          updatedAt: new Date()
        }
      });
    } else {
      // Crear nuevo registro
      attendance = await prisma.attendance.create({
        data: {
          listId,
          attendeeId,
          isPresent
        }
      });
    }

    return NextResponse.json({
      message: 'Asistencia actualizada exitosamente',
      attendance
    });
  } catch (error: any) {
    console.error('Error actualizando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asistencia' },
      { status: 500 }
    );
  }
}
