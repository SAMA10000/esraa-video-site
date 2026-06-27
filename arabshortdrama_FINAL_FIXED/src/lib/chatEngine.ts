// Unified Chat Engine — Backend-Only Bot Generation
// All bot messages MUST come from PHP/MySQL. No local generation.

export const BOT_USERNAMES: string[] = [
  'يوسف_99', 'ملكة_الشات', 'كينج_الدراما', 'دكتورة_نور', 'برنس_المصري',
  'بنوتة_كول', 'سوليفان_الأسطوري', 'ست_الكل', 'فنان_العرب',
];

type Domain = 'episode_links' | 'drama_content' | 'games_apps' | 'trust_security' | 'general_chat';

export interface BotRuntimeConfig {
  knowledgeBase: string;
  targetGame: string;
  steeringWeight: number;
}

export const DEFAULT_BOT_RUNTIME_CONFIG: BotRuntimeConfig = {
  knowledgeBase: '',
  targetGame: 'لعبة خفيفة',
  steeringWeight: 15,
};

let runtimeBotConfig: BotRuntimeConfig = { ...DEFAULT_BOT_RUNTIME_CONFIG };

export function setRuntimeBotConfig(config: Partial<BotRuntimeConfig>) {
  runtimeBotConfig = {
    knowledgeBase: config.knowledgeBase ?? DEFAULT_BOT_RUNTIME_CONFIG.knowledgeBase,
    targetGame: config.targetGame ?? DEFAULT_BOT_RUNTIME_CONFIG.targetGame,
    steeringWeight: Math.max(0, Math.min(100, Number(config.steeringWeight ?? DEFAULT_BOT_RUNTIME_CONFIG.steeringWeight))),
  };
}

export async function fetchPublicBotSettings(): Promise<BotRuntimeConfig & { feedEnabled: boolean; pollingInterval: number; reservedNames?: string[]; lastUpdatedAt?: string | null; timeContext?: Record<string, unknown>; brain?: Record<string, unknown> }> {
  const response = await fetch('/api/public/bot-settings.php?ts=' + Date.now(), { headers: { Accept: 'application/json' }, credentials: 'include' });
  const json = await response.json();
  const data = json?.data || json || {};
  const config = {
    knowledgeBase: String(data.knowledgeBase || ''),
    targetGame: String(data.targetGame || DEFAULT_BOT_RUNTIME_CONFIG.targetGame),
    steeringWeight: Math.max(0, Math.min(100, Number(data.steeringWeight ?? DEFAULT_BOT_RUNTIME_CONFIG.steeringWeight))),
    feedEnabled: data.feedEnabled !== false,
    pollingInterval: Math.max(5, Math.min(60, Number(data.pollingInterval || 10))),
    reservedNames: Array.isArray(data.reservedNames) ? data.reservedNames : undefined,
    lastUpdatedAt: data.lastUpdatedAt || null,
    timeContext: data.timeContext || undefined,
    brain: data.brain || undefined,
  };
  setRuntimeBotConfig(config);
  return config;
}

export interface ChatMessage {
  id: string;
  dbId?: number;
  username: string;
  text: string;
  isBot: boolean;
  isMine?: boolean;
  domain?: Domain;
  timestamp: number;
  humanDelay?: number;
  profile?: { id?: number | null; persona?: string; speechStyle?: string };
  timeContext?: Record<string, unknown>;
  memoryUsed?: number;
  replyToMessageId?: number | null;
  dramaId?: number | null;
}

type ServerChatMessage = Record<string, unknown>;

function stringValue(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function numberValue(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function mapServerChatMessage(raw: ServerChatMessage): ChatMessage {
  const createdAt = stringValue(raw.created_at);
  return {
    id: stringValue(raw.id, `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    dbId: numberValue(raw.dbId),
    username: stringValue(raw.username, 'زائر الدراما'),
    text: stringValue(raw.text ?? raw.message),
    isBot: Boolean(raw.isBot ?? raw.is_bot),
    isMine: Boolean(raw.isMine),
    domain: raw.domain as Domain | undefined,
    timestamp: numberValue(raw.timestamp) ?? (createdAt ? new Date(createdAt).getTime() : Date.now()),
    humanDelay: numberValue(raw.humanDelay),
    profile: raw.profile as ChatMessage['profile'] | undefined,
    timeContext: raw.timeContext as Record<string, unknown> | undefined,
    memoryUsed: numberValue(raw.memoryUsed),
    replyToMessageId: numberValue(raw.replyToMessageId ?? raw.reply_to_message_id) ?? null,
    dramaId: numberValue(raw.dramaId ?? raw.drama_id) ?? null,
  };
}

export async function fetchChatStream(dramaId?: string | number, dramaSlug?: string, limit = 40): Promise<ChatMessage[]> {
  const qs = new URLSearchParams();
  if (dramaId) qs.set('drama_id', String(dramaId));
  if (dramaSlug) qs.set('drama_slug', dramaSlug);
  qs.set('limit', String(limit));
  qs.set('ts', String(Date.now()));
  const response = await fetch(`/api/chat/stream.php?${qs.toString()}`, { credentials: 'include', headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) return [];
  return Array.isArray(data?.messages) ? data.messages.map((item: unknown) => mapServerChatMessage(item as ServerChatMessage)).filter((m: ChatMessage) => m.text) : [];
}

// Long Polling: Server waits up to 25 seconds for new messages before responding
export async function longPollChatStream(
  lastMessageId: number | null = null,
  dramaId?: string | number,
  dramaSlug?: string
): Promise<ChatMessage[]> {
  const qs = new URLSearchParams();
  if (lastMessageId) qs.set('last_id', String(lastMessageId));
  if (dramaId) qs.set('drama_id', String(dramaId));
  if (dramaSlug) qs.set('drama_slug', dramaSlug);
  qs.set('long_poll', '1');
  qs.set('ts', String(Date.now()));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second max wait

    const response = await fetch(`/api/chat/stream.php?${qs.toString()}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) return [];
    return Array.isArray(data?.messages) ? data.messages.map((item: unknown) => mapServerChatMessage(item as ServerChatMessage)).filter((m: ChatMessage) => m.text) : [];
  } catch (e) {
    // Timeout or abort - return empty and retry
    return [];
  }
}

export async function submitChatMessage(payload: { username: string; message: string; sessionId: string; dramaId?: string | number; dramaSlug?: string }): Promise<ChatMessage | null> {
  const response = await fetch('/api/chat/message.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: payload.username, message: payload.message, sessionId: payload.sessionId, drama_id: payload.dramaId || null, drama_slug: payload.dramaSlug || null }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false || !data?.message) {
    throw new Error(String(data?.error || 'تعذر نشر الرسالة'));
  }
  return mapServerChatMessage(data.message as ServerChatMessage);
}

export async function fetchBotReply(payload: { userText: string; replyToMessageId?: number; dramaId?: string | number; dramaSlug?: string }): Promise<ChatMessage[]> {
  const response = await fetch('/api/chat/bot-reply.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ user_text: payload.userText, reply_to_message_id: payload.replyToMessageId || null, drama_id: payload.dramaId || null, drama_slug: payload.dramaSlug || null }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) return [];
  return Array.isArray(data?.messages) ? data.messages.map((item: unknown) => mapServerChatMessage(item as ServerChatMessage)).filter((m: ChatMessage) => m.text) : [];
}

export async function fetchStoredBotMessage(config: BotRuntimeConfig = runtimeBotConfig, dramaId?: string | number, dramaSlug?: string, userText?: string): Promise<ChatMessage | null> {
  try {
    const response = await fetch('/api/public/bot-message.php', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ drama_id: dramaId || null, drama_slug: dramaSlug || null, user_text: userText || '', client_steering_weight: config.steeringWeight }),
    });
    const data = await response.json();
    if (!response.ok || data?.success === false || !data?.message) return null;
    return mapServerChatMessage(data.message as ServerChatMessage);
  } catch {
    return null;
  }
}

// FOMO messages are NOT chat messages — they are UI notifications.
// They use a separate lightweight pool to avoid mixing with chat bot logic.
export function generateFomoMessage(): string {
  const users = ['أحمد', 'سارة', 'محمد', 'نور', 'كريم', 'فاطمة', 'عمر', 'هدى', 'يوسف', 'ليلى'];
  const user = users[Math.floor(Math.random() * users.length)] + '_' + Math.floor(Math.random() * 99);
  const actions = [
    `دخل @${user} لمتابعة مسلسل قصير جديد قبل دقيقة`,
    `فتح @${user} صفحة مسلسل انتقام وصعود الآن`,
    `شاهد @${user} ترشيح من نفس القسم بنجاح`,
    `انضم @${user} للدردشة الحية قبل لحظات`,
    `تابع @${user} حلقة جديدة بدون مغادرة الصفحة`,
    `رجع @${user} يكمل مشاهدة مسلسل قصير`,
    `اختار @${user} مقطع مشابه من نفس التصنيف`,
    `شارك @${user} بتعليق نظيف في الشات`,
    `فتح @${user} صفحة مسلسل رائج الآن`,
    `بدأ @${user} مشاهدة مسلسل جديد من الترشيحات`,
  ];
  return actions[Math.floor(Math.random() * actions.length)];
}
