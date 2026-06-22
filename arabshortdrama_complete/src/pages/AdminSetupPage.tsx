import { useEffect } from 'react';

// Public admin setup has been intentionally disabled.
// The only visible admin entry is /esraa.
export function AdminSetupPage() {
  useEffect(() => {
    window.location.replace('/esraa');
  }, []);

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4" dir="rtl">
      <div className="bg-deep-purple rounded-2xl p-6 border border-gold/20 max-w-md w-full text-center">
        <p className="text-gray-300 mb-2">تم تعطيل صفحة الإعداد العامة لأسباب أمنية.</p>
        <p className="text-gold text-sm">جاري تحويلك إلى لوحة تحكم إسراء...</p>
      </div>
    </div>
  );
}
