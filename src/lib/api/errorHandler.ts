import { toast } from 'sonner';
import { AppError } from '@/lib/errors';

/**
 * Super ERP - Global API Error Handler
 * Standardizes how errors are caught and displayed to the user.
 */

export function handleApiError(error: any) {
  console.error('[API Error]:', error);

  let message = 'Beklenmedik bir hata oluştu.';
  let description = '';

  if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Özel durumlar
  if (message.includes('Failed to fetch') || message.includes('Network Error')) {
    message = 'Sunucuya bağlanılamadı.';
    description = 'İnternet bağlantınızı kontrol edin.';
  }

  toast.error(message, {
    description: description || undefined,
  });

  return { message, description };
}

export const errorHandler = {
  handle: handleApiError
};