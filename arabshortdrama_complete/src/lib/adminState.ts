export interface AdminConfig {
  knowledgeBase: string;
  targetGame: string;
  steeringWeight: number; // 0-100
  unmuteClicks: number;
  modalImpressions: number;
  modalCTAClicks: number;
  chatGatePassed: number;
}

const STORAGE_KEY = 'arabshortdrama_admin_ui_stats';

const DEFAULT_CONFIG: AdminConfig = {
  knowledgeBase: '',
  targetGame: 'لعبة ببجي الجديدة',
  steeringWeight: 15,
  unmuteClicks: 0,
  modalImpressions: 0,
  modalCTAClicks: 0,
  chatGatePassed: 0,
};

function trackBackendEvent(eventType: string, entityType?: string, entityId?: string) {
  try {
    const payload = JSON.stringify({
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      source: new URLSearchParams(window.location.search).get('source') || document.referrer || 'direct',
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/public/analytics.php', blob);
      return;
    }
    void fetch('/api/public/analytics.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: payload,
      keepalive: true,
    });
  } catch {
    // لا نكسر تجربة الزائر بسبب التحليلات.
  }
}

export function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
  return { ...DEFAULT_CONFIG };
}

export function saveAdminConfig(config: AdminConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function trackPageOpen() {
  trackBackendEvent('page_open');
}

export function trackSeriesOpen(seriesId?: string) {
  trackBackendEvent('series_open', 'dramas', seriesId);
}

export function trackVideoStart(seriesId?: string) {
  trackBackendEvent('video_start', 'dramas', seriesId);
}

export function trackVideoComplete(seriesId?: string) {
  trackBackendEvent('video_complete', 'dramas', seriesId);
}

export function trackUnmuteClick() {
  const config = loadAdminConfig();
  config.unmuteClicks += 1;
  saveAdminConfig(config);
  trackBackendEvent('unmute_click');
}

export function trackModalImpression() {
  const config = loadAdminConfig();
  config.modalImpressions += 1;
  saveAdminConfig(config);
  trackBackendEvent('locker_impression');
}

export function trackModalCTAClick() {
  const config = loadAdminConfig();
  config.modalCTAClicks += 1;
  saveAdminConfig(config);
  trackBackendEvent('cta_click');
}

export function trackChatGatePassed() {
  const config = loadAdminConfig();
  config.chatGatePassed += 1;
  saveAdminConfig(config);
  trackBackendEvent('chat_gate_passed');
}
