import { Home, TrendingUp, Grid3x3, Search } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home, href: '/' },
    { id: 'trending', label: 'الرائج', icon: TrendingUp, href: '/browse?category=trending' },
    { id: 'categories', label: 'الأقسام', icon: Grid3x3, href: '/browse' },
    { id: 'search', label: 'البحث', icon: Search, href: '/search' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[99999] border-t border-gold/20 pb-safe"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        background: 'rgba(15, 15, 15, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <a
              key={tab.id}
              href={tab.href}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(tab.id);
                window.location.href = tab.href;
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-lg transition-all"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-gold/10' : ''
              }`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-gold' : 'text-gray-500'} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gold' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
