import "server-only";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export interface EmailSender {
  send(message: EmailMessage): Promise<{ ok: boolean }>;
}

/** Envoi simulé (par défaut) : aucun e-mail n'est réellement envoyé. */
class MockEmailSender implements EmailSender {
  async send() {
    return { ok: true };
  }
}

/** Envoi via l'API Resend (clé serveur uniquement). */
class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(message: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, ...message }),
    });
    return { ok: res.ok };
  }
}

export function getEmailSender(): EmailSender {
  const key = process.env.RESEND_API_KEY;
  if (process.env.EMAIL_PROVIDER === "resend" && key) {
    return new ResendEmailSender(key, process.env.EMAIL_FROM ?? "CTF ACADEMY <no-reply@example.org>");
  }
  return new MockEmailSender();
}
