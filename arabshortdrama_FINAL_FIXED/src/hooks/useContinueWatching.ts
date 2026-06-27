import { useState, useEffect, useCallback } from 'react';
import type { WatchHistoryItem, Drama } from '../types';
import { getCategories, getDramaBySlug, getDramas } from '../lib/dataApi';

const STORAGE_KEY = 'user_watch_history';
const MAX_HISTORY = 4;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch { setHistory([]); }
    }
  }, []);

  const addToHistory = useCallback((drama: Drama) => {
    const newItem: WatchHistoryItem = {
      id: drama.id,
      title: drama.title,
      thumbnail_url: drama.thumbnail_url,
      slug: drama.slug,
      watchedAt: Date.now(),
    };

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== drama.id);
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addToHistory, clearHistory };
}

export function useFetchDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDramas() {
      try {
        const data = await getDramas();
        setDramas(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dramas');
      } finally {
        setLoading(false);
      }
    }
    fetchDramas();
  }, []);

  return { dramas, loading, error };
}

export function useFetchDramaBySlug(slug: string) {
  const [drama, setDrama] = useState<Drama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDrama() {
      if (!slug) return;
      try {
        const data = await getDramaBySlug(slug);
        setDrama(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Drama not found');
      } finally {
        setLoading(false);
      }
    }
    fetchDrama();
  }, [slug]);

  return { drama, loading, error };
}

export function useFetchCategories() {
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryList() {
      try {
        const data = await getCategories();
        setCategories(data || []);
      } finally {
        setLoading(false);
      }
    }
    fetchCategoryList();
  }, []);

  return { categories, loading };
}

export function useFetchDramasByCategory(categorySlug: string) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDramasByCategory() {
      if (!categorySlug) return;
      try {
        const data = await getDramas();
        setDramas((data || []).filter((drama) => drama.category?.slug === categorySlug));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dramas');
      } finally {
        setLoading(false);
      }
    }
    fetchDramasByCategory();
  }, [categorySlug]);

  return { dramas, loading, error };
}
