import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, MessageCircle, User, Lock } from 'lucide-react';
import { fetchChatStream, longPollChatStream, fetchBotReply, submitChatMessage, type ChatMessage } from '../lib/chatEngine';
import type { Drama } from '../types';

interface ChatPanelProps {
  drama: Drama;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ drama, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState('');
  const [waitingForReply, setWaitingForReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshMessages = useCallback(async () => {
    const stream = await fetchChatStream(drama.id, drama.slug, 40);
    setMessages(stream);
  }, [drama.id, drama.slug]);

  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;

    async function pollLoop() {
      while (isActive) {
        try {
          const lastId = messages.length > 0 ? messages[messages.length - 1].dbId ?? null : null;
          const newMessages = await longPollChatStream(lastId, dramaId, dramaSlug);
          if (newMessages.length > 0 && isActive) {
            setMessages(prev => [...prev, ...newMessages]);
          }
        } catch (e) {
          // Connection error, wait 5 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    // Initial load
    refreshMessages();

    // Start long polling
    pollLoop();

    return () => { isActive = false; };
  }, [isOpen, refreshMessages, dramaId, dramaSlug, messages]);

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

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !confirmedName || waitingForReply) return;
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
      // Fetch bot replies
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div 
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#0a0a1a] border-l border-gold/20 shadow-2xl z-50 flex flex-col"
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gold/10 bg-gradient-to-r from-[#0a0a1a] to-[#1a1a2e]">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-gold" />
            <span className="text-gold font-bold text-lg">الدردشة الحية</span>
            <span className="text-xs text-green-400 flex items-center gap-1 bg-green-400/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              متصل
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Name Gate */}
        {!confirmedName ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-5">
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
              <User size={40} className="text-gold/70" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-xl mb-1">انضم للدردشة</h3>
              <p className="text-gray-400 text-sm">اكتب اسمك وشارك رأيك</p>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <input
                type="text"
                value={tempName}
                onChange={(e) => { setTempName(e.target.value); setNameError(''); }}
                placeholder="اكتب اسمك الظاهر في الشات"
                className="w-full bg-[#1a1a2e] border border-gold/20 rounded-xl px-4 py-3.5 text-white text-center placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all"
                dir="rtl"
                onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              />
              {nameError && <p className="text-red-400 text-sm text-center">{nameError}</p>}
              <button
                onClick={confirmName}
                className="w-full bg-gradient-to-r from-gold to-orange-500 text-[#0a0a1a] font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-gold/20 transition-all"
              >
                دخول الدردشة
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <MessageCircle size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">ابدأ أول رسالة...</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    false 
                      ? 'bg-gold/15 border border-gold/20 text-gold' 
                      : msg.isMine 
                        ? 'bg-gradient-to-r from-gold to-orange-500 text-[#0a0a1a] font-medium' 
                        : 'bg-[#1a1a2e] border border-white/5 text-white'
                  }`}>
                    <div className="text-[10px] opacity-70 mb-1 flex items-center gap-1">
                      {false && <span className="w-1.5 h-1.5 bg-gold rounded-full" />}
                      {msg.username}
                      
                    </div>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
              {waitingForReply && (
                <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse px-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                  <span>يكتب...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gold/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="اكتب تعليقك..."
                    className="w-full bg-[#1a1a2e] border border-gold/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all"
                    dir="rtl"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || waitingForReply}
                  className="bg-gradient-to-r from-gold to-orange-500 text-[#0a0a1a] p-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-gold/20 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-gray-500">تكتب كـ {confirmedName}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
