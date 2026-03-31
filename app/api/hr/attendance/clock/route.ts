import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { format } from 'date-fns'
import { AuditService } from '@/lib/services/audit'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { userId, companyId, branchId } = authUser
    const body = await request.json()
    const { action } = body // 'in' or 'out'

    const db = getDatabase()
    const today = format(new Date(), 'yyyy-MM-dd')
    const nowTime = format(new Date(), 'HH:mm')

    // 1. Personelin vardiya bilgisini çek
    const profile = db.prepare(`
      SELECT ep.shift_id, st.start_time, st.end_time, st.break_minutes
      FROM hr_employee_profiles ep
      LEFT JOIN hr_shift_templates st ON ep.shift_id = st.id
      WHERE ep.employee_id = ? AND ep.company_id = ? AND ep.branch_id = ?
    `).get(userId, companyId, branchId) as any

    if (!profile) {
      return fail('Personel profili veya vardiya tanımı bulunamadı.')
    }

    // 2. Mevcut kayıt var mı kontrol et
    const existing = db.prepare(`
      SELECT * FROM hr_attendance 
      WHERE employee_id = ? AND date = ? AND company_id = ? AND branch_id = ?
    `).get(userId, today, companyId, branchId) as any

    if (action === 'in') {
      if (existing && existing.check_in) {
        return fail('Bugün için zaten giriş yapılmış.')
      }

      // Gecikme hesapla
      let lateMinutes = 0
      if (profile.start_time) {
        const [planH, planM] = profile.start_time.split(':').map(Number)
        const [nowH, nowM] = nowTime.split(':').map(Number)
        const diff = (nowH * 60 + nowM) - (planH * 60 + planM)
        lateMinutes = diff > 0 ? diff : 0
      }

      if (existing) {
        db.prepare(`
          UPDATE hr_attendance 
          SET check_in = ?, late_minutes = ?, planned_start = ?, planned_end = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nowTime, lateMinutes, profile.start_time, profile.end_time, existing.id)
      } else {
        const id = randomUUID()
        db.prepare(`
          INSERT INTO hr_attendance (id, employee_id, date, check_in, late_minutes, planned_start, planned_end, company_id, branch_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'present')
        `).run(id, userId, today, nowTime, lateMinutes, profile.start_time, profile.end_time, companyId, branchId)
      }

      // AUDIT LOG
      await AuditService.log({
        userId, companyId, branchId,
        actionType: 'CREATE',
        entityName: 'hr_attendance',
        entityId: userId,
        description: `Mesai Başlatıldı (${nowTime}). Gecikme: ${lateMinutes} dk.`,
        newData: { time: nowTime, lateMinutes, today },
        userAgent: request.headers.get('user-agent') || undefined
      })

      return ok({ time: nowTime, lateMinutes, message: 'Giriş başarılı.' })
    } 
    
    if (action === 'out') {
      if (!existing || !existing.check_in) {
        return fail('Giriş kaydı bulunmadan çıkış yapılamaz.')
      }
      if (existing.check_out) {
        return fail('Bugün için zaten çıkış yapılmış.')
      }

      // Erken çıkış ve toplam süre hesapla
      let earlyExitMinutes = 0
      if (profile.end_time) {
        const [planH, planM] = profile.end_time.split(':').map(Number)
        const [nowH, nowM] = nowTime.split(':').map(Number)
        const diff = (planH * 60 + planM) - (nowH * 60 + nowM)
        earlyExitMinutes = diff > 0 ? diff : 0
      }

      // Toplam dakika (check_in -> check_out) - mola
      const [inH, inM] = existing.check_in.split(':').map(Number)
      const [outH, outM] = nowTime.split(':').map(Number)
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (profile.break_minutes || 0)

      db.prepare(`
        UPDATE hr_attendance 
        SET check_out = ?, early_exit_minutes = ?, total_minutes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nowTime, earlyExitMinutes, totalMinutes > 0 ? totalMinutes : 0, existing.id)

      // AUDIT LOG
      await AuditService.log({
        userId, companyId, branchId,
        actionType: 'UPDATE',
        entityName: 'hr_attendance',
        entityId: userId,
        description: `Mesai Bitirildi (${nowTime}). Çalışma: ${totalMinutes} dk.`,
        newData: { time: nowTime, totalMinutes, earlyExit: earlyExitMinutes },
        userAgent: request.headers.get('user-agent') || undefined
      })

      return ok({ time: nowTime, earlyExitMinutes, totalMinutes, message: 'Çıkış başarılı.' })
    }

    return fail('Geçersiz işlem.')
  })
})
