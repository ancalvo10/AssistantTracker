import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Asignar/desasignar trackers a proyecto (solo Admin)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userIds } = body; // Array de IDs de usuarios a asignar

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds debe ser un array' },
        { status: 400 }
      );
    }

    const projectId = params.id;

    // Eliminar asignaciones existentes
    await prisma.projectAssignment.deleteMany({
      where: { projectId }
    });

    // Crear nuevas asignaciones
    if (userIds.length > 0) {
      await prisma.projectAssignment.createMany({
        data: userIds.map((userId: string) => ({
          projectId,
          userId
        }))
      });
    }

    // Obtener proyecto actualizado con asignaciones
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(
      { message: 'Asignaciones actualizadas exitosamente', project }
    );
  } catch (error: any) {
    console.error('Error asignando usuarios:', error);
    return NextResponse.json(
      { error: 'Error al asignar usuarios' },
      { status: 500 }
    );
  }
}
