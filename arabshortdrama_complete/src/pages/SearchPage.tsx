import { useState, useEffect, useCallback } from 'react';
import { getCategories, getDramas, searchDramas } from '../lib/dataApi';
import { Layout } from '../components/Layout';
import { DramaCard } from '../components/DramaCard';
import { useWatchHistory } from '../hooks/useContinueWatching';
import { Search, X, TrendingUp, Clock } from 'lucide-react';
import type { Drama, Category } from '../types';

interface SearchPageProps {
  initialQuery?: string;
}

export function SearchPage({ initialQuery = '' }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Drama[]>([]);
  const [suggestions, setSuggestions] = useState<Drama[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trending, setTrending] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { addToHistory } = useWatchHistory();

  useEffect(() => {
async function fetchInitial() {
  const [allDramas, allCategories] = await Promise.all([
    getDramas(),
    getCategories(),
  ]);
  setTrending((allDramas || []).slice(0, 6));
  setCategories(allCategories || []);
}

fetchInitial();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchDramas(searchQuery);
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= 2) {
      const data = await searchDramas(value);
      setSuggestions((data || []).slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (drama: Drama) => {
    setQuery(drama.title);
    setShowSuggestions(false);
    setResults([drama]);
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(drama.title)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    performSearch(query);
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
  };

  const handleDramaClick = useCallback((drama: Drama) => {
    addToHistory(drama);
    window.location.href = `/watch/${drama.slug}`;
  }, [addToHistory]);

  const handleCategoryClick = (categorySlug: string) => {
    window.location.href = `/browse?category=${categorySlug}`;
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search Input */}
        <div className="relative mb-4">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="ابحث عن مسلسل..."
                className="w-full bg-deep-purple border border-gold/20 rounded-xl px-4 py-3.5 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50"
                dir="rtl"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold touch-target"
              >
                <X size={18} />
              </button>
              <button
                type="submit"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gold touch-target"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-deep-purple border border-gold/20 rounded-xl shadow-2xl z-50 overflow-hidden">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-midnight active:bg-midnight transition-colors text-right cursor-pointer border-b border-gold/5 last:border-b-0"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm" dir="rtl">{suggestion.title}</p>
                    <p className="text-gray-500 text-xs" dir="rtl">{suggestion.category?.name}</p>
                  </div>
                  <img
                    src={suggestion.thumbnail_url}
                    alt={suggestion.title}
                    className="w-8 h-14 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200&h=356&fit=crop';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-10 bg-deep-purple rounded-xl border border-gold/10">
            <p className="text-gray-400 text-sm" dir="rtl">
              لم يتم العثور على نتائج
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && query && results.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-3 text-right" dir="rtl">
              {results.length} نتيجة
            </p>
            <div className="grid grid-cols-3 gap-3 justify-items-end">
              {results.map((drama) => (
                <div
                  key={drama.id}
                  className="cursor-pointer"
                  onClick={() => handleDramaClick(drama)}
                >
                  <DramaCard drama={drama} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default Content */}
        {!query && (
          <div>
            {/* Trending */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 justify-end" dir="rtl">
                <TrendingUp size={16} className="text-orange" />
                <h2 className="text-sm font-bold text-white">الأكثر مشاهدة</h2>
              </div>
              <div className="horizontal-scroll">
                {trending.map((drama) => (
                  <div
                    key={drama.id}
                    className="cursor-pointer"
                    onClick={() => handleDramaClick(drama)}
                  >
                    <DramaCard drama={drama} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3 justify-end" dir="rtl">
                <Clock size={16} className="text-gold" />
                <h2 className="text-sm font-bold text-white">تصفح حسب القسم</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.slug)}
                    className="bg-deep-purple border border-gold/10 rounded-xl p-3 text-white font-medium active:bg-gold/10 active:border-gold/30 transition-all text-right text-sm touch-target"
                    dir="rtl"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
