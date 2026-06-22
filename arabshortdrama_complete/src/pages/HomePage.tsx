import { useEffect, useState, useCallback } from 'react';
import { getHomeData } from '../lib/dataApi';
import { Layout } from '../components/Layout';
import { DramaCard } from '../components/DramaCard';
import { HeroSlider } from '../components/HeroSlider';
import { useWatchHistory } from '../hooks/useContinueWatching';
import { Clock, Flame, Star, ChevronLeft, Play } from 'lucide-react';
import type { Drama, Category } from '../types';

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [trending, setTrending] = useState<Drama[]>([]);
  const [latest, setLatest] = useState<Drama[]>([]);
  const [heroDramas, setHeroDramas] = useState<Drama[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { history, addToHistory } = useWatchHistory();

useEffect(() => {
  async function fetchData() {
    try {
      const data = await getHomeData();
      setCategories(data.categories || []);
      const allDramas = data.dramas || [];
      setDramas(allDramas);
      setTrending(data.trending || allDramas.slice(0, 12));
      setHeroDramas(data.hero || allDramas.slice(0, 3));
      setLatest(data.latest || [...allDramas].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 12));
    } catch (err) {
      console.error('Error fetching MySQL data:', err);
    } finally {
      setLoading(false);
    }
  }

  fetchData();
}, []);

  const handleDramaClick = useCallback((drama: Drama) => {
    addToHistory(drama);
    window.location.href = `/watch/${drama.slug}`;
  }, [addToHistory]);

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug);
    window.location.href = `/browse?category=${slug}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      categories={categories}
      activeCategory={activeCategory || undefined}
      onCategoryClick={handleCategoryClick}
    >
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Hero Slider */}
        <div className="mb-6">
          <HeroSlider dramas={heroDramas} onItemClick={handleDramaClick} />
        </div>

        {/* Continue Watching */}
        {history.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <a href="/browse" className="flex items-center gap-1 text-gold hover:text-orange transition-colors touch-target">
                <span className="text-xs">المزيد</span>
                <ChevronLeft size={16} />
              </a>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5" dir="rtl">
                <Clock size={16} className="text-orange" />
                أكمل المشاهدة
              </h2>
            </div>

            <div className="horizontal-scroll">
              {history.map((item) => (
                <div
                  key={item.id + '-continue'}
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => { window.location.href = `/watch/${item.slug}`; }}
                >
                  <div className="relative w-[130px] aspect-[9/16] rounded-xl overflow-hidden bg-deep-purple border border-gold/10">
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent to-transparent opacity-70" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white font-bold text-xs line-clamp-1" dir="rtl">{item.title}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center opacity-80">
                        <Play size={14} fill="#0a0a14" className="text-midnight ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <a href="/browse?category=trending" className="flex items-center gap-1 text-gold hover:text-orange transition-colors touch-target">
              <span className="text-xs">المزيد</span>
              <ChevronLeft size={16} />
            </a>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5" dir="rtl">
              <Flame size={16} className="text-orange" />
              الأكثر مشاهدة
            </h2>
          </div>

          <div className="horizontal-scroll">
            {trending.map((drama) => (
              <div
                key={drama.id + '-trending'}
                className="cursor-pointer"
                onClick={() => handleDramaClick(drama)}
              >
                <DramaCard drama={drama} size="sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Latest */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <a href="/browse?sort=latest" className="flex items-center gap-1 text-gold hover:text-orange transition-colors touch-target">
              <span className="text-xs">المزيد</span>
              <ChevronLeft size={16} />
            </a>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5" dir="rtl">
              <Star size={16} className="text-gold" />
              أحدث الإضافات
            </h2>
          </div>

          <div className="horizontal-scroll">
            {latest.map((drama) => (
              <div
                key={drama.id + '-latest'}
                className="cursor-pointer"
                onClick={() => handleDramaClick(drama)}
              >
                <DramaCard drama={drama} size="sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Category Sections */}
        {categories.length > 0 && categories.map((cat) => {
          const catDramas = dramas.filter((d) => d.category?.slug === cat.slug);
          if (catDramas.length === 0) return null;

          return (
            <section key={cat.slug} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <a href={`/browse?category=${cat.slug}`} className="flex items-center gap-1 text-gold hover:text-orange transition-colors touch-target">
                  <span className="text-xs">المزيد</span>
                  <ChevronLeft size={16} />
                </a>
                <h2 className="text-sm font-bold text-white" dir="rtl">{cat.name}</h2>
              </div>

              <div className="horizontal-scroll">
                {catDramas.slice(0, 8).map((drama) => (
                  <div
                    key={drama.id + '-' + cat.slug}
                    className="cursor-pointer"
                    onClick={() => handleDramaClick(drama)}
                  >
                    <DramaCard drama={drama} size="sm" />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
