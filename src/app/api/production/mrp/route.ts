import { ok, fail } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { handleApi } from '@/lib/api/handler';
import { mrpService } from '@/lib/services/mrp-service';

export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const { companyId } = user;
    const data = await mrpService.calculateRequirements(companyId);
    
    // Sadece eksik olan malzemeleri dönelim (veya tümünü dilersek parametreye göre)
    const { searchParams } = new URL(request.url);
    const onlyShortages = searchParams.get('onlyShortages') === 'true';

    const result = onlyShortages ? data.filter(d => d.shortage > 0) : data;

    return ok({ list: result });
  });
});
