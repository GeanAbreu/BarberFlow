export interface ReminderProvider { send(destination: string, message: string): Promise<{ providerId?: string; skipped?: boolean }> }

class MetaWhatsAppProvider implements ReminderProvider {
  async send(destination: string, message: string) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN; const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) return { skipped: true };
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: destination.replace(/\D/g, ''), type: 'text', text: { body: message } }) });
    const body = await response.json() as { messages?: { id: string }[]; error?: { message: string } };
    if (!response.ok) throw new Error(body.error?.message || 'Falha no provedor WhatsApp.');
    return { providerId: body.messages?.[0]?.id };
  }
}

export const reminderProvider: ReminderProvider = new MetaWhatsAppProvider();
