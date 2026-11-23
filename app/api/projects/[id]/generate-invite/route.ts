import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// Generar código de invitación para un proyecto (solo Admin)
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

    const projectId = params.id;
    const userId = (session.user as any).id;

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // Desactivar invitaciones anteriores del proyecto
    await prisma.projectInvite.updateMany({
      where: {
        projectId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Generar código único de 8 caracteres
    const code = randomBytes(4).toString('hex').toUpperCase();

    // Crear nueva invitación
    const invite = await prisma.projectInvite.create({
      data: {
        projectId,
        code,
        createdById: userId,
        isActive: true
      },
      include: {
        project: true
      }
    });

    return NextResponse.json({
      message: 'Código de invitación generado exitosamente',
      invite
    });
  } catch (error: any) {
    console.error('Error generando invitación:', error);
    return NextResponse.json(
      { error: 'Error al generar código de invitación' },
      { status: 500 }
    );
  }
}

// Obtener invitación activa del proyecto
export async function GET(
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

    const projectId = params.id;

    const invite = await prisma.projectInvite.findFirst({
      where: {
        projectId,
        isActive: true
      },
      include: {
        project: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ invite });
  } catch (error: any) {
    console.error('Error obteniendo invitación:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitación' },
      { status: 500 }
    );
  }
}
