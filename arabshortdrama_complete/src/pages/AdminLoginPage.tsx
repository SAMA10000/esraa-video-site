import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { isPreviewMode } from '../lib/adminAuth';

const isPreview = isPreviewMode();

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectTo, setRedirectTo] = useState('');
  const [debugInfo, setDebugInfo] = useState('');


  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch('/api/admin/session.php', { credentials: 'include' });

      const data = await response.json();

      if (data.valid) {
        setRedirectTo('/esraa/dashboard');
      }
    } catch {
      // Not logged in, show login form. Auth is backend PHP + MySQL only.
    } finally {
      setCheckingSession(false);
    }
  }

  useEffect(() => {
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  }, [redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDebugInfo('');
    setLoading(true);

    const endpoint = '/api/admin/login.php';
    const method = 'POST';
    const debugLines: string[] = [
      `endpoint: ${endpoint}`,
      `method: ${method}`,
      'backend: PHP + MySQL',
      'DENO_DEPLOYMENT_ID: not required for PHP/MySQL',
    ];

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      debugLines.push('request_reached_backend: yes');
      debugLines.push(`http_status: ${response.status}`);
      debugLines.push(`cors_status: same-origin cookies included`);

      const raw = await response.text();
      let data: { success?: boolean; error?: string; debug?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
        debugLines.push('json_response: yes');
      } catch {
        debugLines.push('json_response: no');
        debugLines.push(`raw_sample: ${raw.slice(0, 120)}`);
      }

      if (response.ok && data.success) {
        setRedirectTo('/esraa/dashboard');
      } else {
        setError(data.error || 'بيانات الدخول غير صحيحة');
        if (isPreview) setDebugInfo([...debugLines, data.debug ? `server_debug: ${data.debug}` : 'server_debug: none'].join(' | '));
      }
    } catch (err) {
      setError('فشل الاتصال بواجهة MySQL API. تأكدي أن ملفات api مرفوعة وأن database.php مضبوط.');
      if (isPreview) {
        setDebugInfo([...debugLines, 'request_reached_backend: no', `network_error: ${err instanceof Error ? err.message : 'Unknown'}`].join(' | '));
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="bg-deep-purple rounded-2xl p-6 border border-gold/20 max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Shield size={24} className="text-midnight" />
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-white" dir="rtl">لوحة تحكم إسراء</h1>
            <p className="text-gray-500 text-xs">arabshortdrama.cloud</p>
          </div>
        </div>

        {/* Preview Warning */}
        {isPreview && (
          <div className="bg-orange/10 border border-orange/30 rounded-lg p-3 mb-4 text-center">
            <p className="text-orange text-xs" dir="rtl">وضع المعاينة - الدخول الحقيقي يتم من MySQL API فقط، بدون جلسات وهمية من التخزين المحلي</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm" dir="rtl">{error}</p>
          </div>
        )}

        {debugInfo && (
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 mb-4">
            <p className="text-gray-400 text-xs font-mono" dir="ltr">{debugInfo}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1" dir="rtl">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-midnight border border-gold/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/50"
              dir="ltr"
              placeholder="username"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1" dir="rtl">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-midnight border border-gold/20 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-gold/50"
                dir="ltr"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 rounded-lg bg-gradient-gold text-midnight font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            <span dir="rtl">{loading ? 'جاري...' : 'دخول'}</span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/" className="text-gray-500 hover:text-gold text-sm">العودة للموقع</a>
        </div>
      </div>
    </div>
  );
}
