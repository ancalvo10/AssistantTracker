import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener listas de un proyecto
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId es requerido' },
        { status: 400 }
      );
    }

    const lists = await prisma.list.findMany({
      where: {
        projectId,
        isVisible: true
      },
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
    });

    return NextResponse.json(lists);
  } catch (error: any) {
    console.error('Error obteniendo listas:', error);
    return NextResponse.json(
      { error: 'Error al obtener listas' },
      { status: 500 }
    );
  }
}

// Crear lista (solo Admin)
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
    const { projectId, description, eventDate } = body;

    if (!projectId || !description) {
      return NextResponse.json(
        { error: 'projectId y description son requeridos' },
        { status: 400 }
      );
    }

    const list = await prisma.list.create({
      data: {
        projectId,
        description,
        eventDate: eventDate ? new Date(eventDate) : null,
        isVisible: true
      }
    });

    return NextResponse.json(
      { message: 'Lista creada exitosamente', list },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creando lista:', error);
    return NextResponse.json(
      { error: 'Error al crear lista' },
      { status: 500 }
    );
  }
}
