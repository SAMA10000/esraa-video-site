import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { generateFomoMessage } from '../lib/chatEngine';

export function FomoToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    function showToast() {
      setMessage(generateFomoMessage());
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    }

    const initialTimeout = setTimeout(showToast, 15000);
    const interval = setInterval(showToast, 35000 + Math.random() * 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-20 right-3 z-40 max-w-[280px] animate-slide-up">
      <div className="bg-deep-purple/95 backdrop-blur-sm rounded-xl p-3 border border-gold/20 shadow-2xl shadow-gold/10">
        <div className="flex items-start gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-300 flex-shrink-0 mt-0.5"
          >
            <X size={12} />
          </button>
          <p className="text-gray-300 text-[11px] leading-relaxed" dir="rtl">
            {message}
          </p>
        </div>
        <div className="flex items-center gap-1 mt-1.5 justify-end">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[9px]">تم الآن</span>
        </div>
      </div>
    </div>
  );
}
