import { useState, useEffect, useRef } from 'react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Drama } from '../types';

interface HeroSliderProps {
  dramas: Drama[];
  onItemClick: (drama: Drama) => void;
}

export function HeroSlider({ dramas, onItemClick }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dramas.length === 0) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        setCurrentSlide((prev) => (prev + 1) % dramas.length);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [dramas.length, isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX > 50) {
      setCurrentSlide((prev) => (prev - 1 + dramas.length) % dramas.length);
    } else if (translateX < -50) {
      setCurrentSlide((prev) => (prev + 1) % dramas.length);
    }
    setTranslateX(0);
  };

  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % dramas.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + dramas.length) % dramas.length);

  if (dramas.length === 0) return null;

  const currentDrama = dramas[currentSlide];

  return (
    <div
      ref={sliderRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cinematic Dual-Layer Container - Capped at 45vh */}
      <div className="relative" style={{ maxHeight: '45vh', minHeight: '200px' }}>
        {/* Layer 1: Blurred Ambient Background - Full bleed, stretched */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={currentDrama.thumbnail_url}
            alt=""
            className="w-full h-full object-cover scale-125"
            style={{ filter: 'blur(15px) brightness(0.4)' }}
            onError={(e) => {
              e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=600&h=1067&fit=crop';
            }}
            draggable={false}
            aria-hidden="true"
          />
        </div>

        {/* Layer 2: Crisp Foreground Poster (9:16) - Centered, object-contain */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translateX(${translateX}px)` }}
        >
          <img
            src={currentDrama.thumbnail_url}
            alt={currentDrama.title}
            className="h-full max-w-[85%] object-contain drop-shadow-2xl"
            onError={(e) => {
              e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop';
            }}
            draggable={false}
          />
        </div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent/40 to-midnight/30" />
        <div className="absolute inset-0 bg-gradient-to-l from-midnight/70 via-transparent to-midnight/70" />

        {/* Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="px-2 py-0.5 bg-orange text-white text-[10px] font-bold rounded">HD</span>
            <span className="px-2 py-0.5 bg-deep-purple/80 backdrop-blur-sm text-gold text-[10px] font-medium rounded border border-gold/30">
              {currentDrama.category?.name || 'مسلسل'}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white mb-1 text-right animate-fade-in drop-shadow-lg" dir="rtl">
            {currentDrama.title}
          </h2>

          <p className="text-gray-300 text-[11px] sm:text-xs mb-3 line-clamp-2 text-right animate-slide-up" dir="rtl">
            {currentDrama.description}
          </p>

          <button
            onClick={() => onItemClick(currentDrama)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-gold text-midnight font-bold transition-all active:scale-95 touch-target shadow-lg shadow-gold/30 text-sm"
          >
            <Play size={16} fill="currentColor" className="ml-0.5" />
            <span dir="rtl">شاهد الآن</span>
          </button>
        </div>

        {/* Mobile Slide Counter */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-midnight/60 backdrop-blur-sm text-white text-[10px] font-medium">
          {currentSlide + 1} / {dramas.length}
        </div>
      </div>

      {/* Navigation Arrows - Desktop Only */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-midnight/80 backdrop-blur-sm items-center justify-center text-gold hover:bg-deep-purple transition-colors touch-target"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-midnight/80 backdrop-blur-sm items-center justify-center text-gold hover:bg-deep-purple transition-colors touch-target"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {dramas.slice(0, 3).map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 touch-target ${
              index === currentSlide
                ? 'w-6 bg-gradient-gold'
                : 'w-1.5 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
