import { useState, useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface VideoCountdownProps {
  show: boolean;
  onComplete: (action: 'next' | 'replay') => void;
  hasNextVideo: boolean;
}

export function VideoCountdown({ show, onComplete, hasNextVideo }: VideoCountdownProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!show) {
      setCountdown(5);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete(hasNextVideo ? 'next' : 'replay');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onComplete, hasNextVideo]);

  const handleWatchNext = () => {
    setCountdown(5);
    onComplete('next');
  };

  const handleReplay = () => {
    setCountdown(5);
    onComplete('replay');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/90 backdrop-blur-md animate-fade-in">
      <div className="bg-deep-purple rounded-2xl p-6 max-w-sm w-[90%] text-center border border-gold/30 shadow-2xl shadow-gold/10">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-white mb-3" dir="rtl">
            الفيديو التالي يبدأ خلال...
          </h3>
          <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#1a1a2e"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#goldGradient)"
                strokeWidth="10"
                strokeDasharray={`${(countdown / 5) * 264} 264`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#ff6b1a" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-black text-gradient-gold">
                {countdown}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {hasNextVideo && (
            <button
              onClick={handleWatchNext}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-gold text-midnight font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
            >
              <Play size={20} fill="currentColor" className="ml-0.5" />
              <span dir="rtl">شاهد التالي</span>
            </button>
          )}

          <button
            onClick={handleReplay}
            className="w-full py-3.5 px-4 rounded-xl bg-deep-purple border border-gold/50 text-gold font-bold text-lg transition-all hover:bg-gold/10 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} />
            <span dir="rtl">إعادة نفس الفيديو</span>
          </button>
        </div>
      </div>
    </div>
  );
}
