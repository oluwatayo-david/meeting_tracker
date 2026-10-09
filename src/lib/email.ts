/**
 * email.ts
 * -------------------------------------------------------
 * Server-side transactional email. Never import this from a client component.
 *
 * Two transports — SMTP is used when configured, otherwise EmailJS:
 *
 *   SMTP (Nodemailer):  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *                       optional SMTP_SECURE ("true" for port 465)
 *
 *   EmailJS REST API:   NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
 *                       NEXT_PUBLIC_EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY (recommended)
 *     The template must use: To Email = {{to_email}}, Subject = {{subject}},
 *     Content = {{{message_html}}} (three braces so the HTML is not escaped).
 *     In the EmailJS dashboard → Account → Security, enable
 *     "Allow EmailJS API for non-browser applications".
 *
 * Optional for both: EMAIL_ORG_NAME, EMAIL_REPLY_TO, EMAIL_TIMEZONE
 */

import nodemailer, { type Transporter } from 'nodemailer';
import type { Meeting } from '@/types';
import { getAppUrl } from '@/lib/url';

const ORG_NAME = process.env.EMAIL_ORG_NAME || 'SCIDaR ActionAI Workspace';
const BRAND_COLOR = '#4f46e5';
const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_MIN_GAP_MS = 1100; // EmailJS accepts ~1 request per second

let transporter: Transporter | null = null;

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

function isEmailJsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID &&
    process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  );
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isEmailJsConfigured();
}

async function sendViaEmailJs(message: EmailMessage): Promise<void> {
  const res = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
      user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY || undefined,
      template_params: {
        to_email: message.to,
        email: message.to,
        subject: message.subject,
        message_html: message.html,
        message: message.text,
        from_name: ORG_NAME,
        reply_to: process.env.EMAIL_REPLY_TO || '',
      },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`EmailJS ${res.status}: ${detail || res.statusText}`);
  }
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn('[Email] No email transport configured (SMTP or EmailJS) — skipped email to', message.to);
    return { success: false, error: 'Email service is not configured' };
  }
  try {
    if (isSmtpConfigured()) {
      await getTransporter().sendMail({
        from: process.env.EMAIL_FROM,
        replyTo: process.env.EMAIL_REPLY_TO || undefined,
        ...message,
      });
    } else {
      await sendViaEmailJs(message);
    }
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[Email] Failed to send to', message.to, error);
    return { success: false, error };
  }
}

/** Sends to many recipients independently so one bad address doesn't block the rest. */
export async function sendBulkEmail(messages: EmailMessage[]): Promise<{ sent: number; failed: string[] }> {
  let results: { success: boolean }[];
  if (isSmtpConfigured()) {
    results = await Promise.all(messages.map(m => sendEmail(m)));
  } else {
    // EmailJS rejects bursts, so send one at a time
    results = [];
    for (const [i, m] of messages.entries()) {
      if (i > 0) await new Promise(r => setTimeout(r, EMAILJS_MIN_GAP_MS));
      results.push(await sendEmail(m));
    }
  }
  const failed = messages.filter((_, i) => !results[i].success).map(m => m.to);
  return { sent: messages.length - failed.length, failed };
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detailRows(rows: [string, string][]): string {
  return rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#64748b;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`)
    .join('');
}

function layout(params: { preheader: string; heading: string; body: string; ctaLabel: string; ctaUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(params.heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:${BRAND_COLOR};padding:20px 32px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.3px;">${escapeHtml(ORG_NAME)}</td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#0f172a;">${escapeHtml(params.heading)}</h1>
          ${params.body}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
            <tr><td style="border-radius:8px;background:${BRAND_COLOR};">
              <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(params.ctaLabel)}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:18px;color:#94a3b8;">
          This is an automated message from ${escapeHtml(ORG_NAME)}. If you believe you received it in error, please contact your administrator.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#334155;">${text}</p>`;
}

function formatMeetingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'To be confirmed';
  return date.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: process.env.EMAIL_TIMEZONE || 'Africa/Lagos', timeZoneName: 'short',
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function meetingInvitationEmail(params: {
  to: string;
  recipientName: string;
  organizerName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingType: string;
  department?: string;
  description?: string;
  appUrl: string;
}): EmailMessage {
  const when = formatMeetingDate(params.meetingDate);
  const type = params.meetingType === 'EXTERNAL' ? 'External' : 'Internal';
  const rows: [string, string][] = [
    ['Meeting', params.meetingTitle],
    ['Date & time', when],
    ['Type', type],
    ['Organised by', params.organizerName],
  ];
  if (params.department) rows.push(['Department', params.department]);

  const body = [
    paragraph(`Dear ${escapeHtml(params.recipientName)},`),
    paragraph(`You have been invited by <strong>${escapeHtml(params.organizerName)}</strong> to attend the meeting below. Please make the necessary arrangements to attend and come prepared to contribute.`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${detailRows(rows)}</table>`,
    params.description
      ? paragraph(`<strong>Agenda / notes</strong><br>${escapeHtml(params.description).replace(/\n/g, '<br>')}`)
      : '',
    paragraph('Action points assigned to you during this meeting will appear in your workspace, where you can track deadlines and submit your deliverables.'),
    paragraph('Kind regards,<br>' + escapeHtml(ORG_NAME)),
  ].join('');

  const text = [
    `Dear ${params.recipientName},`,
    '',
    `You have been invited by ${params.organizerName} to attend the following meeting:`,
    '',
    ...rows.map(([l, v]) => `${l}: ${v}`),
    ...(params.description ? ['', `Agenda / notes: ${params.description}`] : []),
    '',
    `View it in your workspace: ${params.appUrl}`,
    '',
    'Kind regards,',
    ORG_NAME,
  ].join('\n');

  return {
    to: params.to,
    subject: `Meeting Invitation: ${params.meetingTitle} — ${when}`,
    html: layout({
      preheader: `${params.organizerName} invited you to "${params.meetingTitle}" on ${when}.`,
      heading: 'You have been invited to a meeting',
      body,
      ctaLabel: 'View Meeting',
      ctaUrl: params.appUrl,
    }),
    text,
  };
}

export function actionReminderEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  itemTitle: string;
  meetingTitle?: string;
  dueDate: string;
  priority: string;
  status: string;
  appUrl: string;
}): EmailMessage {
  const due = new Date(params.dueDate);
  const dueLabel = Number.isNaN(due.getTime())
    ? 'Not set'
    : due.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: process.env.EMAIL_TIMEZONE || 'Africa/Lagos' });
  const overdue = !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
  const rows: [string, string][] = [
    ['Action point', params.itemTitle],
    ['Due date', overdue ? `${dueLabel} (overdue)` : dueLabel],
    ['Priority', titleCase(params.priority)],
    ['Current status', titleCase(params.status)],
  ];
  if (params.meetingTitle) rows.push(['From meeting', params.meetingTitle]);

  const body = [
    paragraph(`Dear ${escapeHtml(params.recipientName)},`),
    paragraph(`This is a friendly reminder from <strong>${escapeHtml(params.senderName)}</strong> regarding an action point assigned to you${overdue ? ', which is now past its due date' : ''}.`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${detailRows(rows)}</table>`,
    paragraph('Once complete, please submit your proof of work in the workspace so it can be reviewed. If you are facing any blockers, kindly reach out to your manager.'),
    paragraph('Kind regards,<br>' + escapeHtml(ORG_NAME)),
  ].join('');

  const text = [
    `Dear ${params.recipientName},`,
    '',
    `This is a reminder from ${params.senderName} regarding an action point assigned to you${overdue ? ', which is now overdue' : ''}:`,
    '',
    ...rows.map(([l, v]) => `${l}: ${v}`),
    '',
    `Submit your proof of work here: ${params.appUrl}`,
    '',
    'Kind regards,',
    ORG_NAME,
  ].join('\n');

  return {
    to: params.to,
    subject: `${overdue ? 'Overdue' : 'Reminder'}: ${params.itemTitle} — due ${dueLabel}`,
    html: layout({
      preheader: `Reminder: "${params.itemTitle}" is due ${dueLabel}.`,
      heading: overdue ? 'Action point overdue' : 'Action point reminder',
      body,
      ctaLabel: 'Open My Action Items',
      ctaUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * Emails each meeting participant (except the organiser) an invitation.
 * Pass `onlyEmails` to restrict to newly added participants. Never throws.
 */
export async function sendMeetingInvitations(
  meeting: Meeting,
  organizer: { email: string; name: string },
  req: Request,
  onlyEmails?: string[]
): Promise<{ sent: number; failed: string[] }> {
  const seen = new Set<string>([organizer.email.toLowerCase()]);
  const recipients = meeting.participants.filter(p => {
    const email = p.email?.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    if (onlyEmails && !onlyEmails.includes(email)) return false;
    seen.add(email);
    return true;
  });

  const appUrl = getAppUrl(req);
  return sendBulkEmail(recipients.map(p => meetingInvitationEmail({
    to: p.email,
    recipientName: p.name || p.email.split('@')[0],
    organizerName: organizer.name,
    meetingTitle: meeting.title,
    meetingDate: meeting.meetingDate,
    meetingType: meeting.meetingType,
    department: meeting.department,
    description: meeting.description,
    appUrl,
  })));
}

export function staffWelcomeEmail(params: {
  to: string;
  name: string;
  role: string;
  department: string;
  tempPassword: string;
  loginUrl: string;
  provisionedByName: string;
}): EmailMessage {
  const roleLabel = params.role.charAt(0) + params.role.slice(1).toLowerCase();
  const rows: [string, string][] = [
    ['Login email', params.to],
    ['Temporary password', params.tempPassword],
    ['Role', roleLabel],
    ['Department', params.department || '—'],
  ];

  const body = [
    paragraph(`Dear ${escapeHtml(params.name)},`),
    paragraph(`Welcome aboard. <strong>${escapeHtml(params.provisionedByName)}</strong> has created your account on the ${escapeHtml(ORG_NAME)}, where you will receive meeting invitations, track the action points assigned to you, and submit your deliverables for review.`),
    paragraph('Your sign-in details are below:'),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${detailRows(rows)}</table>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:20px;color:#92400e;">
      <strong>For your security:</strong> this password is temporary. You will be asked to choose your own password when you first sign in. Please do not share it with anyone — our team will never ask you for your password.
    </td></tr></table>`,
    paragraph('Kind regards,<br>' + escapeHtml(ORG_NAME)),
  ].join('');

  const text = [
    `Dear ${params.name},`,
    '',
    `Welcome aboard. ${params.provisionedByName} has created your account on the ${ORG_NAME}.`,
    '',
    ...rows.map(([l, v]) => `${l}: ${v}`),
    '',
    `Sign in here: ${params.loginUrl}`,
    '',
    'For your security, this password is temporary: you will be asked to choose your own password when you first sign in. Please do not share it with anyone.',
    '',
    'Kind regards,',
    ORG_NAME,
  ].join('\n');

  return {
    to: params.to,
    subject: `Welcome to ${ORG_NAME} — Your Account Details`,
    html: layout({
      preheader: 'Your account has been created. Here are your sign-in details.',
      heading: `Welcome to ${ORG_NAME}`,
      body,
      ctaLabel: 'Sign In to Your Account',
      ctaUrl: params.loginUrl,
    }),
    text,
  };
}