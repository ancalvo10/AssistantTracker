import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Marcar asistencia mediante código QR
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
    const { qrToken, listId } = body;

    if (!qrToken || !listId) {
      return NextResponse.json(
        { error: 'qrToken y listId son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el asistente por su token QR
    const attendee = await prisma.attendee.findFirst({
      where: { qrToken }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Código QR inválido. Asistente no encontrado.' },
        { status: 404 }
      );
    }

    // Verificar que el asistente pertenece a la lista correcta
    if (attendee.listId !== listId) {
      return NextResponse.json(
        { error: 'Este asistente no pertenece a esta lista.' },
        { status: 400 }
      );
    }

    // Verificar si ya está marcado como presente
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        listId_attendeeId: {
          listId,
          attendeeId: attendee.id
        }
      }
    });

    if (existingAttendance && existingAttendance.isPresent) {
      return NextResponse.json({
        message: `${attendee.name} ya está registrado como presente.`,
        attendee: { id: attendee.id, name: attendee.name, senas: attendee.senas, refreshmentCount: attendee.refreshmentCount },
        alreadyPresent: true
      });
    }

    // Marcar asistencia
    if (existingAttendance) {
      await prisma.attendance.update({
        where: {
          listId_attendeeId: { listId, attendeeId: attendee.id }
        },
        data: { isPresent: true, updatedAt: new Date() }
      });
    } else {
      await prisma.attendance.create({
        data: {
          listId,
          attendeeId: attendee.id,
          isPresent: true
        }
      });
    }

    return NextResponse.json({
      message: `¡${attendee.name} marcado como presente!`,
      attendee: { id: attendee.id, name: attendee.name, senas: attendee.senas, refreshmentCount: attendee.refreshmentCount },
      alreadyPresent: false
    });
  } catch (error: any) {
    console.error('Error procesando QR:', error);
    return NextResponse.json(
      { error: 'Error al procesar código QR' },
      { status: 500 }
    );
  }
}
