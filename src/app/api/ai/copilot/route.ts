import { NextRequest } from 'next/server'
import { handleApi } from '@/lib/api/handler'
import { ok, fail } from '@/lib/api/response'
import { AIProvider, type AIMessage } from '@/lib/ai/provider'
import { z } from 'zod'

const copilotSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  context: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const body = await request.json()
    const { messages, context } = copilotSchema.parse(body)

    // Add system context if not present
    const systemMessage: AIMessage = {
      role: 'system',
      content: `Sen Süper ERP'nin akıllı asistanı Agi-Copilot'sun. 
      Kullanıcılara muhasebe, üretim, depo ve finans konularında yardım edersin.
      Sistem Bağlamı: ${JSON.stringify(context || {})}`
    }


    const fullMessages = [systemMessage, ...messages] as AIMessage[]
    const response = await AIProvider.chat(fullMessages)

    return ok(response)
  })
}
