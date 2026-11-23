import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Generar archivo .ics para exportar evento al calendario
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const list = await prisma.list.findUnique({
      where: { id: params.id },
      include: { project: true }
    });

    if (!list) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    if (!list.eventDate) {
      return NextResponse.json({ error: 'Esta lista no tiene fecha de evento configurada' }, { status: 400 });
    }

    const eventDate = new Date(list.eventDate);
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // +2 horas por defecto

    const formatDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `${list.id}@assistanttracker`;
    const summary = list.description;
    const description = list.project?.name ? `Proyecto: ${list.project.name}` : '';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AssistantTracker//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatDate(eventDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `DTSTAMP:${formatDate(new Date())}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="evento-${list.id}.ics"`,
      },
    });
  } catch (error: any) {
    console.error('Error generando calendario:', error);
    return NextResponse.json({ error: 'Error al generar archivo de calendario' }, { status: 500 });
  }
}
