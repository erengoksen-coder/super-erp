import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail } from './response';
import { logger } from '../utils/logger';
import { withAuth, withAuthAndPermission } from './withAuth';

type HandlerContext = {
  params: Record<string, string>;
  user?: any;
  body?: any;
};

type HandlerFunction = (req: NextRequest, ctx: HandlerContext) => Promise<NextResponse>;

interface HandlerOptions {
  schema?: z.ZodSchema;
  permission?: { 
    path: string; 
    action: 'view' | 'create' | 'edit' | 'delete' 
  };
  authRequired?: boolean;
}

/**
 * Higher-order function to wrap API handlers with standard logic.
 * - Authentication (via withAuth/withAuthAndPermission)
 * - Zod Validation for body
 * - Unified Error Handling
 */
export function withHandlers(handler: HandlerFunction, options: HandlerOptions = {}) {
  return async (req: NextRequest, ctx: any) => {
    try {
      // 1. Auth & Permissions
      if (options.permission) {
        return withAuthAndPermission(
          async (req, user, context) => executeHandler(req, { ...ctx, user }, options, handler),
          options.permission.path,
          options.permission.action
        )(req, ctx);
      } else if (options.authRequired !== false) {
        return withAuth(
          async (req, user, context) => executeHandler(req, { ...ctx, user }, options, handler)
        )(req, ctx);
      }

      return executeHandler(req, ctx, options, handler);
    } catch (error: any) {
      logger.error('Unhandled API Error:', error);
      return fail(error.message || 'Bir iç hata oluştu', { status: 500 });
    }
  };
}

async function executeHandler(
  req: NextRequest, 
  ctx: HandlerContext, 
  options: HandlerOptions, 
  handler: HandlerFunction
) {
  try {
    // 2. Body Validation (if schema provided)
    if (options.schema && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = await req.json();
      const result = options.schema.safeParse(body);
      
      if (!result.success) {
        return fail(result.error.errors[0].message, { status: 400 });
      }
      
      // Attach validated data to req (as a custom property, or we can just pass it to handler)
      // Since NextRequest is not easily mutable, we'll suggest handlers read it or we pass it via ctx
      (ctx as any).body = result.data;
    }

    return await handler(req, ctx);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return fail(error.errors[0].message, { status: 400 });
    }
    logger.error(`API Error [${req.method} ${req.url}]:`, error);
    return fail(error.message || 'İşlem sırasında bir hata oluştu', { status: 400 });
  }
}
