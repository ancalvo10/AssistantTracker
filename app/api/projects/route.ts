import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener proyectos según el rol del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    let projects;

    if (userRole === 'ADMIN') {
      // Admin ve todos los proyectos
      projects = await prisma.project.findMany({
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
                  email: true
                }
              }
            }
          },
          lists: {
            where: {
              isVisible: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              lists: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Tracker solo ve proyectos asignados
      projects = await prisma.project.findMany({
        where: {
          assignments: {
            some: {
              userId: userId
            }
          }
        },
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
                  email: true
                }
              }
            }
          },
          lists: {
            where: {
              isVisible: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              lists: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error obteniendo proyectos:', error);
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    );
  }
}

// Crear proyecto (solo Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo los administradores pueden crear proyectos.' },
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

    const userId = (session.user as any).id;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(
      { message: 'Proyecto creado exitosamente', project },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creando proyecto:', error);
    return NextResponse.json(
      { error: 'Error al crear proyecto' },
      { status: 500 }
    );
  }
}
