import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener datos de reporte para un proyecto
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { listIds, format } = body; // listIds: string[] | 'all', format: 'json' | 'csv' | 'pdf'

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, description: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Fetch lists
    const listsWhere: any = { projectId: params.id };
    if (listIds && listIds !== 'all' && Array.isArray(listIds) && listIds.length > 0) {
      listsWhere.id = { in: listIds };
    }

    const lists = await prisma.list.findMany({
      where: listsWhere,
      include: {
        attendees: {
          orderBy: { name: 'asc' }
        },
        attendances: {
          where: { isPresent: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Build report data
    const reportLists = lists.map(list => {
      const attendanceSet = new Set(list.attendances.map(a => a.attendeeId));
      const attendeesData = list.attendees.map(att => ({
        id: att.id,
        name: att.name,
        senas: att.senas,
        refreshmentCount: att.refreshmentCount,
        email: att.email,
        present: attendanceSet.has(att.id)
      }));

      const presentCount = attendeesData.filter(a => a.present).length;
      const totalCount = attendeesData.length;
      const totalRefreshments = attendeesData.reduce((sum, a) => sum + (a.refreshmentCount || 0), 0);
      const distributedRefreshments = attendeesData
        .filter(a => a.present)
        .reduce((sum, a) => sum + (a.refreshmentCount || 0), 0);

      return {
        id: list.id,
        description: list.description,
        eventDate: list.eventDate,
        createdAt: list.createdAt,
        totalAttendees: totalCount,
        presentCount,
        absentCount: totalCount - presentCount,
        attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0,
        totalRefreshments,
        distributedRefreshments,
        pendingRefreshments: totalRefreshments - distributedRefreshments,
        attendees: attendeesData
      };
    });

    // Global summary
    const allAttendees = reportLists.flatMap(l => l.attendees);
    const uniqueAttendeesMap = new Map<string, { name: string; listPresence: number; totalLists: number }>();

    reportLists.forEach(list => {
      list.attendees.forEach(att => {
        const existing = uniqueAttendeesMap.get(att.id);
        if (existing) {
          existing.totalLists++;
          if (att.present) existing.listPresence++;
        } else {
          uniqueAttendeesMap.set(att.id, {
            name: att.name,
            listPresence: att.present ? 1 : 0,
            totalLists: 1
          });
        }
      });
    });

    const totalAllAttendees = allAttendees.length;
    const totalPresent = allAttendees.filter(a => a.present).length;
    const totalRefreshments = allAttendees.reduce((sum, a) => sum + (a.refreshmentCount || 0), 0);
    const distributedRefreshments = allAttendees
      .filter(a => a.present)
      .reduce((sum, a) => sum + (a.refreshmentCount || 0), 0);

    const reportData = {
      project: {
        name: project.name,
        description: project.description
      },
      summary: {
        totalLists: reportLists.length,
        totalAttendees: totalAllAttendees,
        totalPresent,
        totalAbsent: totalAllAttendees - totalPresent,
        overallRate: totalAllAttendees > 0 ? Math.round((totalPresent / totalAllAttendees) * 100) : 0,
        uniqueAttendees: uniqueAttendeesMap.size,
        totalRefreshments,
        distributedRefreshments,
        pendingRefreshments: totalRefreshments - distributedRefreshments
      },
      lists: reportLists
    };

    if (format === 'csv') {
      // Generate CSV
      const csvRows: string[] = [];
      csvRows.push('Lista,Fecha,Nombre,Señas,Refrigerios,Correo,Presente');
      reportLists.forEach(list => {
        const dateStr = list.eventDate
          ? new Date(list.eventDate).toLocaleDateString('es')
          : new Date(list.createdAt).toLocaleDateString('es');
        list.attendees.forEach(att => {
          csvRows.push(
            [
              `"${list.description.replace(/"/g, '""')}"`,
              dateStr,
              `"${att.name.replace(/"/g, '""')}"`,
              `"${(att.senas || '').replace(/"/g, '""')}"`,
              att.refreshmentCount,
              att.email || '',
              att.present ? 'Sí' : 'No'
            ].join(',')
          );
        });
      });

      // Add refreshment summary
      csvRows.push('');
      csvRows.push('Resumen de Refrigerios');
      csvRows.push('Lista,Refrigerios Planificados,Refrigerios Entregados,Pendientes');
      reportLists.forEach(l => {
        csvRows.push(
          `"${l.description.replace(/"/g, '""')}",${l.totalRefreshments},${l.distributedRefreshments},${l.pendingRefreshments}`
        );
      });
      csvRows.push(`"TOTAL",${totalRefreshments},${distributedRefreshments},${totalRefreshments - distributedRefreshments}`);

      const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte-${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`,
        },
      });
    }

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Error generando reporte:', error);
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 });
  }
}
