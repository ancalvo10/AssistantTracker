import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Valida un código QR y devuelve la información del asistente SIN marcar asistencia.
// La marca se realiza tras la confirmación del usuario mediante /api/attendance.
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

    const attendee = await prisma.attendee.findFirst({
      where: { qrToken }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Código QR inválido. Asistente no encontrado.' },
        { status: 404 }
      );
    }

    if (attendee.listId !== listId) {
      return NextResponse.json(
        { error: 'Este código QR no pertenece a esta lista.' },
        { status: 400 }
      );
    }

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        listId_attendeeId: {
          listId,
          attendeeId: attendee.id
        }
      }
    });

    return NextResponse.json({
      attendee: {
        id: attendee.id,
        name: attendee.name,
        senas: attendee.senas,
        refreshmentCount: attendee.refreshmentCount,
        email: attendee.email
      },
      alreadyPresent: !!existingAttendance?.isPresent
    });
  } catch (error: any) {
    console.error('Error en qr-lookup:', error);
    return NextResponse.json(
      { error: 'Error al procesar código QR' },
      { status: 500 }
    );
  }
}
