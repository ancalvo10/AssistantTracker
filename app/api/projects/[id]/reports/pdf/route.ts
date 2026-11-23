import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { reportData } = body;

    if (!reportData) {
      return NextResponse.json({ error: 'Datos del reporte requeridos' }, { status: 400 });
    }

    const { project, summary, lists } = reportData;

    // Build HTML for PDF
    const listsHtml = lists.map((list: any) => {
      const dateStr = list.eventDate
        ? new Date(list.eventDate).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : new Date(list.createdAt).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const attendeesRows = list.attendees.map((att: any) => `
        <tr style="${att.present ? 'background: #f0fdf4;' : ''}">
          <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb;">${att.name}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; color: #666;">${att.senas || '—'}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: #6b46c1;">${att.refreshmentCount}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="color: ${att.present ? '#16a34a' : '#dc2626'}; font-weight: bold;">${att.present ? '✓' : '✗'}</span>
          </td>
        </tr>
      `).join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #6b46c1; font-size: 18px; margin-bottom: 5px;">${list.description}</h2>
          <p style="color: #666; font-size: 13px; margin-bottom: 10px;">${dateStr}</p>
          <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div style="background: #f3e8ff; padding: 10px 16px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="font-size: 22px; font-weight: bold; color: #6b46c1;">${list.presentCount}</div>
              <div style="font-size: 11px; color: #666;">Presentes</div>
            </div>
            <div style="background: #fef3c7; padding: 10px 16px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="font-size: 22px; font-weight: bold; color: #b45309;">${list.absentCount}</div>
              <div style="font-size: 11px; color: #666;">Ausentes</div>
            </div>
            <div style="background: #ede9fe; padding: 10px 16px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="font-size: 22px; font-weight: bold; color: #6b46c1;">${list.attendanceRate}%</div>
              <div style="font-size: 11px; color: #666;">Tasa</div>
            </div>
            <div style="background: #f0fdf4; padding: 10px 16px; border-radius: 8px; flex: 1; text-align: center;">
              <div style="font-size: 22px; font-weight: bold; color: #16a34a;">${list.distributedRefreshments}/${list.totalRefreshments}</div>
              <div style="font-size: 11px; color: #666;">Refrigerios</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;">
            <thead>
              <tr style="background: #f3e8ff;">
                <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Nombre</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Señas</th>
                <th style="padding: 8px 10px; text-align: center; font-weight: 600;">Refrigerios</th>
                <th style="padding: 8px 10px; text-align: center; font-weight: 600;">Presente</th>
              </tr>
            </thead>
            <tbody>${attendeesRows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const html_content = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; margin: 0; padding: 30px; }
          h1 { color: #6b46c1; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div style="border-bottom: 3px solid #6b46c1; padding-bottom: 15px; margin-bottom: 25px;">
          <h1 style="font-size: 24px; margin: 0;">${project.name}</h1>
          ${project.description ? `<p style="color: #666; margin: 5px 0 0;">${project.description}</p>` : ''}
          <p style="color: #999; font-size: 12px; margin: 5px 0 0;">Reporte generado el ${new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
          <div style="background: #f3e8ff; padding: 15px 20px; border-radius: 10px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #6b46c1;">${summary.totalLists}</div>
            <div style="font-size: 12px; color: #666;">Listas</div>
          </div>
          <div style="background: #f0fdf4; padding: 15px 20px; border-radius: 10px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${summary.totalPresent}</div>
            <div style="font-size: 12px; color: #666;">Total Presentes</div>
          </div>
          <div style="background: #ede9fe; padding: 15px 20px; border-radius: 10px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #6b46c1;">${summary.overallRate}%</div>
            <div style="font-size: 12px; color: #666;">Tasa General</div>
          </div>
          <div style="background: #fef3c7; padding: 15px 20px; border-radius: 10px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #b45309;">${summary.uniqueAttendees}</div>
            <div style="font-size: 12px; color: #666;">Únicos</div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #f3e8ff, #ede9fe); border: 1px solid #d8b4fe; border-radius: 10px; padding: 18px 20px; margin-bottom: 30px;">
          <h2 style="color: #6b46c1; font-size: 16px; margin: 0 0 12px;">Resumen de Refrigerios</h2>
          <div style="display: flex; gap: 15px;">
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 26px; font-weight: bold; color: #6b46c1;">${summary.totalRefreshments}</div>
              <div style="font-size: 12px; color: #666;">Planificados</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 26px; font-weight: bold; color: #16a34a;">${summary.distributedRefreshments}</div>
              <div style="font-size: 12px; color: #666;">Entregados</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 26px; font-weight: bold; color: #b45309;">${summary.pendingRefreshments}</div>
              <div style="font-size: 12px; color: #666;">Pendientes</div>
            </div>
          </div>
        </div>

        <h2 style="color: #6b46c1; font-size: 20px; border-bottom: 2px solid #ede9fe; padding-bottom: 8px; margin-bottom: 20px;">Detalle por Lista</h2>
        ${listsHtml}
      </body>
      </html>
    `;

    // Step 1: Create PDF request
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content,
        pdf_options: { format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, print_background: true },
        base_url: process.env.NEXTAUTH_URL || '',
      }),
    });

    if (!createResponse.ok) {
      return NextResponse.json({ error: 'Error al crear solicitud de PDF' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'No se recibió ID de solicitud' }, { status: 500 });
    }

    // Step 2: Poll for status
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
      });

      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';

      if (status === 'SUCCESS') {
        const result = statusResult?.result;
        if (result?.result) {
          const pdfBuffer = Buffer.from(result.result, 'base64');
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="reporte-${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
            },
          });
        }
        return NextResponse.json({ error: 'PDF generado pero sin datos' }, { status: 500 });
      } else if (status === 'FAILED') {
        return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
      }
      attempts++;
    }

    return NextResponse.json({ error: 'Tiempo de espera agotado para generar PDF' }, { status: 500 });
  } catch (error: any) {
    console.error('Error generando PDF:', error);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
