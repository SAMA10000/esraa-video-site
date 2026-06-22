import { Star, Play } from 'lucide-react';
import type { Drama } from '../types';

interface DramaCardProps {
  drama: Drama;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DramaCard({ drama, onClick, size = 'md' }: DramaCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop';
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  const sizeClasses = {
    sm: 'w-[125px]',
    md: 'w-[145px]',
    lg: 'w-[165px]',
  };

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses[size]} cursor-pointer active:scale-[0.96] transition-transform duration-150`}
    >
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-deep-purple border border-gold/10 shadow-lg shadow-black/40">
        <img
          src={drama.thumbnail_url}
          alt={drama.title}
          onError={handleImageError}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent to-transparent opacity-90" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <span className="px-1.5 py-0.5 bg-orange/90 text-white text-[9px] font-bold rounded shadow-lg">
            HD
          </span>
          <span className="px-1.5 py-0.5 bg-deep-purple/80 backdrop-blur-sm text-gold text-[9px] font-medium rounded border border-gold/30 truncate max-w-[70%]">
            {drama.category?.name || 'مسلسل'}
          </span>
        </div>

        {/* Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/40">
            <Play size={20} fill="#0a0a14" className="text-midnight ml-0.5" />
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 pt-6">
          <div className="flex items-center gap-1 mb-1">
            <Star size={10} className="text-gold fill-gold" />
            <span className="text-gold text-[10px] font-bold">{drama.rating.toFixed(1)}</span>
            <span className="text-gray-500 text-[9px]">({formatViews(drama.view_count)})</span>
          </div>
          <h3 className="text-white font-bold text-[11px] line-clamp-1 leading-tight" dir="rtl">
            {drama.title}
          </h3>
        </div>
      </div>
    </div>
  );
}
