import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export function LiveViewingCounter() {
  const [count, setCount] = useState(() => {
    const base = Math.floor(Math.random() * 200) + 1200;
    const hour = new Date().getHours();
    const peak = hour >= 19 && hour <= 23 ? 1.8 : hour >= 12 && hour <= 17 ? 1.3 : 1;
    return Math.floor(base * peak);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 8) - 4; // -4 to +4
      setCount((prev) => Math.max(800, Math.min(2000, prev + delta)));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-midnight/90 backdrop-blur-sm border border-red-500/20">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-white text-[11px] font-bold" dir="rtl">
        يشاهد الآن: {count.toLocaleString()} شخص
      </span>
      <Users size={12} className="text-red-400" />
    </div>
  );
}
