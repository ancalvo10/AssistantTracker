import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAppEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    // Guardar token en la base de datos
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires
      }
    });

    // Construir URL de reseteo
    const appUrl = process.env.NEXTAUTH_URL || '';
    const resetUrl = `${appUrl}/reset-password/${token}`;

    // Crear email HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b46c1; border-bottom: 2px solid #6b46c1; padding-bottom: 10px;">
          Restablecer Contraseña
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hola ${user.name},</p>
          <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #6b46c1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Este enlace expirará en 30 minutos por razones de seguridad.
          </p>
          <p style="color: #666; font-size: 14px;">
            Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `;

    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'Assistant Tracker';

    // Enviar email
    const result = await sendAppEmail({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_RECUPERACIN_DE_CONTRASEA,
        subject: 'Restablecer tu contraseña',
        body: htmlBody,
        is_html: true,
        recipient_email: email,
        sender_email: `noreply@${appUrl ? new URL(appUrl).hostname : 'assistanttracker.abacusai.app'}`,
        sender_alias: appName,
    });
    if (!result.success) {
      console.error('Error enviando email:', result);
      return NextResponse.json(
        { error: 'Error al enviar el email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });
  } catch (error: any) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
