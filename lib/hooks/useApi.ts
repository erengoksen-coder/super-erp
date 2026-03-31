import useSWR, { SWRConfiguration } from 'swr';
import { toast } from 'sonner';

/**
 * Global fetcher for SWR.
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || 'Veri yüklenirken bir hata oluştu');
    (error as any).status = res.status;
    throw error;
  }
  
  const data = await res.json();
  return data.data; // Standardized API response structure
};

interface UseApiResult<T> {
  data: T | undefined;
  error: any;
  isLoading: boolean;
  mutate: (data?: any, shouldRevalidate?: boolean) => Promise<any>;
}

/**
 * Custom hook to wrap SWR with standardized Super ERP logic.
 * Features:
 * - Automatic background revalidation
 * - Unified error handling (toast)
 * - Loading state management
 */
export function useApi<T = any>(
  key: string | null | (() => string | null), 
  options?: SWRConfiguration
): UseApiResult<T> {
  const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onError: (err) => {
      console.error('API Hook Error:', err);
      toast.error(err.message || 'Hata oluştu');
    },
    ...options
  });

  return {
    data,
    error,
    isLoading,
    mutate
  };
}
