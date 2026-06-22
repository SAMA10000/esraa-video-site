
import { isPreviewMode } from './adminAuth';
import { apiPost } from './apiClient';

export interface AdminApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: string;
}

export async function adminApi<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<AdminApiResult<T>> {
  const result = await apiPost<T>('/admin/data.php', { action, ...payload });
  if (!result.success) {
    return {
      success: false,
      error: result.error || 'فشل تنفيذ العملية من الخادم',
      debug: isPreviewMode() ? result.debug : undefined,
    };
  }
  return result;
}
