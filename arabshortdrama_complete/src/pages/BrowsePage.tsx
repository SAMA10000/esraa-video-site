import { useState, useEffect, useCallback } from 'react';
import { getCategories, getDramas } from '../lib/dataApi';
import { Layout } from '../components/Layout';
import { DramaCard } from '../components/DramaCard';
import { useWatchHistory } from '../hooks/useContinueWatching';
import { TrendingUp, Clock, Star } from 'lucide-react';
import type { Drama, Category } from '../types';

export function BrowsePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allDramas, setAllDramas] = useState<Drama[]>([]);
  const [filteredDramas, setFilteredDramas] = useState<Drama[]>([]);
  const [sortBy, setSortBy] = useState<'trending' | 'latest' | 'rating'>('trending');
  const [loading, setLoading] = useState(true);
  const { addToHistory } = useWatchHistory();

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam) setSelectedCategory(categoryParam);

        const [categoriesData, dramasData] = await Promise.all([
          getCategories(),
          getDramas(),
        ]);

        setCategories(categoriesData || []);
        setAllDramas(dramasData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...allDramas];

    if (selectedCategory) {
      filtered = filtered.filter((d) => d.category?.slug === selectedCategory);
    }

    switch (sortBy) {
      case 'trending':
        filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'latest':
        filtered.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredDramas(filtered);
  }, [selectedCategory, sortBy, allDramas]);

  const handleDramaClick = useCallback((drama: Drama) => {
    addToHistory(drama);
    window.location.href = `/watch/${drama.slug}`;
  }, [addToHistory]);

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
    window.history.pushState({}, '', `/browse?category=${slug}`);
  };

  const sortOptions = [
    { id: 'trending', label: 'الأكثر مشاهدة', icon: TrendingUp },
    { id: 'latest', label: 'أحدث الإضافات', icon: Clock },
    { id: 'rating', label: 'الأعلى تقييماً', icon: Star },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const selectedCount = filteredDramas.length;
  const selectedCatName = selectedCategory
    ? categories.find((c) => c.slug === selectedCategory)?.name
    : 'جميع المسلسلات';

  return (
    <Layout categories={categories} activeCategory={selectedCategory || ''} onCategoryClick={handleCategoryClick}>
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-lg font-bold text-white mb-4 text-right" dir="rtl">
          {selectedCatName}
        </h1>

        {/* Sort Buttons */}
        <div className="flex gap-2 mb-4 justify-end">
          <div className="flex bg-deep-purple rounded-lg p-1 border border-gold/10">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = sortBy === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id as typeof sortBy)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs transition-all touch-target ${
                    isActive
                      ? 'bg-gradient-gold text-midnight font-bold'
                      : 'text-gray-400 active:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span dir="rtl">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Grid */}
        {filteredDramas.length === 0 ? (
          <div className="text-center py-12 bg-deep-purple rounded-xl border border-gold/10">
            <p className="text-gray-400 text-sm" dir="rtl">
              لا توجد مسلسلات في هذا القسم
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-xs mb-3 text-right" dir="rtl">
              {selectedCount} مسلسل
            </p>

            <div className="grid grid-cols-3 gap-3 justify-items-end">
              {filteredDramas.map((drama) => (
                <div
                  key={drama.id}
                  className="cursor-pointer"
                  onClick={() => handleDramaClick(drama)}
                >
                  <DramaCard drama={drama} size="sm" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
