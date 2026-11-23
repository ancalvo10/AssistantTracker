import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { generateAndUploadQR } from '@/lib/qr-upload';
import { sendAppEmail } from '@/lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Envío masivo de códigos QR a todos los asistentes con correo electrónico
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

    const list = await prisma.list.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        attendees: true
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      );
    }

    const eligibleAttendees = list.attendees.filter((a) => !!a.email);

    if (eligibleAttendees.length === 0) {
      return NextResponse.json(
        { error: 'No hay asistentes con correo electrónico registrado en esta lista' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXTAUTH_URL || '';
    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'Assistant Tracker';
    const senderEmail = `noreply@${appUrl ? new URL(appUrl).hostname : 'assistanttracker.abacusai.app'}`;
    const projectName = list.project?.name || '';
    const listDescription = list.description || '';

    let sent = 0;
    const failures: { attendeeId: string; name: string; reason: string }[] = [];

    for (const attendee of eligibleAttendees) {
      try {
        // Garantizar qrToken
        let qrToken = attendee.qrToken;
        if (!qrToken) {
          qrToken = crypto.randomBytes(16).toString('hex');
          await prisma.attendee.update({
            where: { id: attendee.id },
            data: { qrToken }
          });
        }

        // Generar QR, subir a S3 y obtener URL pública
        const qrImageUrl = await generateAndUploadQR(qrToken, attendee.id);

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
            recipient_email: attendee.email!,
            sender_email: senderEmail,
            sender_alias: appName,
        });
        if (!result.success) {
          failures.push({
            attendeeId: attendee.id,
            name: attendee.name,
            reason: result.error || 'Error al enviar correo'
          });
        } else {
          sent++;
        }
      } catch (err: any) {
        failures.push({
          attendeeId: attendee.id,
          name: attendee.name,
          reason: err?.message || 'Error inesperado'
        });
      }
    }

    return NextResponse.json({
      message: `Códigos QR enviados a ${sent} de ${eligibleAttendees.length} asistentes con correo`,
      sent,
      total: eligibleAttendees.length,
      totalAttendees: list.attendees.length,
      withoutEmail: list.attendees.length - eligibleAttendees.length,
      failures
    });
  } catch (error: any) {
    console.error('Error enviando QRs masivos:', error);
    return NextResponse.json(
      { error: 'Error al enviar los códigos QR' },
      { status: 500 }
    );
  }
}
