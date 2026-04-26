// LLM client for dynamic AI integration
// Supports calling external LLM (e.g., OpenAI) when Furki AI cannot answer via rule‑based logic.



export interface LLMResponse {
    answer: string;
    // optional additional fields can be added later
}

/**
 * Calls the configured LLM service with the given prompt.
 * The implementation expects an environment variable `LLM_API_KEY` and `LLM_ENDPOINT`.
 * Adjust the request payload according to the provider you use.
 */
export async function callLLM(
    prompt: string,
    history: { role: 'user' | 'assistant', content: string }[] = [],
    systemContext: string = ''
): Promise<LLMResponse> {
    const apiKey = process.env.LLM_API_KEY;
    const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

    if (!apiKey) {
        console.warn('[Furki AI] LLM API key not configured');
        return { answer: '' };
    }

    try {
        const messages = [
            {
                role: 'system',
                content: `Sen **Furki AI** navigasyon ve analiz asistanısın. LIVASOFA ERP sisteminin akıllı parçasısın.
Yardımcı, çözüm odaklı, profesyonel ama samimi bir dil kullan (Siz diye hitap et). 
Kullanıcının sorularına sistem verileriyle (varsa) desteklenen yanıtlar ver. 
Lütfen sorulara ve yanıtlara sadece Türkçe dilinde cevap ver.
${systemContext}`
            },
            ...history,
            { role: 'user', content: prompt }
        ];

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            console.error('[Furki AI] LLM request failed', response.status, await response.text());
            return { answer: 'Üzgünüm, dış AI servisi bir hata döndürdü.' };
        }

        const data = (await response.json()) as any;
        const answer = data?.choices?.[0]?.message?.content?.trim() ?? 'Cevap alınamadı.';
        return { answer };
    } catch (err) {
        console.error('[Furki AI] LLM call error', err);
        return { answer: 'Üzgünüm, dış AI servisine bağlanırken bir hata oluştu.' };
    }
}
