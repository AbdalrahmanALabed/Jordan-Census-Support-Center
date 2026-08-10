import { mockEmailTemplates } from "@/lib/mock-data/cases";

export interface EmailQueueItem {
  id: string;
  templateKey: string;
  to: string;
  subject: string;
  body: string;
  status: "QUEUED" | "SENT" | "FAILED";
  createdAt: string;
}

const emailQueue: EmailQueueItem[] = [];

function renderTemplate(key: string, vars: Record<string, string>): { subject: string; body: string } | null {
  const tpl = mockEmailTemplates.find((t) => t.key === key);
  if (!tpl) return null;
  let subject = tpl.subject;
  let body = tpl.body;
  for (const [k, v] of Object.entries(vars)) {
    subject = subject.replace(new RegExp(`{{${k}}}`, "g"), v);
    body = body.replace(new RegExp(`{{${k}}}`, "g"), v);
  }
  return { subject, body };
}

/** Queue email for delivery (mock — logs to queue; production: SMTP/SendGrid) */
export async function queueEmail(
  templateKey: string,
  vars: Record<string, string>,
  to = "ops@jcsc.gov.jo"
): Promise<EmailQueueItem | null> {
  const rendered = renderTemplate(templateKey, vars);
  if (!rendered) return null;

  const item: EmailQueueItem = {
    id: `email-${Date.now()}`,
    templateKey,
    to,
    subject: rendered.subject,
    body: rendered.body,
    status: "QUEUED",
    createdAt: new Date().toISOString(),
  };

  // Simulate send
  setTimeout(() => {
    item.status = "SENT";
  }, 500);

  emailQueue.unshift(item);
  if (emailQueue.length > 100) emailQueue.pop();
  return item;
}

export async function getEmailQueue(limit = 20): Promise<EmailQueueItem[]> {
  return emailQueue.slice(0, limit);
}

export async function getEmailTemplates() {
  return mockEmailTemplates;
}
