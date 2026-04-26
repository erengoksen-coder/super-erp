import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Livasofa ERP Pagination Helper
 * Standardizes how API routes parse page/limit parameters.
 */
export function getPaginationParams(req: NextRequest, defaultLimit = 20): PaginationParams {
  const { searchParams } = new URL(req.url);
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || defaultLimit.toString())));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Standardize API response for paginated lists
 */
export function createPaginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
