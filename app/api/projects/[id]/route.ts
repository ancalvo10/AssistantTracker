import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener un proyecto específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        lists: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            _count: {
              select: {
                attendances: {
                  where: {
                    isPresent: true
                  }
                },
                attendees: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos: Admin ve todo, Tracker solo sus asignados
    if (userRole !== 'ADMIN') {
      const hasAccess = project.assignments.some(a => a.userId === userId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error obteniendo proyecto:', error);
    return NextResponse.json(
      { error: 'Error al obtener proyecto' },
      { status: 500 }
    );
  }
}

// Actualizar proyecto (solo Admin)
export async function PUT(
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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        description: description || ''
      }
    });

    return NextResponse.json(
      { message: 'Proyecto actualizado exitosamente', project }
    );
  } catch (error: any) {
    console.error('Error actualizando proyecto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar proyecto' },
      { status: 500 }
    );
  }
}

// Cambiar visibilidad del proyecto (solo Admin)
export async function PATCH(
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
    const { isVisible } = body;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { isVisible }
    });

    return NextResponse.json(
      { message: 'Visibilidad actualizada', project }
    );
  } catch (error: any) {
    console.error('Error cambiando visibilidad:', error);
    return NextResponse.json(
      { error: 'Error al cambiar visibilidad' },
      { status: 500 }
    );
  }
}

// Eliminar proyecto (solo Admin)
export async function DELETE(
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

    await prisma.project.delete({
      where: { id: params.id }
    });

    return NextResponse.json(
      { message: 'Proyecto eliminado exitosamente' }
    );
  } catch (error: any) {
    console.error('Error eliminando proyecto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar proyecto' },
      { status: 500 }
    );
  }
}
