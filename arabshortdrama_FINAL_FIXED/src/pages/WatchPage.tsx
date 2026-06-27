import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { VideoCountdown } from '../components/VideoCountdown';
import { OfferModal } from '../components/OfferModal';
import { DramaCard } from '../components/DramaCard';
import { ChatOverlay } from '../components/ChatOverlay';
import { LiveViewingCounter } from '../components/LiveViewingCounter';
import { FomoToast } from '../components/FomoToast';
import { LuckyWheel } from '../components/LuckyWheel';
import { useWatchHistory, useFetchDramas } from '../hooks/useContinueWatching';
import { getDramaDetails } from '../lib/dataApi';
import { trackUnmuteClick, trackModalImpression, trackModalCTAClick, trackSeriesOpen, trackVideoStart, trackVideoComplete } from '../lib/adminState';
import { Play, Eye, Star, Calendar, LayoutGrid, ChevronRight, Volume2, VolumeX, MessageCircleOff, MessageCircle, MessageSquare } from 'lucide-react';
import type { Drama } from '../types';

interface WatchPageProps {
  slug: string;
}

export function WatchPage({ slug }: WatchPageProps) {
  const { dramas } = useFetchDramas();
  const { addToHistory } = useWatchHistory();

  const [drama, setDrama] = useState<Drama | null>(null);
  const [sameCategoryDramas, setSameCategoryDramas] = useState<Drama[]>([]);
  const [trendingDramas, setTrendingDramas] = useState<Drama[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isSticky, setIsSticky] = useState(false);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showChatOverlay, setShowChatOverlay] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [luckyWheelFired, setLuckyWheelFired] = useState(false);
  const [showRelatedFallback, setShowRelatedFallback] = useState(false);
  const [nextRelatedDrama, setNextRelatedDrama] = useState<Drama | null>(null);

  // MySQL-backed first-free access. Cookie/session is server-side; no localStorage gate authority.
  const [isFreeEpisode, setIsFreeEpisode] = useState(true);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const watchTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const hasIncrementedVisit = useRef(false);

// Fetch drama data from MySQL API
useEffect(() => {
  async function fetchDrama() {
    try {
      const data = await getDramaDetails(slug);

      if (data.drama) {
        setDrama(data.drama);
        addToHistory(data.drama);
        setTotalViews((data.drama.view_count || 0) + 1);
        trackSeriesOpen(data.drama.id);
        setSameCategoryDramas(data.sameCategory || []);
        setTrendingDramas(data.trending || []);
        return;
      }

      throw new Error('Drama not found');
    } catch (err) {
      console.error('Error fetching drama from MySQL API:', err);
      if (dramas.length > 0) {
        const fallback = dramas.find((d) => d.slug === slug) || dramas[0];
        setDrama(fallback);
        addToHistory(fallback);
        setSameCategoryDramas(dramas.filter((d) => d.id !== fallback.id).slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  }

  fetchDrama();
}, [slug, addToHistory, dramas]);

  useEffect(() => {
    if (drama?.id) trackVideoStart(drama.id);
  }, [drama?.id]);

  // Update isFreeEpisode from MySQL-backed viewer access when slug changes.
  useEffect(() => {
    let cancelled = false;
    hasIncrementedVisit.current = false;
    setShowRelatedFallback(false);
    setNextRelatedDrama(null);
    async function loadGateState() {
      try {
        const r = await fetch(`/api/public/gate-access.php?action=status&slug=${encodeURIComponent(slug)}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const j = await r.json();
        if (!cancelled && r.ok && j.success) setIsFreeEpisode(Boolean(j.isFreeEpisode));
      } catch {
        if (!cancelled) setIsFreeEpisode(false);
      }
    }
    void loadGateState();
    return () => { cancelled = true; };
  }, [slug]);

  // Scroll detection for sticky player
  useEffect(() => {
    const handleScroll = () => {
      if (playerContainerRef.current) {
        const rect = playerContainerRef.current.getBoundingClientRect();
        setIsSticky(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Countdown timer - only for locked episodes
  useEffect(() => {
    if (isFreeEpisode) return;
    const interval = setInterval(() => {
      if (!videoEnded) {
        watchTimeRef.current += 1;
        if (watchTimeRef.current >= 120) {
          setShowCountdown(true);
          watchTimeRef.current = 0;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [videoEnded, isFreeEpisode]);

  // Lucky wheel after 60s - only for locked episodes
  useEffect(() => {
    if (luckyWheelFired || isFreeEpisode) return;
    const checkInterval = setInterval(() => {
      const elapsed = (Date.now() - sessionStartRef.current) / 1000;
      if (elapsed >= 60) {
        setShowLuckyWheel(true);
        setLuckyWheelFired(true);
        clearInterval(checkInterval);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [luckyWheelFired, isFreeEpisode]);

  // AUTO-NEXT: after a video ends, open another video from the same category when available.
  useEffect(() => {
    if (!videoEnded) return;

    if (isFreeEpisode && !hasIncrementedVisit.current) {
      void fetch('/api/public/gate-access.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'complete', slug }),
      });
      hasIncrementedVisit.current = true;
    }

    if (sameCategoryDramas.length > 0) {
      const randomIndex = Math.floor(Math.random() * sameCategoryDramas.length);
      const nextDrama = sameCategoryDramas[randomIndex];
      if (nextDrama) {
        setNextRelatedDrama(nextDrama);
        setShowRelatedFallback(true);
        return;
      }
    }

    setNextRelatedDrama(null);
    setShowRelatedFallback(true);
  }, [videoEnded, isFreeEpisode, sameCategoryDramas, slug]);

  // Dailymotion video end listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes('dailymotion.com')) {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'video_end') {
            if (drama?.id) trackVideoComplete(drama.id);
            setVideoEnded(true);
          }
        } catch {
          return;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [drama?.id]);

  const handleUnmuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUnmuteOverlay(false);
    setIsMuted(false);
    trackUnmuteClick();
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      if (src.includes('mute=1')) iframeRef.current.src = src.replace('mute=1', 'mute=0');
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = isMuted ? src.replace('mute=1', 'mute=0') : src.replace('mute=0', 'mute=1');
    }
  };



  const handleCountdownComplete = useCallback((action: 'next' | 'replay') => {
    setShowCountdown(false);
    watchTimeRef.current = 0;
    if (action === 'replay') {
      setVideoEnded(false);
      return;
    }
    trackModalImpression();
    setShowOfferModal(true);
  }, []);

  // TRIGGER 1: Clicking other series cards
  const handleDramaClick = (targetDrama: Drama) => {
    addToHistory(targetDrama);
    trackModalImpression();
    setShowOfferModal(true);
  };

  // TRIGGER 3: Chat button
  const handleChatButtonClick = () => {
    trackModalImpression();
    setShowChatInput(true);
  };

  const handleScrollRow = (containerId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(containerId);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? 360 : -360, behavior: 'smooth' });
    }
  };

  const handleLuckyWheelComplete = () => {
    trackModalCTAClick();
    setShowLuckyWheel(false);
    setShowOfferModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!drama) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-white text-xl" dir="rtl">المسلسل غير موجود</p>
        </div>
      </Layout>
    );
  }

  const fillDramasRow1 = sameCategoryDramas.length >= 4 ? sameCategoryDramas : [...sameCategoryDramas, ...trendingDramas].slice(0, 8);
  const fillDramasRow2 = trendingDramas.slice(0, 8);
  const fillDramasRow3 = sameCategoryDramas.length >= 4 ? sameCategoryDramas : [...sameCategoryDramas, ...dramas].slice(0, 8);

  // FREE EPISODE: controls=1 (native Dailymotion fullscreen button works)
  // LOCKED EPISODE: controls=0 (user must complete CPA)
  const playerControlsParam = isFreeEpisode ? 'controls=1' : 'controls=0';

  return (
    <Layout>
      {/* Main Video Player Container */}
      <div
        ref={playerContainerRef}
        className={`relative w-full bg-midnight flex flex-col items-center ${isSticky ? 'h-0 overflow-hidden' : ''}`}
      >
        {/* Live Viewing Counter */}
        <div className="py-2 flex justify-center">
          <LiveViewingCounter />
        </div>

        {/* ============================================================
            COMPACT VIDEO PLAYER CARD
            - Constrained responsive height (250px max on mobile)
            - Centered in viewport
            - NO full-bleed expanding hooks
            - Vertical 9:16 aspect ratio maintained
            ============================================================ */}
        <div
          className={`relative bg-deep-purple overflow-hidden shadow-2xl shadow-gold/10 rounded-xl border border-gold/10 ${
            isSticky ? 'hidden' : ''
          }`}
          style={{
            width: '85%',
            maxWidth: '280px',
            height: 'auto',
            maxHeight: '250px',
            aspectRatio: '9 / 16',
          }}
        >
          <div className="w-full h-full relative">
            {/* Dailymotion Embed */}
            <iframe
              ref={iframeRef}
              src={`https://www.dailymotion.com/embed/video/${drama.video_id}?autoplay=1&mute=1&ui-logo=0&${playerControlsParam}&api=postMessage`}
              className="w-full h-full"
              style={{ borderRadius: '0.75rem' }}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={drama.title}
            />

            {/* LOCK OVERLAY - Only on LOCKED episodes (not free) */}
            {!isFreeEpisode && (
              <div
                className="absolute inset-0 z-20 cursor-pointer rounded-xl"
                onClick={() => { trackModalImpression(); setShowOfferModal(true); }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-midnight/60 backdrop-blur-sm border border-gold/30 flex items-center justify-center">
                    <Play size={24} className="text-gold" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                  <span className="text-white/70 text-[11px] font-medium bg-midnight/50 px-3 py-1 rounded-full" dir="rtl">
                    اضغط للمشاهدة بجودة عالية والدردشة الحية
                  </span>
                </div>
              </div>
            )}

            

            {/* Mute Toggle - Top Left */}
            {!showUnmuteOverlay && (
              <button
                onClick={(e) => { e.stopPropagation(); handleMuteToggle(e); }}
                className="absolute top-3 left-3 z-30 w-10 h-10 rounded-full bg-midnight/70 backdrop-blur-sm border border-gold/20 flex items-center justify-center text-gold touch-target"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}

            {/* Unmute Banner */}
            {showUnmuteOverlay && (
              <div className="absolute top-0 left-0 right-0 z-30 p-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnmuteClick(e); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-midnight/80 backdrop-blur-sm border border-gold/30 text-gold font-bold text-xs touch-target"
                >
                  <Volume2 size={14} />
                  <span dir="rtl">اضغط لتشغيل الصوت</span>
                </button>
              </div>
            )}

            }

            {/* Gradient at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-midnight to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* Video title */}
        <div className="w-full max-w-md mx-auto px-4 py-2 text-center">
          <p className="text-white font-bold text-sm" dir="rtl">{drama.title}</p>
          <p className="text-gray-500 text-[10px]" dir="rtl">{drama.category?.name} - {drama.episodes_count} حلقة</p>
        </div>
      </div>

      {/* Sticky Mini Player */}
      {isSticky && (
        <div className="fixed bottom-[72px] left-3 z-40">
          <div
            className="relative vertical-player-mini rounded-xl overflow-hidden shadow-2xl shadow-gold/20 bg-deep-purple border border-gold/30 animate-scale-in cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <iframe
              src={`https://www.dailymotion.com/embed/video/${drama.video_id}?autoplay=1&mute=1&ui-logo=0&controls=0`}
              className="w-full h-full pointer-events-none"
              frameBorder="0"
              allow="autoplay"
              title={drama.title}
            />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/30">
                <Play size={16} fill="#0a0a14" className="text-midnight ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-midnight to-transparent">
              <p className="text-white text-[8px] font-bold truncate text-center" dir="rtl">{drama.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Action Bar */}
      <div className="max-w-md mx-auto px-4 pt-1">
        <button
          onClick={() => setShowChatOverlay(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-deep-purple border border-gold/20 text-gold font-medium touch-target hover:bg-gold/10 transition-colors"
        >
          <MessageSquare size={18} />
          <span dir="rtl" className="text-sm">شارك في الدردشة الحية مع الزوار الآن</span>
        </button>
      </div>

      {showRelatedFallback && (
        <div className="max-w-md mx-auto px-4 pt-3" dir="rtl">
          <div className="bg-deep-purple border border-gold/20 rounded-xl p-4 text-right">
            <p className="text-gold font-bold text-sm mb-1">تشغيل مقطع مشابه</p>
            <p className="text-gray-400 text-xs mb-3">{nextRelatedDrama ? `تم اختيار مقطع مشابه من نفس القسم: ${nextRelatedDrama.title}` : 'لا توجد مقاطع أخرى كافية في نفس القسم حالياً، اختاري من الترشيحات بالأسفل.'}</p>
            <button
              type="button"
              onClick={() => {
                if (nextRelatedDrama) window.location.href = `/watch/${nextRelatedDrama.slug}`;
                else setShowRelatedFallback(false);
              }}
              className="px-4 py-2 rounded-lg bg-gradient-gold text-midnight font-bold text-xs"
            >
              {nextRelatedDrama ? 'تشغيل مقطع مشابه' : 'عرض الترشيحات'}
            </button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="max-w-md mx-auto px-4 py-5">
        <div className="text-right mb-5" dir="rtl">
          <div className="flex items-center gap-2 mb-2 justify-end flex-wrap">
            <span className="px-2 py-0.5 bg-orange text-white text-[10px] font-bold rounded">HD</span>
            <span className="px-2 py-0.5 bg-deep-purple text-gold text-[10px] font-medium rounded border border-gold/30">
              {drama.category?.name || 'مسلسل'}
            </span>
            {/* REMOVED: "الحلقة الأولى مجانية" label - operational stealth */}
          </div>

          <h1 className="text-lg font-black text-white mb-2">{drama.title}</h1>

          <div className="flex flex-wrap gap-2 mb-3 justify-end text-xs">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-gold fill-gold" />
              <span className="text-gold font-bold">{drama.rating.toFixed(1)}</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} className="text-gray-400" />
              <span className="text-gray-400">{totalViews.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-gray-400" />
              <span className="text-gray-400">{drama.year}</span>
            </span>
            <span className="flex items-center gap-1">
              <LayoutGrid size={12} className="text-gray-400" />
              <span className="text-gray-400">{drama.episodes_count} حلقة</span>
            </span>
          </div>

          <p className="text-gray-300 text-xs leading-relaxed mb-4">{drama.description}</p>

          {/* CTA Button - NO visible lock status indicator */}
          <button
            type="button"
            aria-label="شاهد الحلقات كاملة"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              trackModalImpression();
              setShowOfferModal(true);
            }}
            className="relative z-30 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold touch-target bg-gradient-gold text-midnight animate-pulse-gold cursor-pointer pointer-events-auto select-none active:scale-[0.98]"
            style={{ pointerEvents: 'auto' }}
          >
            <Play size={18} fill="currentColor" className="pointer-events-none" />
            <span className="pointer-events-none">شاهد الحلقات كاملة</span>
          </button>
        </div>

        {/* Related Rows */}
        <div className="space-y-5 mb-6" style={{ paddingBottom: isSticky ? '200px' : '80px' }}>
          <section>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleScrollRow('row1', 'right')} className="touch-target w-10 h-10 flex items-center justify-center text-gold">
                <ChevronRight size={22} />
              </button>
              <h3 className="text-sm font-bold text-orange">الأكثر مشاهدة في هذا القسم</h3>
            </div>
            <div id="row1" className="horizontal-scroll">
              {fillDramasRow1.map((d) => (
                <div key={d.id + '-r1'} onClick={() => handleDramaClick(d)} className="cursor-pointer">
                  <DramaCard drama={d} size="sm" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleScrollRow('row2', 'right')} className="touch-target w-10 h-10 flex items-center justify-center text-gold">
                <ChevronRight size={22} />
              </button>
              <h3 className="text-sm font-bold text-gold">أحدث الإضافات</h3>
            </div>
            <div id="row2" className="horizontal-scroll">
              {fillDramasRow2.map((d) => (
                <div key={d.id + '-r2'} onClick={() => handleDramaClick(d)} className="cursor-pointer">
                  <DramaCard drama={d} size="sm" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleScrollRow('row3', 'right')} className="touch-target w-10 h-10 flex items-center justify-center text-gray-400">
                <ChevronRight size={22} />
              </button>
              <h3 className="text-sm font-bold text-white">مسلسلات مشابهة</h3>
            </div>
            <div id="row3" className="horizontal-scroll">
              {fillDramasRow3.map((d) => (
                <div key={d.id + '-r3'} onClick={() => handleDramaClick(d)} className="cursor-pointer">
                  <DramaCard drama={d} size="sm" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Video Countdown - Only for locked episodes */}
      {!isFreeEpisode && (
        <VideoCountdown
          show={showCountdown}
          onComplete={handleCountdownComplete}
          hasNextVideo={sameCategoryDramas.length > 0}
        />
      )}

      {/* Offer Modal */}
      <OfferModal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} />

      {/* Chat Panel - Side Panel */}
      {drama && <ChatOverlay drama={drama} visible={showChatOverlay} onClose={() => setShowChatOverlay(false)} />}

      {/* FOMO Toasts */}
      <FomoToast />

      {/* Lucky Wheel - Only for locked episodes */}
      {!isFreeEpisode && (
        <LuckyWheel
          isOpen={showLuckyWheel}
          onClose={() => setShowLuckyWheel(false)}
          onComplete={handleLuckyWheelComplete}
        />
      )}
    </Layout>
  );
}
