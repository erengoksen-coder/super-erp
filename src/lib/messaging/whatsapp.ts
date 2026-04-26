/**
 * WhatsApp Mesaj Gönderimi
 * WhatsApp'ın Telegram gibi ücretsiz bir Bot API'si olmadığı için 
 * genellikle bir Webhook servisi (Maytapi, Wati, Interakt vb.) kullanılır.
 */

export async function sendWhatsAppMessage(
    webhookUrl: string,
    text: string,
    metadata?: any
): Promise<{ ok: boolean; error?: string }> {
    if (!webhookUrl) {
        return { ok: false, error: 'WhatsApp Webhook URL eksik' };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: text,
                timestamp: new Date().toISOString(),
                source: 'Furki AI',
                ...metadata
            }),
        });

        if (!response.ok) {
            return { ok: false, error: `WhatsApp API Hatası: ${response.statusText}` };
        }

        return { ok: true };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
    }
}
