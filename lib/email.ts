import nodemailer from 'nodemailer';

export interface AppEmailPayload {
  deployment_token?: string;
  app_id?: string;
  notification_id?: string;
  subject: string;
  body: string;
  is_html?: boolean;
  recipient_email: string;
  sender_email?: string;
  sender_alias?: string;
}

/**
 * Sends an email. If SMTP_HOST is configured (self-hosted, e.g. Disco) it uses SMTP;
 * otherwise it falls back to the hosted notification API.
 */
export async function sendAppEmail(payload: AppEmailPayload): Promise<{ success: boolean; error?: string }> {
  if (process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      const fromAddress = process.env.SMTP_FROM || payload.sender_email || process.env.SMTP_USER || '';
      await transporter.sendMail({
        from: payload.sender_alias ? `"${payload.sender_alias}" <${fromAddress}>` : fromAddress,
        to: payload.recipient_email,
        subject: payload.subject,
        ...(payload.is_html === false ? { text: payload.body } : { html: payload.body }),
      });
      return { success: true };
    } catch (err: any) {
      console.error('SMTP error:', err);
      return { success: false, error: err?.message || 'Error SMTP' };
    }
  }

  const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
