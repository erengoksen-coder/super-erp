import { getDatabase } from '@/lib/database/db'
import { randomUUID, randomBytes } from 'crypto'
import { ApiTokenInput, WebhookInput } from '@/lib/validation/api-schema'

/**
 * API ve Entegrasyon Servisi (Kurumsal Katman)
 * İş mantığını UI ve API route'larından ayırır.
 */
export const apiService = {
  
  // TOKENS
  async getTokens(companyId: string) {
    const db = getDatabase()
    const tokens = db.prepare(`
      SELECT id, name, SUBSTR(token, 1, 8) || '...' as token_masked, 
             last_used_at, is_active, created_at, scopes, ip_restrictions, expires_at
      FROM api_tokens 
      WHERE company_id = ? 
      ORDER BY created_at DESC
    `).all(companyId)

    return tokens.map((t: any) => ({
      ...t,
      scopes: t.scopes ? JSON.parse(t.scopes) : [],
      ip_restrictions: t.ip_restrictions ? JSON.parse(t.ip_restrictions) : []
    }))
  },

  async createToken(companyId: string, userId: string, branchId: string, input: ApiTokenInput) {
    const db = getDatabase()
    const id = `token_${randomUUID()}`
    const tokenValue = `erp_${randomBytes(24).toString('hex')}`

    db.prepare(`
      INSERT INTO api_tokens (
        id, name, token, user_id, company_id, branch_id, 
        scopes, ip_restrictions, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.name, tokenValue, userId, companyId, branchId,
      JSON.stringify(input.scopes || []),
      JSON.stringify(input.ip_restrictions || []),
      input.expires_at || null
    )

    return { id, token: tokenValue }
  },

  async deleteToken(tokenId: string, companyId: string) {
    const db = getDatabase()
    return db.prepare('DELETE FROM api_tokens WHERE id = ? AND company_id = ?')
      .run(tokenId, companyId)
  },

  // WEBHOOKS
  async getWebhooks(companyId: string) {
    const db = getDatabase()
    const webhooks = db.prepare(`
      SELECT * FROM webhooks WHERE company_id = ? ORDER BY created_at DESC
    `).all(companyId)

    return webhooks.map((w: any) => ({
      ...w,
      event_types: JSON.parse(w.event_types)
    }))
  },

  async createWebhook(companyId: string, input: WebhookInput) {
    const db = getDatabase()
    const id = `wh_${randomUUID()}`
    
    db.prepare(`
      INSERT INTO webhooks (id, url, event_types, secret_key, description, company_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id, input.url, JSON.stringify(input.event_types), 
      input.secret_key || null, input.description || null, 
      companyId
    )

    return { id }
  },

  async deleteWebhook(whId: string, companyId: string) {
    const db = getDatabase()
    return db.prepare('DELETE FROM webhooks WHERE id = ? AND company_id = ?').run(whId, companyId)
  },

  async testWebhook(companyId: string, webhookId: string) {
    const db = getDatabase()
    const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND company_id = ?').get(webhookId, companyId) as any
    
    if (!webhook) throw new Error('Webhook bulunamadı')

    const start = Date.now()
    const payload = {
      event: 'system.ping',
      timestamp: new Date().toISOString(),
      message: 'Bu bir test sinyalidir.',
      webhook_id: webhookId
    }

    let statusCode = 0
    let responseBody = ''
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret_key || ''
        },
        body: JSON.stringify(payload)
      })
      statusCode = response.status
      responseBody = await response.text()
    } catch (err: any) {
      statusCode = 500
      responseBody = err.message
    }

    const duration = Date.now() - start

    // Log the test attempt
    db.prepare(`
      INSERT INTO webhook_logs (id, webhook_id, event_type, status_code, request_payload, response_body, duration_ms, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `wlog_test_${randomUUID()}`,
      webhookId,
      'system.ping',
      statusCode,
      JSON.stringify(payload),
      responseBody.substring(0, 1000), // Limit size
      duration,
      companyId
    )

    return { statusCode, duration }
  },

  // LOGS
  async getWebhookLogs(companyId: string, webhookId?: string, limit = 50) {
    const db = getDatabase()
    let query = `
      SELECT wl.*, w.url as webhook_url
      FROM webhook_logs wl
      JOIN webhooks w ON wl.webhook_id = w.id
      WHERE wl.company_id = ?
    `
    const params: any[] = [companyId]
    if (webhookId) {
      query += ' AND wl.webhook_id = ?'
      params.push(webhookId)
    }
    query += ' ORDER BY wl.created_at DESC LIMIT ?'
    params.push(limit)

    const logs = db.prepare(query).all(...params)

    return logs.map((log: any) => ({
      ...log,
      request_payload: log.request_payload ? JSON.parse(log.request_payload) : null,
      response_body: log.response_body ? (log.response_body.startsWith('{') ? JSON.parse(log.response_body) : log.response_body) : null
    }))
  }
}
