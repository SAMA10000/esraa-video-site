import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import type { Drama } from '../types';

interface StickyPlayerBarProps {
  drama: Drama;
  isPlaying: boolean;
  isMuted: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onExpand: () => void;
}

export function StickyPlayerBar({
  drama,
  isPlaying,
  isMuted,
  onClose,
  onTogglePlay,
  onToggleMute,
  onExpand,
}: StickyPlayerBarProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
      }, 500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200&h=356&fit=crop';
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-40 w-[320px] bg-deep-purple rounded-xl shadow-2xl shadow-gold/10 border border-gold/20 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div
          className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={onExpand}
        >
          <img
            src={drama.thumbnail_url}
            alt={drama.title}
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-midnight/40 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center animate-pulse">
                <Play size={14} fill="#0a0a14" className="text-midnight ml-0.5" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right" dir="rtl">
          <h4 className="text-white font-semibold text-sm truncate">{drama.title}</h4>
          <p className="text-gray-400 text-xs truncate">{drama.category?.name || 'مسلسل'}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleMute}
            className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center text-gray-400 hover:text-gold transition-colors"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-midnight transition-all hover:scale-105 shadow-lg shadow-gold/20"
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center text-gray-400 hover:text-orange transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="h-1 bg-midnight">
        <div
          className="h-full bg-gradient-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
