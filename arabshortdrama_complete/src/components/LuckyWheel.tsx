import { useState } from 'react';
import { X, Gift } from 'lucide-react';

const SEGMENTS = [
  { label: 'عضوية ذهبية', color: '#1a1a2e' },
  { label: 'مشاهدة بدون إعلانات', color: '#d4af37' },
  { label: 'سيرفر شات VIP', color: '#1a1a2e' },
  { label: 'باقة حلقات مجانية', color: '#ff6b1a' },
  { label: 'عضوية ذهبية', color: '#1a1a2e' },
  { label: 'مشاهدة بدون إعلانات', color: '#d4af37' },
  { label: 'سيرفر شات VIP', color: '#1a1a2e' },
  { label: 'فتح شات VIP وجميع المسلسلات مجاناً', color: '#ff6b1a' },
];

const SEGMENT_COUNT = SEGMENTS.length;
const ARC_DEG = 360 / SEGMENT_COUNT;

interface LuckyWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function LuckyWheel({ isOpen, onClose, onComplete }: LuckyWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Build conic-gradient string
  const conicStops = SEGMENTS.map((seg, i) => {
    const start = i * ARC_DEG;
    const end = start + ARC_DEG;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(', ');
  const conicGradient = `conic-gradient(${conicStops})`;

  const spinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setShowResult(false);

    // Rigged: segment 7 is "فتح شات VIP وجميع المسلسلات مجاناً"
    // The pointer is at top (0deg). We need segment 7 to be at top when wheel stops.
    // Segment 7 starts at 7*45=315deg and ends at 360deg.
    // To put segment 7 center at top, we need to rotate so that 337.5deg (center of seg 7) aligns with 0deg.
    // That means we rotate by 360 - 337.5 = 22.5deg, plus full rotations.
    const targetRotation = 360 * 6 + (360 - (7 * ARC_DEG + ARC_DEG / 2)) + (Math.random() * 6 - 3);
    setRotation((prev) => prev + targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setShowResult(true);
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/95 backdrop-blur-md" onClick={!spinning ? onClose : undefined} />

      <div className="relative bg-deep-purple rounded-2xl max-w-sm w-full shadow-2xl border border-gold/30 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-gold p-4 text-center relative">
          <button
            onClick={!spinning ? onClose : undefined}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-midnight/50 flex items-center justify-center text-midnight"
          >
            <X size={16} />
          </button>
          <h2 className="text-xl font-black text-midnight" dir="rtl">عجلة الحظ الترحيبية</h2>
          <p className="text-midnight/80 text-xs" dir="rtl">أدر العجلة واربح جائزتك المجانية</p>
        </div>

        <div className="p-6 text-center">
          {!showResult ? (
            <>
              {/* Pointer - SVG triangle */}
              <div className="flex justify-center mb-2">
                <svg width="24" height="20" viewBox="0 0 24 20">
                  <polygon points="12,20 0,0 24,0" fill="#d4af37" />
                </svg>
              </div>

              {/* Wheel with CSS conic-gradient + SVG text labels */}
              <div className="relative inline-block">
                <div
                  className="rounded-full border-4 border-gold/50 shadow-lg shadow-gold/20"
                  style={{
                    width: 240,
                    height: 240,
                    background: conicGradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  }}
                >
                  {/* SVG text labels */}
                  <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full">
                    {SEGMENTS.map((seg, i) => {
                      const angle = i * ARC_DEG + ARC_DEG / 2;
                      const rad = (angle * Math.PI) / 180;
                      const cx = 120 + Math.cos(rad - Math.PI / 2) * 80;
                      const cy = 120 + Math.sin(rad - Math.PI / 2) * 80;
                      const rotate = angle;
                      return (
                        <text
                          key={i}
                          x={cx}
                          y={cy}
                          fill="white"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${rotate}, ${cx}, ${cy})`}
                          fontFamily="Cairo, sans-serif"
                        >
                          {seg.label}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Center circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-midnight border-2 border-gold flex items-center justify-center">
                      <span className="text-gold font-black text-xs">GO</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={spinWheel}
                disabled={spinning}
                className={`mt-4 w-full py-4 rounded-xl bg-gradient-gold text-midnight font-bold text-lg touch-target ${
                  spinning ? 'opacity-50 cursor-wait' : 'animate-pulse-gold'
                }`}
              >
                {spinning ? 'جاري الدوران...' : 'أدر العجلة الآن'}
              </button>
            </>
          ) : (
            <>
              {/* Result */}
              <div className="py-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-gold flex items-center justify-center animate-bounce-gentle">
                  <Gift size={40} className="text-midnight" />
                </div>
                <h3 className="text-2xl font-black text-gold mb-3" dir="rtl">مبروك!</h3>
                <p className="text-white text-sm leading-relaxed mb-2" dir="rtl">
                  لقد فزت بالجائزة الكبرى المخصصة لك
                </p>
                <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 mb-4">
                  <p className="text-gold font-bold text-sm" dir="rtl">
                    فتح شات VIP وجميع المسلسلات مجاناً
                  </p>
                </div>
                <p className="text-gray-400 text-xs mb-4" dir="rtl">
                  اضغط بالأسفل لتحميل تطبيق التطبيق الآمن وتثبيتها فوراً قبل انتهاء صلاحية المكافأة
                </p>
              </div>

              <button
                onClick={onComplete}
                className="w-full py-4 rounded-xl bg-gradient-gold text-midnight font-bold text-base touch-target animate-pulse-gold"
              >
                تحميل تطبيق التطبيق الآمن وفتح المكافأة
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
