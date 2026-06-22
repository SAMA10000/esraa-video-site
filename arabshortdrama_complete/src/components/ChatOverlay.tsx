import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPublicBotSettings, fetchStoredBotMessage, fetchChatStream, type BotRuntimeConfig, type ChatMessage } from '../lib/chatEngine';
import type { Drama } from '../types';

interface ChatOverlayProps {
  drama: Drama;
  visible: boolean;
}

type LiveBotSettings = BotRuntimeConfig & { feedEnabled: boolean; pollingInterval: number; lastUpdatedAt?: string | null };

const FALLBACK_SETTINGS: LiveBotSettings = {
  knowledgeBase: '',
  targetGame: 'لعبة خفيفة',
  steeringWeight: 10,
  feedEnabled: false,
  pollingInterval: 14,
};

export function ChatOverlay({ drama, visible }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<LiveBotSettings>(FALLBACK_SETTINGS);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const ambientLoadingRef = useRef(false);

  const refreshStream = useCallback(async () => {
    if (!visible) return;
    const stream = await fetchChatStream(drama.id, drama.slug, 40);
    setMessages(stream);
  }, [drama.id, drama.slug, visible]);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const live = await fetchPublicBotSettings();
        if (!cancelled) setSettings(live);
      } catch {
        if (!cancelled) setSettings(FALLBACK_SETTINGS);
      }
    }
    void loadSettings();
    const refresh = window.setInterval(loadSettings, 60000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, [drama.id]);

  useEffect(() => {
    void refreshStream();
    if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    if (visible) streamTimerRef.current = window.setInterval(() => { void refreshStream(); }, 7000);
    return () => { if (streamTimerRef.current) window.clearInterval(streamTimerRef.current); };
  }, [refreshStream, visible]);

  useEffect(() => {
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    if (!visible || !settings.feedEnabled) return;

    function scheduleNext() {
      const baseDelay = Math.max(12, settings.pollingInterval || 14) * 1000;
      const humanJitter = 1.4 + Math.random() * 1.8;
      const delay = Math.round(baseDelay * humanJitter + Math.random() * 2500);
      ambientTimerRef.current = setTimeout(async () => {
        if (!ambientLoadingRef.current) {
          ambientLoadingRef.current = true;
          try {
            const msg = await fetchStoredBotMessage(settings, drama.id, drama.slug);
            if (msg?.text) await refreshStream();
          } finally {
            ambientLoadingRef.current = false;
          }
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => { if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current); };
  }, [visible, settings, drama.id, drama.slug, refreshStream]);

  if (!visible || messages.length === 0) return null;

  const visibleMessages = messages.slice(-8).reverse();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none overflow-hidden">
      <div className="max-h-[30%] overflow-hidden p-3 space-y-1.5">
        {visibleMessages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex items-start gap-1.5 transition-all duration-300 ${index === 0 ? 'opacity-100' : 'opacity-60'}`}
            style={{ animation: index === 0 ? 'slide-up 0.3s ease-out' : undefined }}
          >
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${msg.isBot ? 'bg-gold/80 text-midnight' : 'bg-white/15 text-white'}`}>
              {msg.username.split(' ')[0]}
            </span>
            <p className="text-white text-[11px] drop-shadow-lg flex-1 text-right" dir="rtl">
              {msg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
