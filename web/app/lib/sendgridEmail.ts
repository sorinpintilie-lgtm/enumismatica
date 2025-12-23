import sgMail from '@sendgrid/mail';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type TemplateEntry = {
  subject: string;
  text?: string;
  html?: string;
};

type TemplatesFile = Record<string, TemplateEntry>;

export type SendTemplateEmailInput = {
  to: string;
  templateKey: string;
  vars?: Record<string, unknown>;
  fallbackKey?: string;
};

const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://enumismatica.ro';
const DEFAULT_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Enumismatica.ro';

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'contact@enumismatica.ro';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Enumismatica.ro';

function getSendGridKey(): string {
  const key = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
  if (!key) {
    throw new Error('Missing SendGrid key. Set SENDGRID_API_KEY or SENDGRID_KEY.');
  }
  return key;
}

let sendgridConfigured = false;
function ensureSendgridConfigured() {
  if (sendgridConfigured) return;

  sgMail.setApiKey(getSendGridKey());

  const residency = (process.env.SENDGRID_DATA_RESIDENCY || '').toLowerCase();
  if (residency === 'eu') {
    (sgMail as any).setDataResidency?.('eu');
  }

  sendgridConfigured = true;
}

function coerceVars(vars: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars || {})) {
    if (v === null || v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

function renderString(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

let templatesCache: { loadedAt: number; data: TemplatesFile } | null = null;

async function loadTemplates(): Promise<TemplatesFile> {
  const now = Date.now();
  if (templatesCache && now - templatesCache.loadedAt < 60_000) {
    return templatesCache.data;
  }

  const filePath =
    process.env.EMAIL_TEMPLATES_PATH || path.join(process.cwd(), 'public', 'email.json');
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw) as TemplatesFile;
  templatesCache = { loadedAt: now, data };
  return data;
}

async function resolveTemplate(templateKey: string, fallbackKey?: string): Promise<TemplateEntry> {
  const templates = await loadTemplates();
  if (templates[templateKey]) return templates[templateKey];
  if (fallbackKey && templates[fallbackKey]) return templates[fallbackKey];
  if (templates.fallback_default) return templates.fallback_default;
  return {
    subject: '{{app_name}}: Notificare',
    text: 'Salut, {{user_name}}!\n\n{{event_message}}\n\n— {{app_name}}\n{{site_url}}',
    html: '<p>Salut, <strong>{{user_name}}</strong>!</p><p>{{event_message}}</p><hr/><p>— <strong>{{app_name}}</strong><br/>{{site_url}}</p>',
  };
}

export async function sendTemplateEmail({
  to,
  templateKey,
  vars,
  fallbackKey,
}: SendTemplateEmailInput): Promise<void> {
  ensureSendgridConfigured();

  const template = await resolveTemplate(templateKey, fallbackKey);
  const mergedVars = {
    app_name: DEFAULT_APP_NAME,
    site_url: DEFAULT_SITE_URL,
    ...coerceVars(vars),
  };

  const subject = renderString(template.subject, mergedVars);
  const text = template.text ? renderString(template.text, mergedVars) : undefined;
  const html = template.html ? renderString(template.html, mergedVars) : undefined;

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    text,
    html,
    mailSettings:
      process.env.SENDGRID_SANDBOX_MODE === 'true' ? { sandboxMode: { enable: true } } : undefined,
  });
}

export async function sendEmailWithAttachments(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments: Array<{ filename: string; contentType: string; contentBase64: string }>;
}): Promise<void> {
  ensureSendgridConfigured();

  await sgMail.send({
    to: params.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments.map((a) => ({
      filename: a.filename,
      type: a.contentType,
      content: a.contentBase64,
      disposition: 'attachment',
    })),
  });
}

