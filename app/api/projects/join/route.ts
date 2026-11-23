import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Unirse a un proyecto usando código de invitación
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
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código de invitación requerido' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Solo los TRACKER pueden usar códigos de invitación
    if (userRole !== 'TRACKER') {
      return NextResponse.json(
        { error: 'Solo los trackers pueden usar códigos de invitación' },
        { status: 403 }
      );
    }

    // Buscar invitación válida
    const invite = await prisma.projectInvite.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true
      },
      include: {
        project: true
      }
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Código de invitación inválido o expirado' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya está asignado al proyecto
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: invite.projectId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Ya estás asignado a este proyecto' },
        { status: 400 }
      );
    }

    // Crear asignación del usuario al proyecto
    await prisma.projectAssignment.create({
      data: {
        userId,
        projectId: invite.projectId
      }
    });

    return NextResponse.json({
      message: `Te has unido exitosamente al proyecto "${invite.project.name}"`,
      project: invite.project
    });
  } catch (error: any) {
    console.error('Error uniéndose al proyecto:', error);
    return NextResponse.json(
      { error: 'Error al unirse al proyecto' },
      { status: 500 }
    );
  }
}
