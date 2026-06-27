import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, User, MessageCircle, Lock } from 'lucide-react';
import { fetchChatStream, fetchBotReply, submitChatMessage, type ChatMessage } from '../lib/chatEngine';
import type { Drama } from '../types';

interface ChatOverlayProps {
  drama: Drama;
  visible: boolean;
  onClose: () => void;
}

export function ChatOverlay({ drama, visible, onClose }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState('');
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [showNameGate, setShowNameGate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamTimerRef = useRef<number | null>(null);

  const refreshMessages = useCallback(async () => {
    if (!visible) return;
    const stream = await fetchChatStream(drama.id, drama.slug, 40);
    setMessages(stream);
  }, [drama.id, drama.slug, visible]);

  useEffect(() => {
    if (visible) {
      refreshMessages();
      streamTimerRef.current = window.setInterval(refreshMessages, 5000);
    }
    return () => { if (streamTimerRef.current) window.clearInterval(streamTimerRef.current); };
  }, [visible, refreshMessages]);

  useEffect(() => {
    // Only scroll if user is near bottom (within 100px)
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const validateName = (name: string) => {
    const val = name.trim();
    if (!val) return 'اكتب اسمك';
    if (val.length < 2 || val.length > 24) return 'الاسم من 2 لـ 24 حرف';
    if (!/^[؀-ۿa-zA-Z0-9_ ]+$/.test(val)) return 'حروف عربية/إنجليزية وأرقام فقط';
    return '';
  };

  const confirmName = () => {
    const err = validateName(tempName);
    if (err) { setNameError(err); return; }
    setConfirmedName(tempName.trim());
    setNameError('');
    setShowNameGate(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || waitingForReply) return;

    if (!confirmedName) {
      setShowNameGate(true);
      return;
    }

    setWaitingForReply(true);
    try {
      await submitChatMessage({
        username: confirmedName,
        message: inputText.trim(),
        sessionId: 'sess_' + Date.now(),
        dramaId: drama.id,
        dramaSlug: drama.slug
      });
      setInputText('');
      await refreshMessages();

      const botReplies = await fetchBotReply({
        userText: inputText.trim(),
        dramaId: drama.id,
        dramaSlug: drama.slug
      });
      if (botReplies.length > 0) {
        setMessages(prev => [...prev, ...botReplies]);
      }
    } finally {
      setWaitingForReply(false);
    }
  };

  if (!visible) return null;

  const visibleMessages = messages.slice(-40); // Show more messages, scroll to bottom

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
      {/* Messages area */}
      <div className="max-h-[35vh] overflow-y-auto p-3 space-y-2" style={{ direction: 'rtl' }}>
        {visibleMessages.length === 0 && (
          <div className="text-center py-2">
            <p className="text-white/50 text-[10px]">ابدأ أول رسالة...</p>
          </div>
        )}

        {visibleMessages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex items-start gap-1.5 transition-all duration-500 ${
              index === visibleMessages.length - 1 ? 'opacity-100 animate-slide-up' : 'opacity-70'
            }`}
          >
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
              'bg-white/20 text-white'
            }`}>
              {msg.username.split(' ')[0]}
            </span>
            <p className="text-white text-[11px] drop-shadow-lg flex-1 leading-relaxed" dir="rtl">
              {msg.text}
            </p>
          </div>
        ))}

        {waitingForReply && (
          <div className="flex items-center gap-2 text-[10px] text-white/50 animate-pulse px-2">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <div className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <div className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
            <span>يكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Name Gate Popup */}
      {showNameGate && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40 rounded-t-2xl">
          <div className="bg-[#0a0a1a] border border-gold/20 rounded-2xl p-5 w-[90%] max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gold font-bold">اسمك في الدردشة</h3>
              <button onClick={() => setShowNameGate(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={tempName}
              onChange={(e) => { setTempName(e.target.value); setNameError(''); }}
              placeholder="اكتب اسمك الظاهر"
              className="w-full bg-[#1a1a2e] border border-gold/20 rounded-xl px-4 py-3 text-white text-center placeholder-gray-500 focus:outline-none focus:border-gold/50"
              dir="rtl"
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              autoFocus
            />
            {nameError && <p className="text-red-400 text-xs text-center">{nameError}</p>}
            <button
              onClick={confirmName}
              className="w-full bg-gradient-to-r from-gold to-orange-500 text-[#0a0a1a] font-bold py-3 rounded-xl"
            >
              دخول الدردشة
            </button>
          </div>
        </div>
      )}

      {/* Input Bar - READ ONLY */}
      <div className="p-2 border-t border-gold/10 bg-gradient-to-r from-[#0a0a1a] to-[#1a1a2e]">
        <div className="flex items-center gap-2 p-2 bg-black/40 border border-gold/10 rounded-lg">
          <Lock size={12} className="text-gold flex-shrink-0" />
          <p className="text-gray-400 text-[10px] flex-1" dir="rtl">
            🔒 <span className="text-gold">وضع المشاهدة فقط</span> — يمكنك مشاهدة المحادثة لكن لا يمكنك الكتابة
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
