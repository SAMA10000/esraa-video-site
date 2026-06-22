export interface AdminSessionUser {
  username: string;
  role: 'super_admin' | 'admin';
}

export type StorageAuditRow = {
  key: string;
  type: 'localStorage' | 'sessionStorage';
  file: string;
  purpose: string;
  affectsAdminAuth: boolean;
  affectsAdminPermissions: boolean;
  affectsProtectedRoutes: boolean;
  safe: boolean;
  fixApplied: string;
};

export const SOURCE_STORAGE_AUDIT: StorageAuditRow[] = [
  { key: 'arabshortdrama_chat_display_name', type: 'localStorage', file: 'src/components/ChatInputSheet.tsx', purpose: 'تذكر اسم الدردشة للراحة فقط؛ التوفر والحجز من MySQL backend.', affectsAdminAuth: false, affectsAdminPermissions: false, affectsProtectedRoutes: false, safe: true, fixApplied: 'Backend username reservation remains authoritative.' },
  { key: 'arabshortdrama_chat_session_id', type: 'sessionStorage', file: 'src/components/ChatInputSheet.tsx', purpose: 'معرف جلسة زائر للشات فقط.', affectsAdminAuth: false, affectsAdminPermissions: false, affectsProtectedRoutes: false, safe: true, fixApplied: 'Does not unlock admin or permissions.' },
  { key: 'user_watch_history', type: 'localStorage', file: 'src/hooks/useContinueWatching.ts', purpose: 'سجل متابعة محلي للزائر فقط.', affectsAdminAuth: false, affectsAdminPermissions: false, affectsProtectedRoutes: false, safe: true, fixApplied: 'Harmless UI history only.' },
  { key: 'arabshortdrama_admin_ui_stats', type: 'localStorage', file: 'src/lib/adminState.ts', purpose: 'عدادات واجهة محلية للتحليلات المساعدة فقط؛ لا تتحكم في البوتات بعد الإصلاح.', affectsAdminAuth: false, affectsAdminPermissions: false, affectsProtectedRoutes: false, safe: true, fixApplied: 'Bot behavior now comes from MySQL public bot APIs.' },
  { key: 'admin_test_country', type: 'sessionStorage', file: 'src/pages/AdminDashboard.tsx', purpose: 'تفضيل اختبار واجهة للأدمن فقط.', affectsAdminAuth: false, affectsAdminPermissions: false, affectsProtectedRoutes: false, safe: true, fixApplied: 'Backend session remains the only admin authority.' },
];

export function isPreviewMode(): boolean {
  return import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
}

export function clearPreviewAdminSession(): void {
  // Legacy compatibility only. Production admin auth is backend Cookie/Session only.
}

export function getStorageSecurityAudit() {
  const localKeys: Array<{ key: string; purpose: string; safe: boolean; file?: string; sourceKnown?: boolean }> = [];
  const sessionKeys: Array<{ key: string; purpose: string; safe: boolean; file?: string; sourceKnown?: boolean }> = [];

  const known = new Map(SOURCE_STORAGE_AUDIT.map((row) => [row.key, row]));

  for (const row of SOURCE_STORAGE_AUDIT) {
    const target = row.type === 'localStorage' ? localKeys : sessionKeys;
    target.push({ key: row.key, purpose: `${row.purpose} | fix: ${row.fixApplied}`, safe: row.safe, file: row.file, sourceKnown: true });
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i) || '';
    if (known.has(key)) continue;
    const unsafe = /(admin|auth|token|role|session|logged|login)/i.test(key);
    localKeys.push({
      key,
      purpose: unsafe ? 'Runtime unknown key: لا يجب أن يمنح دخول أو صلاحيات' : 'Runtime unknown local UI key; no admin authority detected',
      safe: !unsafe,
      sourceKnown: false,
    });
  }

  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i) || '';
    if (known.has(key)) continue;
    const unsafe = /(admin|auth|token|role|logged|login)/i.test(key) && key !== 'admin_test_country';
    sessionKeys.push({
      key,
      purpose: unsafe ? 'Runtime unknown key: لا يجب أن يمنح دخول أو صلاحيات' : 'Runtime unknown session UI key; no admin authority detected',
      safe: !unsafe,
      sourceKnown: false,
    });
  }

  return { localKeys, sessionKeys, sourceAudit: SOURCE_STORAGE_AUDIT };
}
