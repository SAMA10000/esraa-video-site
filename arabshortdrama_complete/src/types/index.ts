export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Drama {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  video_id: string;
  category_id: string;
  view_count: number;
  rating: number;
  year: number;
  episodes_count: number;
  status?: 'draft' | 'published' | 'archived' | string;
  featured?: boolean;
  sort_order?: number;
  created_at: string;
  category?: Category;
}

export interface Episode {
  id: string;
  drama_id: string;
  episode_number: number;
  title: string;
  video_id: string;
  duration: number;
  created_at: string;
}

export interface WatchHistoryItem {
  id: string;
  title: string;
  thumbnail_url: string;
  slug: string;
  watchedAt: number;
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: Date;
}
