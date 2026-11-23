import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Obtener lista específica con asistencias
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

    const list = await prisma.list.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        attendees: {
          orderBy: {
            name: 'asc'
          }
        },
        attendances: true
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Error obteniendo lista:', error);
    return NextResponse.json(
      { error: 'Error al obtener lista' },
      { status: 500 }
    );
  }
}

// Actualizar lista (solo Admin)
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
    const { description, isVisible, eventDate } = body;

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;

    const list = await prisma.list.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(
      { message: 'Lista actualizada exitosamente', list }
    );
  } catch (error: any) {
    console.error('Error actualizando lista:', error);
    return NextResponse.json(
      { error: 'Error al actualizar lista' },
      { status: 500 }
    );
  }
}

// Ocultar lista (Admin y Tracker pueden)
export async function PATCH(
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

    const body = await req.json();
    const { isVisible } = body;

    const list = await prisma.list.update({
      where: { id: params.id },
      data: { isVisible }
    });

    return NextResponse.json(
      { message: 'Visibilidad de lista actualizada', list }
    );
  } catch (error: any) {
    console.error('Error actualizando visibilidad:', error);
    return NextResponse.json(
      { error: 'Error al actualizar visibilidad' },
      { status: 500 }
    );
  }
}

// Eliminar lista (solo Admin)
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

    await prisma.list.delete({
      where: { id: params.id }
    });

    return NextResponse.json(
      { message: 'Lista eliminada exitosamente' }
    );
  } catch (error: any) {
    console.error('Error eliminando lista:', error);
    return NextResponse.json(
      { error: 'Error al eliminar lista' },
      { status: 500 }
    );
  }
}
