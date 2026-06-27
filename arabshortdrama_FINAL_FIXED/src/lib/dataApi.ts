
import { apiGet } from './apiClient';
import type { Category, Drama } from '../types';

export interface HomeData {
  categories: Category[];
  dramas: Drama[];
  trending: Drama[];
  latest: Drama[];
  hero: Drama[];
}

export interface DramaDetailsData {
  drama: Drama | null;
  sameCategory: Drama[];
  trending: Drama[];
}

export async function getHomeData(): Promise<HomeData> {
  return apiGet<HomeData>('/public/home.php');
}

export async function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>('/public/categories.php');
}

export async function getDramas(): Promise<Drama[]> {
  return apiGet<Drama[]>('/public/dramas.php');
}

export async function getDramaBySlug(slug: string): Promise<Drama | null> {
  const data = await apiGet<DramaDetailsData>(`/public/drama.php?slug=${encodeURIComponent(slug)}`);
  return data.drama;
}

export async function getDramaDetails(slug: string): Promise<DramaDetailsData> {
  return apiGet<DramaDetailsData>(`/public/drama.php?slug=${encodeURIComponent(slug)}`);
}

export async function searchDramas(query: string): Promise<Drama[]> {
  return apiGet<Drama[]>(`/public/search.php?q=${encodeURIComponent(query)}`);
}
