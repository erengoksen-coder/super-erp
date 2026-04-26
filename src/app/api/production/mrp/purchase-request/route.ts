import { ok, fail } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { handleApi } from '@/lib/api/handler';
import { getDatabase } from '@/lib/database/db';

import { mrpService } from '@/lib/services/mrp-service';

export const POST = withAuth(async (request, user) => {
  return handleApi(async () => {
    const { companyId } = user;
    const body = await request.json();
    const { materialId } = body;

    if (!materialId) return fail('Malzeme ID gereklidir', { status: 400 });

    const db = getDatabase();
    
    // 1. İhtiyacı tekrar hesapla (en güncel veri için)
    const requirements = await mrpService.calculateRequirements(companyId);
    const materialReq = requirements.find(r => r.material_id === materialId);

    if (!materialReq || materialReq.shortage <= 0) {
      return fail('Bu malzeme için eksik stok bulunamadı.', { status: 400 });
    }

    // 2. Satın alma talebi oluştur
    const requestId = crypto.randomUUID();
    const requestNumber = `MRP-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO purchase_requests (
        id, request_number, material_id, requested_quantity, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      requestNumber,
      materialId,
      materialReq.shortage,
      'pending',
      'MRP tarafından otomatik oluşturuldu.'
    );

    return ok({ id: requestId, number: requestNumber });
  });
});
