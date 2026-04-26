import { ok, fail } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import { handleApi } from '@/lib/api/handler';
import { analyticsService } from '@/lib/services/analytics-service';

export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const { companyId } = user;

    if (type === 'revenue') {
      const month = searchParams.get('month'); // Format: YYYY-MM
      if (!month) return fail('Month parameter is required (YYYY-MM)', { status: 400 });
      
      const data = await analyticsService.getMonthlyRevenueDetails(companyId, month);
      return ok({ list: data });
    }

    if (type === 'aging') {
      const bucket = searchParams.get('bucket'); // current, thirtyDay, sixtyDay, ninetyPlus
      if (!bucket) return fail('Bucket parameter is required', { status: 400 });
      
      const data = await analyticsService.getAgingDetails(companyId, bucket);
      return ok({ list: data });
    }

    return fail('Invalid drill-down type', { status: 400 });
  });
});
