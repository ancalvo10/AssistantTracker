import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { sendAppEmail } from '@/lib/email';
import { generateAndUploadQR } from '@/lib/qr-upload';

export const dynamic = 'force-dynamic';

// Enviar código QR por correo a un asistente individual
export async function POST(
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
      where: { id: params.id },
      include: {
        list: {
          include: { project: true }
        }
      }
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      );
    }

    if (!attendee.email) {
      return NextResponse.json(
        { error: 'Este asistente no tiene correo electrónico registrado' },
        { status: 400 }
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

    // Generar QR, subir a S3 y obtener URL pública
    const qrImageUrl = await generateAndUploadQR(qrToken, attendee.id);

    const appUrl = process.env.NEXTAUTH_URL || '';
    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'Assistant Tracker';
    const projectName = attendee.list?.project?.name || '';
    const listDescription = attendee.list?.description || '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b46c1; border-bottom: 2px solid #6b46c1; padding-bottom: 10px;">
          Tu Código QR de Asistencia
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hola <strong>${attendee.name}</strong>,</p>
          <p>Aquí tienes tu código QR personal para registrar tu asistencia:</p>
          ${projectName ? `<p style="color: #666;"><strong>Proyecto:</strong> ${projectName}</p>` : ''}
          ${listDescription ? `<p style="color: #666;"><strong>Lista:</strong> ${listDescription}</p>` : ''}

          <div style="text-align: center; margin: 30px 0; background: white; padding: 20px; border-radius: 8px;">
            <img src="${qrImageUrl}" alt="Código QR" style="width: 260px; height: 260px; max-width: 100%;" />
            <p style="margin-top: 15px; font-size: 16px; font-weight: bold; color: #6b46c1;">${attendee.name}</p>
            ${attendee.senas ? `<p style="margin: 4px 0 0; color: #666; font-size: 14px;">${attendee.senas}</p>` : ''}
            <div style="margin-top: 12px; display: inline-block; background: #f3e8ff; color: #6b46c1; font-weight: bold; padding: 6px 14px; border-radius: 999px; font-size: 14px;">Refrigerios a retirar: ${attendee.refreshmentCount}</div>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Presenta este código al ingresar para que sea escaneado y tu asistencia quede registrada automáticamente.
          </p>
        </div>
      </div>
    `;

    const result = await sendAppEmail({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CDIGO_QR_DE_ASISTENCIA,
        subject: `Tu código QR de asistencia${projectName ? ` - ${projectName}` : ''}`,
        body: htmlBody,
        is_html: true,
        recipient_email: attendee.email,
        sender_email: `noreply@${appUrl ? new URL(appUrl).hostname : 'assistanttracker.abacusai.app'}`,
        sender_alias: appName,
    });
    if (!result.success) {
      console.error('Error enviando email QR:', result);
      return NextResponse.json(
        { error: 'Error al enviar el correo con el código QR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Código QR enviado a ${attendee.email}`
    });
  } catch (error: any) {
    console.error('Error enviando QR por email:', error);
    return NextResponse.json(
      { error: 'Error al enviar el código QR' },
      { status: 500 }
    );
  }
}
