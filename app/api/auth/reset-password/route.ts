import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    // Verificar si el token ya fue usado
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'Este token ya fue utilizado' },
        { status: 400 }
      );
    }

    // Verificar si el token ha expirado
    if (new Date() > resetToken.expires) {
      return NextResponse.json(
        { error: 'Token expirado. Por favor, solicita un nuevo enlace' },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña del usuario
    await prisma.user.update({
      where: { email: resetToken.email },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    // Marcar token como usado
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error: any) {
    console.error('Error en reset-password:', error);
    return NextResponse.json(
      { error: 'Error al restablecer la contraseña' },
      { status: 500 }
    );
  }
}
