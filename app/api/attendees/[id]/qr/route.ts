import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

// Generar QR code para un asistente
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

    const attendee = await prisma.attendee.findUnique({
      where: { id: params.id }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      );
    }

    // Generar qrToken si no existe
    let qrToken = attendee.qrToken;
    if (!qrToken) {
      const crypto = await import('crypto');
      qrToken = crypto.randomBytes(16).toString('hex');
      await prisma.attendee.update({
        where: { id: attendee.id },
        data: { qrToken }
      });
    }

    // Generar QR como data URL
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return NextResponse.json({
      qrDataUrl,
      qrToken,
      attendee: {
        id: attendee.id,
        name: attendee.name,
        senas: attendee.senas,
        refreshmentCount: attendee.refreshmentCount,
        email: attendee.email
      }
    });
  } catch (error: any) {
    console.error('Error generando QR:', error);
    return NextResponse.json(
      { error: 'Error al generar código QR' },
      { status: 500 }
    );
  }
}
