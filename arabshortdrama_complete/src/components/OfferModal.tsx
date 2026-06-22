import { useState, useEffect } from 'react';
import { X, Gift, Download, Shield, CheckCircle } from 'lucide-react';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfferModal({ isOpen, onClose }: OfferModalProps) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Hide body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('locker-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('locker-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOfferClick = () => {
    setIsProcessing(true);
    setProgress(0);

    const stages = [
      { target: 34, delay: 600 },
      { target: 52, delay: 400 },
      { target: 78, delay: 700 },
      { target: 95, delay: 400 },
      { target: 100, delay: 400 },
    ];

    let elapsed = 0;
    stages.forEach((stage) => {
      elapsed += stage.delay;
      setTimeout(() => setProgress(stage.target), elapsed);
    });

    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2800);
  };

  const handleClose = () => {
    setIsProcessing(false);
    setProgress(0);
    setIsComplete(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100000,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight/95 backdrop-blur-md"
        onClick={!isProcessing ? handleClose : undefined}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Modal Content - Scrollable with safe bottom padding */}
      <div
        className="relative bg-deep-purple rounded-2xl max-w-md w-full shadow-2xl border border-gold/20 animate-scale-in overflow-y-auto"
        style={{
          maxHeight: '90vh',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-midnight flex items-center justify-center text-gray-400 hover:text-white transition-colors z-[60] touch-target"
          disabled={isProcessing}
        >
          <X size={18} />
        </button>

        {isProcessing ? (
          /* Processing State */
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-gold/30 flex items-center justify-center relative">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1a1a2e" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#goldGrad)" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.3s ease' }} />
                <defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#d4af37" /><stop offset="100%" stopColor="#ff6b1a" /></linearGradient></defs>
              </svg>
              <span className="absolute text-gold font-black text-sm">{progress}%</span>
            </div>
            <h2 className="text-base font-bold text-white mb-2" dir="rtl">جاري فحص اتصالك بالسيرفر الآمن</h2>
            <p className="text-gray-400 text-xs" dir="rtl">وتأكيد هويتك لحماية المنصة...</p>
            <div className="mt-4 h-1.5 bg-midnight rounded-full overflow-hidden">
              <div className="h-full bg-gradient-gold rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : isComplete ? (
          /* Complete State */
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-green-400 mb-2" dir="rtl">تم التحقق بنجاح</h2>
            <p className="text-gray-300 text-sm mb-4" dir="rtl">جاري فتح الخطوة المجانية...</p>
            <div className="w-full h-1.5 bg-midnight rounded-full overflow-hidden">
              <div className="h-full bg-gradient-gold rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          /* Default Offer State */
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-gold p-[3px]">
              <div className="w-full h-full rounded-full bg-deep-purple flex items-center justify-center">
                <Gift size={32} className="text-gold" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-3" dir="rtl">لدعم المنصة واستمرار عرض المسلسلات الحصرية</h2>
            <p className="text-gray-300 mb-4 text-sm leading-relaxed" dir="rtl">
              مجانًا وبدون فواصل، يرجى إكمال عرض واحد سريع لدعم استمرار المنصة
              <br />
              <span className="text-gold">(خطوة مجانية بسيطة)</span>
            </p>

            <div className="bg-midnight rounded-xl p-4 mb-5 border border-gold/10">
              <div className="flex items-center gap-3 justify-center mb-3">
                <Download size={18} className="text-orange" />
                <span className="text-white font-medium text-sm" dir="rtl">العروض المتاحة</span>
              </div>
              <div id="cpa-offer-container" className="min-h-[50px] flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleOfferClick}
                  className="relative z-[100002] w-full py-3.5 px-4 rounded-lg bg-gradient-gold text-midnight font-bold transition-all hover:scale-[1.02] active:scale-95 touch-target cursor-pointer pointer-events-auto"
                  style={{ pointerEvents: 'auto' }}
                >
                  أكمل المهمة وفتح المنصة مجاناً
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-3" dir="rtl">
              <div className="flex items-center gap-1 text-green-400 text-xs"><Shield size={12} /><span>آمن</span></div>
              <div className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} /><span>آمن</span></div>
              <div className="flex items-center gap-1 text-green-400 text-xs"><Download size={12} /><span>مجاني</span></div>
            </div>
            <p className="text-gray-500 text-xs" dir="rtl">بالضغط على الزر أعلاه، ستنتقل لصفحة تحميل تطبيق مجاني من متجر التطبيقات الآمن</p>
          </div>
        )}

        {!isProcessing && !isComplete && (
          <div className="px-6 pb-6">
            <button onClick={handleClose} className="w-full py-3 px-4 rounded-xl bg-midnight border border-gray-700 text-gray-400 font-medium text-sm transition-all hover:border-gray-600 touch-target" dir="rtl">
              ربما لاحقًا
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
