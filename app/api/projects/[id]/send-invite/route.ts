import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { sendAppEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Enviar invitación por email
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

    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email y código son requeridos' },
        { status: 400 }
      );
    }

    const projectId = params.id;

    // Verificar que el código pertenece al proyecto
    const invite = await prisma.projectInvite.findFirst({
      where: {
        projectId,
        code: code.toUpperCase(),
        isActive: true
      },
      include: {
        project: true
      }
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Código de invitación inválido' },
        { status: 400 }
      );
    }

    // Construir URL de invitación
    const appUrl = process.env.NEXTAUTH_URL || '';
    const joinUrl = `${appUrl}/join/${code}`;

    // Crear email HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b46c1; border-bottom: 2px solid #6b46c1; padding-bottom: 10px;">
          Invitación a Proyecto
        </h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Has sido invitado a unirte al proyecto:</p>
          <h3 style="color: #6b46c1; margin: 20px 0;">${invite.project.name}</h3>
          ${invite.project.description ? `<p style="color: #666;">${invite.project.description}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${joinUrl}" 
               style="background: #6b46c1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Unirse al Proyecto
            </a>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #6b46c1; margin-top: 20px;">
            <p style="margin: 0; color: #666; font-size: 14px;">O usa este código manualmente:</p>
            <p style="font-size: 24px; font-weight: bold; color: #6b46c1; margin: 10px 0; letter-spacing: 2px;">${code}</p>
          </div>
        </div>
      </div>
    `;

    const appName = appUrl ? new URL(appUrl).hostname.split('.')[0] : 'Assistant Tracker';

    // Enviar email
    const result = await sendAppEmail({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_INVITACIN_A_PROYECTO,
        subject: `Invitación al proyecto: ${invite.project.name}`,
        body: htmlBody,
        is_html: true,
        recipient_email: email,
        sender_email: `noreply@${appUrl ? new URL(appUrl).hostname : 'assistanttracker.abacusai.app'}`,
        sender_alias: appName,
    });
    if (!result.success) {
      console.error('Error enviando email:', result);
      return NextResponse.json(
        { error: 'Error al enviar la invitación por email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Invitación enviada exitosamente'
    });
  } catch (error: any) {
    console.error('Error enviando invitación:', error);
    return NextResponse.json(
      { error: 'Error al enviar la invitación' },
      { status: 500 }
    );
  }
}
