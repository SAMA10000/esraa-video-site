import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { BrowsePage } from './pages/BrowsePage';
import { SearchPage } from './pages/SearchPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { MobileNav } from './components/MobileNav';
import { trackPageOpen } from './lib/adminState';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [activeNavTab, setActiveNavTab] = useState('home');

  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      const routeParams: Record<string, string> = {};
      params.forEach((value, key) => {
        routeParams[key] = value;
      });

      // ============================================================
      // ADMIN ROUTES: Use /esraa as the only visible admin entry.
      // Legacy admin URLs are normalized immediately so they never remain
      // as independent public login/setup routes.
      // ============================================================
      if (path === '/admin-login' || path === '/login' || path === '/admin-setup' || path === '/setup' || path === '/admin') {
        window.location.replace('/esraa');
        return;
      } else if (path === '/admin-dashboard' || path === '/dashboard') {
        window.location.replace('/esraa/dashboard');
        return;
      } else if (path === '/esraa' || path === '/esraa/') {
        setCurrentPage('admin-login');
        setActiveNavTab('');
      } else if (path === '/esraa/dashboard' || path === '/esraa/dashboard/') {
        setCurrentPage('admin-dashboard');
        setActiveNavTab('');
      }
      // Public routes
      else if (path === '/' || path === '') {
        setCurrentPage('home');
        setActiveNavTab('home');
      } else if (path.startsWith('/watch/')) {
        const slug = path.split('/watch/')[1];
        routeParams.slug = slug;
        setCurrentPage('watch');
        setActiveNavTab('');
      } else if (path.startsWith('/browse')) {
        setCurrentPage('browse');
        if (routeParams.category === 'trending') {
          setActiveNavTab('trending');
        } else {
          setActiveNavTab('categories');
        }
      } else if (path.startsWith('/search')) {
        setCurrentPage('search');
        setActiveNavTab('search');
      } else {
        // Fallback to home
        setCurrentPage('home');
        setActiveNavTab('home');
      }

      setRouteParams(routeParams);
      trackPageOpen();
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'admin-login':
        return <AdminLoginPage />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'home':
        return <HomePage />;
      case 'watch':
        return routeParams.slug ? <WatchPage slug={routeParams.slug} /> : <HomePage />;
      case 'browse':
        return <BrowsePage />;
      case 'search':
        return <SearchPage initialQuery={routeParams.q || ''} />;
      default:
        return <HomePage />;
    }
  };

  // Admin routes have their own full layout, no nav needed
  const showNav = !['admin-login', 'admin-dashboard'].includes(currentPage);

  return (
    <>
      {renderPage()}
      {showNav && <MobileNav activeTab={activeNavTab} onTabChange={setActiveNavTab} />}
    </>
  );
}

export default App;
