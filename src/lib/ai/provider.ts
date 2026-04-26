/**
 * Agi-Copilot AI Provider Layer
 * Supports multiple AI models (OpenAI, Gemini, Anthropic)
 */

export type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIResponse = {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class AIProvider {
  /**
   * Main completion method
   */
  static async chat(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      // Mock response for development if no API key is provided
      return {
        content: "Süper ERP Agi-Copilot Modu: API anahtarı bulunamadı. Lütfen .env dosyasına OPENAI_API_KEY veya GEMINI_API_KEY ekleyin. (Mock Yanıt: Verileriniz güvende ve analiz edilmeye hazır!)",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    }

    // Implementation for OpenAI/Gemini would go here
    // For now, let's keep it extensible
    return {
      content: "AI Servisi aktif, ancak henüz modele bağlanmadı. Entegrasyon devam ediyor.",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

  }
}
