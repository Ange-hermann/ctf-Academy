import "server-only";

export interface WhatsAppNotifier {
  sendText(toE164: string, text: string): Promise<{ ok: boolean }>;
}

/** Envoi simulé (par défaut). Le lien wa.me reste toujours proposé à l'utilisateur. */
class MockWhatsAppNotifier implements WhatsAppNotifier {
  async sendText() {
    return { ok: true };
  }
}

/** WhatsApp Business Cloud API (message texte). TODO: utiliser des modèles approuvés pour les premiers contacts. */
class BusinessWhatsAppNotifier implements WhatsAppNotifier {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}
  async sendText(toE164: string, text: string) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: toE164.replace(/\D/g, ""), type: "text", text: { body: text } }),
    });
    return { ok: res.ok };
  }
}

export function getWhatsAppNotifier(): WhatsAppNotifier {
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (process.env.WHATSAPP_PROVIDER === "business" && token && id) return new BusinessWhatsAppNotifier(token, id);
  return new MockWhatsAppNotifier();
}
