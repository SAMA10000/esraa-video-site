import { useState, useRef } from 'react';
import { Play, Search, X } from 'lucide-react';

interface HeaderProps {
  onCategoryClick?: (slug: string) => void;
  categories?: { name: string; slug: string }[];
  activeCategory?: string;
}

export function Header({ categories = [], activeCategory, onCategoryClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  // ============================================================
  // HIDDEN ADMIN ENTRY: 3-Second Long-Press on Logo
  // Redirects to /esraa (admin login)
  // ============================================================
  const handleLogoPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      window.location.href = '/esraa';
    }, 3000);
  };

  const handleLogoPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-midnight/95 backdrop-blur-lg border-b border-gold/10">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مسلسل..."
                className="flex-1 bg-deep-purple border border-gold/20 rounded-full px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 text-sm"
                dir="rtl"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="w-10 h-10 rounded-full bg-deep-purple flex items-center justify-center text-gray-400 hover:text-gold transition-colors touch-target"
              >
                <X size={20} />
              </button>
            </form>
          ) : (
            <>
              <button
                onClick={() => setShowSearch(true)}
                className="w-10 h-10 rounded-full bg-deep-purple flex items-center justify-center text-gold hover:bg-gold/10 transition-colors touch-target"
              >
                <Search size={20} />
              </button>

              {/* Platform Logo - HIDDEN LONG-PRESS FOR ADMIN ENTRY (/esraa) */}
              <a
                href="/"
                className="flex items-center gap-2"
                onTouchStart={handleLogoPressStart}
                onTouchEnd={handleLogoPressEnd}
                onMouseDown={handleLogoPressStart}
                onMouseUp={handleLogoPressEnd}
                onMouseLeave={handleLogoPressEnd}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-md shadow-gold/20">
                  <Play size={16} fill="#0a0a14" className="text-midnight ml-0.5" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-gradient-gold">دراما قصيرة بالعربي</h1>
                </div>
              </a>

              {/* Balance spacer */}
              <div className="w-10 h-10" />
            </>
          )}
        </div>

        {/* Category Pills */}
        {categories.length > 0 && !showSearch && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-3 text-xs">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.slug}
                onClick={() => onCategoryClick?.(cat.slug)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full font-semibold transition-all touch-target ${
                  activeCategory === cat.slug
                    ? 'bg-gradient-gold text-midnight'
                    : 'border border-gold/20 text-gold hover:bg-gold/10 hover:border-gold/40'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
