import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  categories?: { name: string; slug: string }[];
  activeCategory?: string;
  onCategoryClick?: (slug: string) => void;
}

export function Layout({
  children,
  categories,
  activeCategory,
  onCategoryClick,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-midnight">
      <Header
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={onCategoryClick}
      />
      <main className="mobile-bottom-safe">
        {children}
      </main>
    </div>
  );
}
