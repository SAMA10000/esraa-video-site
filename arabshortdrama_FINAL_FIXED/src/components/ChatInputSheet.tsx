import { useState, useEffect, useCallback } from 'react';
import { X, Send, Lock } from 'lucide-react';
import { fetchChatStream, fetchBotReply, submitChatMessage, type ChatMessage } from '../lib/chatEngine';
import { trackModalImpression, trackModalCTAClick, trackChatGatePassed } from '../lib/adminState';
import type { Drama } from '../types';

interface ChatInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  drama: Drama;
}

const CHAT_NAME_KEY = 'arabshortdrama_chat_display_name';
const CHAT_SESSION_KEY = 'arabshortdrama_chat_session_id';

function getChatSessionId(): string {
  let id = sessionStorage.getItem(CHAT_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(CHAT_SESSION_KEY, id);
  }
  return id;
}

function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .toLowerCase();
}

function compactText(input: string): string {
  return normalizeText(input).replace(/[^a-z0-9\u0600-\u06FF+@.]/gi, '');
}

function getMessageViolation(message: string): string | null {
  const normalized = normalizeText(message);
  const compact = compactText(message);
  const digitsOnly = normalized.replace(/\D/g, '');

  if (/01\d{9}/.test(digitsOnly) || /201\d{9}/.test(digitsOnly) || /05\d{8,}/.test(digitsOnly) || /\d{10,}/.test(digitsOnly)) return 'phone_number';
  if (/(https?:\/\/|www\.|\.com|\.net|\.org|hxxp|\[\.\]| dot |دوت)/i.test(normalized) || /(instagram|insta|tiktok|telegram|whatsapp|snapchat|facebook|واتساب|تليجرام)/i.test(compact)) return 'external_link';
  if (/@[a-z0-9_.]{3,}/i.test(normalized)) return 'social_handle';
  if (/(كسم|احا|متناك|شرموط|زب|نيك)/i.test(compact)) return 'profanity';
  if (message.trim().length > 280) return 'spam';
  return null;
}

function validateUsername(name: string): string | null {
  const value = name.trim();
  if (!value) return 'اكتبي اسمك الظاهر في الدردشة أولاً.';
  if (value.length < 2 || value.length > 24) return 'الاسم يجب أن يكون من 2 إلى 24 حرف.';
  if (!/^[\u0600-\u06FFa-zA-Z0-9_ ]+$/.test(value)) return 'الاسم يسمح بحروف عربية/إنجليزية وأرقام ومسافات وشرطة سفلية فقط.';
  const compact = compactText(value);
  if (getMessageViolation(value)) return 'هذا الاسم غير مناسب للدردشة.';
  return null;
}

export function ChatInputSheet({ isOpen, onClose, drama }: ChatInputSheetProps) {
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(CHAT_NAME_KEY) || '');
  const [confirmedName, setConfirmedName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameBackendStatus, setNameBackendStatus] = useState('');
  const [messageWarning, setMessageWarning] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [gateCompleted, setGateCompleted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const refreshMessages = useCallback(async () => {
    if (!isOpen) return;
    const stream = await fetchChatStream(drama.id, drama.slug, 60);
    setMessages(stream);
  }, [drama.id, drama.slug, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void refreshMessages();
    const timer = window.setInterval(() => { void refreshMessages(); }, 6000);
    return () => window.clearInterval(timer);
  }, [isOpen, refreshMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && showGate) trackModalImpression();
  }, [isOpen, showGate]);

  const confirmName = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateUsername(displayName);
    if (error) {
      setNameError(error);
      return;
    }
    const cleanName = displayName.trim();
    setNameLoading(true);
    setNameError('');
    setNameBackendStatus('');

    try {
      const response = await fetch('/api/chat/username.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanName, sessionId: getChatSessionId() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setNameError(data.error || 'لم يتم تأكيد الاسم من الخادم. جربي اسمًا آخر.');
        return;
      }
      localStorage.setItem(CHAT_NAME_KEY, data.username || cleanName);
      setConfirmedName(data.username || cleanName);
      setNameBackendStatus('تم تأكيد الاسم. تقدري تكتبي دلوقتي.');
      void refreshMessages();
    } catch {
      setNameError('تعذر تأكيد الاسم من الباك إند حالياً. لا يمكن فتح إرسال التعليقات قبل تأكيد الاسم.');
    } finally {
      setNameLoading(false);
    }
  };

  const addBotRepliesWithHumanDelay = (replies: ChatMessage[]) => {
    if (replies.length === 0) {
      setWaitingForReply(false);
      return;
    }
    replies.forEach((reply, index) => {
      const delayMs = reply.humanDelay ? Math.min(18000, Math.max(1200, reply.humanDelay * 1000)) : (1800 + index * 4200 + Math.random() * 2200);
      window.setTimeout(() => {
        setMessages((prev) => prev.some((m) => m.id === reply.id) ? prev : [...prev, reply].slice(-60));
        if (index === replies.length - 1) {
          setWaitingForReply(false);
          void refreshMessages();
        }
      }, delayMs);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessageWarning('');

    if (!confirmedName) {
      setNameError('يجب تأكيد اسمك قبل إرسال أي تعليق.');
      return;
    }

    const text = message.trim();
    if (!text) return;

    // CPA GATE: Must complete offer before sending
    if (!gateCompleted) {
      setShowGate(true);
      return;
    }

    const violation = getMessageViolation(text);
    if (violation) {
      setMessageWarning('⚠️ لا يمكن إرسال هذه الرسالة لأنها تحتوي على رقم هاتف أو رابط أو محتوى مخالف. من فضلك عدّل الرسالة قبل الإرسال.');
      return;
    }

    try {
      const userMsg = await submitChatMessage({ username: confirmedName, message: text, sessionId: getChatSessionId(), dramaId: drama.id, dramaSlug: drama.slug });
      if (userMsg) setMessages((prev) => [...prev, userMsg].slice(-60));
      setMessage('');
      setWaitingForReply(true);
      const replies = await fetchBotReply({ userText: text, replyToMessageId: userMsg?.dbId, dramaId: drama.id, dramaSlug: drama.slug });
      addBotRepliesWithHumanDelay(replies);
    } catch (error) {
      setWaitingForReply(false);
      setMessageWarning(error instanceof Error ? error.message : '⚠️ تعذر فحص الرسالة من الباك إند حالياً. لم يتم نشر الرسالة.');
      return;
    }
  };

  const handleCompleteOffer = () => {
    trackModalCTAClick();
    trackChatGatePassed();
    setGateCompleted(true);
    setShowGate(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />

      <div
        className="fixed left-0 right-0 z-50 animate-slide-up bg-deep-purple rounded-t-3xl border-t border-gold/20 shadow-2xl max-h-[78vh] overflow-y-auto"
        style={{ bottom: '64px', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-gray-600" /></div>

        {!showGate ? (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-midnight flex items-center justify-center text-gray-400 hover:text-gold touch-target"><X size={20} /></button>
              <div className="flex items-center gap-2" dir="rtl"><span className="px-1.5 py-0.5 bg-orange text-white text-[9px] font-bold rounded animate-pulse">LIVE</span><h3 className="text-white font-bold text-sm">الدردشة الحية</h3></div>
            </div>

            {!confirmedName && (
              <form onSubmit={confirmName} className="bg-midnight rounded-xl p-4 mb-3 border border-gold/20" dir="rtl">
                <label className="block text-gold font-bold text-sm mb-2">اسمك في الدردشة</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setNameError(''); }}
                  placeholder="اكتب اسمك الظاهر في الشات"
                  className="w-full bg-deep-purple border border-gold/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 text-right text-sm mb-2"
                  autoFocus
                />
                {nameError && <p className="text-red-400 text-xs mb-2">{nameError}</p>}
                {nameBackendStatus && <p className="text-green-400 text-xs mb-2">{nameBackendStatus}</p>}
                <button type="submit" disabled={nameLoading} className="w-full py-3 rounded-xl bg-gradient-gold text-midnight font-bold text-sm disabled:opacity-50">{nameLoading ? 'جاري تأكيد الاسم...' : 'تأكيد الاسم والدخول للدردشة'}</button>
              </form>
            )}

            {confirmedName && (
              <div className="bg-gold/10 border border-gold/20 rounded-lg px-3 py-2 mb-3 text-right" dir="rtl">
                <span className="text-gray-400 text-xs">اسمك في الدردشة: </span><span className="text-gold text-sm font-bold">{confirmedName}</span>
                {!gateCompleted && (
                  <div className="mt-2 p-2 bg-midnight/50 rounded text-[11px] text-gray-300" dir="rtl">
                    🔒 <span className="text-gold">وضع المشاهدة فقط</span> — يمكنك مشاهدة المحادثة لكن لا يمكنك الكتابة. سجّل الدخول للمشاركة.
                  </div>
                )}
              </div>
            )}

            {messages.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2 mb-3 hide-scrollbar" dir="rtl">
                {messages.slice(-40).map((msg) => (
                  <div key={msg.id} className={`p-2 rounded-lg text-sm ${msg.isBot ? 'bg-midnight text-gray-300 text-right' : msg.isMine ? 'bg-gold/20 text-gold text-left' : 'bg-white/10 text-gray-200 text-right'}`}>
                    <span className="block text-[10px] text-gold/70 mb-1">{msg.username}</span>
                    {msg.text}
                  </div>
                ))}
                {waitingForReply && (
                  <div className="flex items-center gap-1 p-2" dir="rtl"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div><span className="text-gray-500 text-xs">يكتب...</span></div>
                )}
              </div>
            )}

            {messageWarning && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 text-red-400 text-xs" dir="rtl">{messageWarning}</div>}

            {!gateCompleted ? (
              <div className="pb-4" dir="rtl">
                <div className="flex items-center gap-2 p-3 bg-midnight/80 border border-gold/10 rounded-xl">
                  <Lock size={16} className="text-gold flex-shrink-0" />
                  <p className="text-gray-400 text-xs">المحادثة مقفولة للمشاهدة فقط. <span className="text-gold">سجّل الدخول</span> للمشاركة في الدردشة.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center gap-2 pb-4">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setMessageWarning(''); }}
                  placeholder={confirmedName ? 'اكتب تعليقك...' : 'أكدي اسمك أولاً قبل كتابة التعليق'}
                  className="flex-1 bg-midnight border border-gold/20 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 text-right text-sm disabled:opacity-50"
                  dir="rtl"
                  disabled={!confirmedName || waitingForReply}
                />
                <button type="submit" disabled={!confirmedName || waitingForReply} className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center text-midnight touch-target flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"><Send size={20} /></button>
              </form>
            )}
          </div>
        ) : null}}
      </div>
    </>
  );
}
