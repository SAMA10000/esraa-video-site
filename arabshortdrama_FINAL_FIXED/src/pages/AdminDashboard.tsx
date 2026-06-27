import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi } from '../lib/adminApi';
import { clearPreviewAdminSession, getStorageSecurityAudit } from '../lib/adminAuth';
import type { Category, Drama } from '../types';
import { Activity, BarChart3, Bot, Check, Clock, Edit3, Eye, FileText, Globe, Image, LayoutList, Lock, LogOut, MessageSquare, Save, Shield, Tag, Trash2, TrendingUp, UserCheck, Users, Video } from 'lucide-react';

type Tab = 'overview'|'dramas'|'videos'|'episodes'|'categories'|'posters'|'analytics'|'chat'|'bots'|'unknownTerms'|'admins'|'security'|'audit'|'health'|'settings';
type AdminUser = { id:string; username:string; email?:string|null; role:string; status?:string; last_login_at?:string|null; failed_login_count?:number; locked_until?:string|null };
type ActiveUsername = { username:string; last_seen_at?:string|null; expires_at?:string|null; session_id?:string; visitor_id?:string|null };
type ChatMessageRow = { id:string; username:string; message:string; status?:string; is_bot?:number; created_at:string; visitor_id?:string|null };
type AuditLog = { id:string; action:string; entity_type?:string|null; entity_id?:string|null; created_at:string; username?:string|null };
type HealthCheck = { status:'ok'|'error'|'warning'; label:string; details?:string };
type EpisodeRow = { id:string; drama_id:string; drama_title?:string; episode_number:number; title?:string; video_id:string; duration:number; status:string };
type BotSettings = { knowledgeBase:string; targetGame:string; steeringWeight:number; feedEnabled:boolean; pollingInterval:number; lastUpdatedAt?:string|null };
type BotProfile = { id?:string|number|null; display_name:string; persona:string; speech_style:string; preferred_domains?:string[]|string|null; activity_level:number; memory_weight:number; response_delay_min:number; response_delay_max:number; active?:number|boolean; last_spoke_at?:string|null };
type BotBrain = { contextState:{site_mood?:string; season_override?:string; occasion?:string; bot_directive?:string}; timeContext?:Record<string,string|number|null>; profiles:BotProfile[]; summaries:Array<{conversation_key:string; summary_text:string; dominant_mood:string; message_count:number; last_message_at?:string|null}>; memoryCount:number };
type ChatSettings = { cooldownSeconds:number; rateLimitPerMinute:number; usernameRequired:boolean; frontendWarning:boolean; backendModeration:boolean };
type SiteSettings = { siteTitle:string; siteSubtitle:string; maintenanceMode:boolean; homepageLimit:number; analyticsEnabled:boolean };
type AnalyticsStats = { totalVisits:number; totalSeriesViews:number; totalVideoStarts:number; totalVideoCompletions:number; lockerImpressions:number; ctaClicks:number; conversionRate:number; topSource?:string|null; sourceBreakdown:Array<{source:string; count:number}> };
type DashboardPayload = { categories:Category[]; dramas:Drama[]; episodes:EpisodeRow[]; admins:AdminUser[]; auditLogs:AuditLog[]; activeUsernames:ActiveUsername[]; recentChatMessages:ChatMessageRow[]; botSettings:BotSettings; botBrain?:BotBrain; chatSettings:ChatSettings; analytics:AnalyticsStats; siteSettings:SiteSettings; botAudit?:{ storedMessages:number; botLogRows?:number; note:string } };

const DEFAULT_BOT: BotSettings = { knowledgeBase:'', targetGame:'لعبة ببجي الجديدة', steeringWeight:15, feedEnabled:true, pollingInterval:10 };
const DEFAULT_BRAIN: BotBrain = { contextState:{site_mood:'دراما، تشويق، ترشيحات ذكية، شات آمن', season_override:'auto', occasion:'', bot_directive:'اتكلم كزائر طبيعي متابع للمسلسل. لا تكتب روابط أو أرقام أو وعود وهمية. نوّع الكلام ولا تكرر نفسك.'}, profiles:[], summaries:[], memoryCount:0 };
const emptyBotProfile = (): BotProfile => ({ display_name:'', persona:'زائر متابع للدراما', speech_style:'عامي مصري طبيعي', preferred_domains:['general_chat','drama_content'], activity_level:60, memory_weight:60, response_delay_min:7, response_delay_max:22, active:true });
const DEFAULT_CHAT: ChatSettings = { cooldownSeconds:30, rateLimitPerMinute:6, usernameRequired:true, frontendWarning:true, backendModeration:true };
const DEFAULT_SITE: SiteSettings = { siteTitle:'دراما قصيرة بالعربي', siteSubtitle:'arabshortdrama.cloud', maintenanceMode:false, homepageLimit:24, analyticsEnabled:true };
const DEFAULT_ANALYTICS: AnalyticsStats = { totalVisits:0, totalSeriesViews:0, totalVideoStarts:0, totalVideoCompletions:0, lockerImpressions:0, ctaClicks:0, conversionRate:0, sourceBreakdown:[] };
const emptyDrama = (): Partial<Drama> => ({ title:'', slug:'', description:'', category_id:'', thumbnail_url:'', video_id:'', episodes_count:1, year:new Date().getFullYear(), rating:4.5, view_count:0, status:'published', featured:false, sort_order:0 });
const emptyEpisode = (): Partial<EpisodeRow> => ({ drama_id:'', episode_number:1, title:'', video_id:'', duration:45, status:'published' });


function UnknownTermsPanel() {
  const [terms, setTerms] = useState<Array<{id:number;term:string;context:string;visitor_id?:string;created_at:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [meanings, setMeanings] = useState<Record<number,string>>({});
  const [sentiments, setSentiments] = useState<Record<number,string>>({});

  async function loadTerms() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data.php', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'unknownTerms'})
      });
      const j = await res.json();
      if (j.success) setTerms(j.terms || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function approve(id:number) {
    try {
      await fetch('/api/admin/data.php', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          action:'approveUnknownTerm',
          id,
          meaning: meanings[id] || '',
          sentiment: sentiments[id] || 'neutral'
        })
      });
      loadTerms();
    } catch (e) { console.error(e); }
  }

  async function reject(id:number) {
    try {
      await fetch('/api/admin/data.php', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'rejectUnknownTerm', id})
      });
      loadTerms();
    } catch (e) { console.error(e); }
  }

  useEffect(() => { loadTerms(); }, []);

  if (loading) return <div className="p-4 text-center text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-3">
      {terms.length === 0 && (
        <div className="text-gray-400 text-center py-8">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
          مفيش كلمات غير معروفة حالياً
        </div>
      )}
      {terms.map(t => (
        <div key={t.id} className="bg-midnight rounded-lg p-4 border border-gold/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gold font-bold text-lg">{t.term}</span>
            <span className="text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString('ar-EG')}</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">{t.context}</p>
          <div className="flex gap-2 items-end flex-wrap">
            <input
              type="text"
              placeholder="المعنى..."
              className="flex-1 min-w-[120px] bg-deep-purple border border-gold/20 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
              onChange={e => setMeanings(prev => ({...prev, [t.id]: e.target.value}))}
            />
            <select
              className="bg-deep-purple border border-gold/20 rounded px-2 py-2 text-sm text-white"
              onChange={e => setSentiments(prev => ({...prev, [t.id]: e.target.value}))}
              defaultValue="neutral"
            >
              <option value="neutral">محايد</option>
              <option value="positive">إيجابي</option>
              <option value="negative">سلبي</option>
              <option value="question">سؤال</option>
            </select>
            <button onClick={() => approve(t.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors">موافقة</button>
            <button onClick={() => reject(t.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors">رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setUploadedImage(result);
          setPosterUrl(result);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
        setPosterUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };
const [tab,setTab] = useState<Tab>('overview');
  const [authLoading,setAuthLoading]=useState(true);
  const [isAuthenticated,setIsAuthenticated]=useState(false);
  const [adminUser,setAdminUser]=useState<{username:string;role:string}|null>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  const [categories,setCategories]=useState<Category[]>([]);
  const [dramas,setDramas]=useState<Drama[]>([]);
  const [episodes,setEpisodes]=useState<EpisodeRow[]>([]);
  const [admins,setAdmins]=useState<AdminUser[]>([]);
  const [auditLogs,setAuditLogs]=useState<AuditLog[]>([]);
  const [activeUsernames,setActiveUsernames]=useState<ActiveUsername[]>([]);
  const [recentChatMessages,setRecentChatMessages]=useState<ChatMessageRow[]>([]);
  const [botSettings,setBotSettings]=useState<BotSettings>(DEFAULT_BOT);
  const [botBrain,setBotBrain]=useState<BotBrain>(DEFAULT_BRAIN);
  const [botProfileDraft,setBotProfileDraft]=useState<BotProfile>(emptyBotProfile());
  const [editingBotProfileId,setEditingBotProfileId]=useState<string>('');
  const [chatSettings,setChatSettings]=useState<ChatSettings>(DEFAULT_CHAT);
  const [siteSettings,setSiteSettings]=useState<SiteSettings>(DEFAULT_SITE);
  const [analytics,setAnalytics]=useState<AnalyticsStats>(DEFAULT_ANALYTICS);
  const [healthChecks,setHealthChecks]=useState<Record<string,HealthCheck>>({});
  const [botAudit,setBotAudit]=useState<{storedMessages:number;botLogRows?:number;note:string}|null>(null);

  const [dramaDraft,setDramaDraft]=useState<Partial<Drama>>(emptyDrama());
  const [editingDramaId,setEditingDramaId]=useState<string>('');
  const [episodeDraft,setEpisodeDraft]=useState<Partial<EpisodeRow>>(emptyEpisode());
  const [editingEpisodeId,setEditingEpisodeId]=useState<string>('');
  const [categoryDraft,setCategoryDraft]=useState<Partial<Category & {status:string;sort_order:number}>>({ name:'', slug:'', status:'active', sort_order:0 });
  const [editingCategoryId,setEditingCategoryId]=useState<string>('');

  const [newAdminUsername,setNewAdminUsername]=useState('');
  const [newAdminEmail,setNewAdminEmail]=useState('');
  const [newAdminPassword,setNewAdminPassword]=useState('');
  const [newAdminRole,setNewAdminRole]=useState<'admin'|'super_admin'>('admin');
  const [currentPassword,setCurrentPassword]=useState('');
  const [newUsername,setNewUsername]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [testCountry,setTestCountry]=useState(() => sessionStorage.getItem('admin_test_country') || 'DEFAULT');

  const isSuperAdmin = adminUser?.role === 'super_admin';
  const totalViews = dramas.reduce((sum,d)=>sum + Number(d.view_count || 0),0);
  const topDrama = useMemo(()=>[...dramas].sort((a,b)=>Number(b.view_count||0)-Number(a.view_count||0))[0], [dramas]);
  const storageAudit = getStorageSecurityAudit();

  const tabs:{id:Tab;label:string;icon:ReactNode;superOnly?:boolean}[] = [
    {id:'overview',label:'نظرة عامة',icon:<LayoutList size={18}/>},{id:'dramas',label:'إدارة المسلسلات',icon:<Video size={18}/>},{id:'videos',label:'إدارة الفيديوهات',icon:<Video size={18}/>},{id:'episodes',label:'إدارة الحلقات',icon:<FileText size={18}/>},{id:'categories',label:'التصنيفات',icon:<Tag size={18}/>},{id:'posters',label:'البوسترات والواجهة',icon:<Image size={18}/>},{id:'analytics',label:'التحليلات',icon:<BarChart3 size={18}/>},{id:'chat',label:'الدردشة والمجتمع',icon:<MessageSquare size={18}/>},{id:'bots',label:'إعدادات البوتات',icon:<Bot size={18}/>},{id:'unknownTerms',label:'الكلمات غير المعروفة',icon:<MessageSquare size={18}/>},{id:'admins',label:'إدارة المسؤولين',icon:<UserCheck size={18}/>,superOnly:true},{id:'security',label:'الأمان والجلسات',icon:<Shield size={18}/>},{id:'audit',label:'سجل العمليات',icon:<FileText size={18}/>},{id:'health',label:'صحة النظام',icon:<Activity size={18}/>},{id:'settings',label:'الإعدادات العامة',icon:<Globe size={18}/>,superOnly:true}
  ];

  useEffect(()=>{ void validateSession(); },[]);
  // refreshAll is intentionally stable for this dashboard bootstrapping flow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(isAuthenticated){ void refreshAll(); } },[isAuthenticated]);

  async function validateSession(){
    try{ const r=await fetch('/api/admin/session.php',{credentials:'include'}); const j=await r.json(); if(j.valid){ setIsAuthenticated(true); setAdminUser({username:j.username, role:j.role}); } else window.location.href='/esraa'; }
    catch{ window.location.href='/esraa'; } finally{ setAuthLoading(false); }
  }
  async function refreshAll(){ await Promise.all([refreshDashboardData(), refreshHealth()]); }
  async function refreshDashboardData(){
    setLoading(true); setError('');
    const res = await adminApi<DashboardPayload>('dashboardData');
    setLoading(false);
    if(!res.success || !res.data){ setError(res.error || 'فشل تحميل بيانات MySQL'); return; }
    setCategories(res.data.categories||[]); setDramas(res.data.dramas||[]); setEpisodes(res.data.episodes||[]); setAdmins(res.data.admins||[]); setAuditLogs(res.data.auditLogs||[]); setActiveUsernames(res.data.activeUsernames||[]); setRecentChatMessages(res.data.recentChatMessages||[]); setBotSettings({...DEFAULT_BOT,...res.data.botSettings}); setBotBrain(res.data.botBrain || DEFAULT_BRAIN); setChatSettings({...DEFAULT_CHAT,...res.data.chatSettings}); setSiteSettings({...DEFAULT_SITE,...res.data.siteSettings}); setAnalytics({...DEFAULT_ANALYTICS,...res.data.analytics}); setBotAudit(res.data.botAudit || null);
  }
  async function refreshHealth(){ const res=await adminApi<{checks:Record<string,HealthCheck>}>('health'); if(res.success && res.data?.checks) setHealthChecks(res.data.checks); }
  async function runAction<T=unknown>(action:string,payload:Record<string,unknown>,msg:string, after?:()=>void){
    setError(''); setSuccess(''); setSaving(true); const res=await adminApi<T>(action,payload); setSaving(false);
    if(!res.success){ setError(res.error || 'فشل تنفيذ العملية من MySQL API'); return false; }
    setSuccess(msg); after?.(); await refreshAll(); return true;
  }
  async function logout(){ try{ clearPreviewAdminSession(); await fetch('/api/admin/logout.php',{method:'POST',credentials:'include'}); } finally{ window.location.href='/esraa'; } }
  function validateDm(id:string){ return /^[A-Za-z0-9_-]{3,80}$/.test(id.trim()); }
  function setDraftField<K extends keyof Drama>(key:K,value:Drama[K]){ setDramaDraft(prev=>({...prev,[key]:value})); }
  function fillDrama(d:Drama){ setEditingDramaId(d.id); setDramaDraft({...d}); window.scrollTo({top:0,behavior:'smooth'}); }
  function dramaPayload(){ return { ...dramaDraft, id: editingDramaId || undefined, featured: Boolean(dramaDraft.featured), year:Number(dramaDraft.year||new Date().getFullYear()), rating:Number(dramaDraft.rating||0), view_count:Number(dramaDraft.view_count||0), episodes_count:Number(dramaDraft.episodes_count||0), sort_order:Number(dramaDraft.sort_order||0) }; }
  async function saveDrama(){ if(!dramaDraft.title || !dramaDraft.category_id || !dramaDraft.video_id){ setError('العنوان والقسم ومعرف Dailymotion مطلوبة'); return; } if(!validateDm(String(dramaDraft.video_id))){ setError('معرف Dailymotion غير صالح'); return; } await runAction(editingDramaId?'updateDrama':'createDrama', dramaPayload() as Record<string,unknown>, editingDramaId?'تم تعديل المسلسل في MySQL':'تم إنشاء المسلسل في MySQL', ()=>{ setEditingDramaId(''); setDramaDraft(emptyDrama()); }); }
  async function saveVideo(d:Drama){ const video_id=prompt('Dailymotion video_id فقط', d.video_id || ''); if(video_id===null) return; if(!validateDm(video_id)){ setError('معرف Dailymotion غير صالح'); return; } await runAction('updateVideoId',{id:d.id,video_id},'تم تحديث معرف Dailymotion وتسجيله في السجل'); }
  async function savePoster(d:Drama){ const thumbnail_url=prompt('رابط البوستر', d.thumbnail_url || ''); if(thumbnail_url===null) return; await runAction('updatePoster',{id:d.id,thumbnail_url},'تم تحديث البوستر وتسجيله في السجل'); }
  async function saveEpisode(){ if(!episodeDraft.drama_id || !episodeDraft.video_id){ setError('المسلسل ومعرف فيديو الحلقة مطلوبان'); return; } if(!validateDm(String(episodeDraft.video_id))){ setError('معرف Dailymotion للحلقة غير صالح'); return; } await runAction(editingEpisodeId?'updateEpisode':'createEpisode',{...episodeDraft,id:editingEpisodeId||undefined,episode_number:Number(episodeDraft.episode_number||1),duration:Number(episodeDraft.duration||45)}, editingEpisodeId?'تم تعديل الحلقة':'تم إنشاء الحلقة',()=>{setEditingEpisodeId('');setEpisodeDraft(emptyEpisode());}); }
  function fillEpisode(e:EpisodeRow){ setEditingEpisodeId(e.id); setEpisodeDraft({...e}); }
  async function saveCategory(){ if(!categoryDraft.name){ setError('اسم التصنيف مطلوب'); return; } await runAction(editingCategoryId?'updateCategory':'createCategory',{...categoryDraft,id:editingCategoryId||undefined,sort_order:Number(categoryDraft.sort_order||0)}, editingCategoryId?'تم تعديل التصنيف':'تم إنشاء التصنيف',()=>{setEditingCategoryId('');setCategoryDraft({name:'',slug:'',status:'active',sort_order:0});}); }
  function fillCategory(c:Category & {status?:string;sort_order?:number}){ setEditingCategoryId(c.id); setCategoryDraft({...c,status:c.status||'active',sort_order:c.sort_order||0}); }
  async function saveBotSettings(){ await runAction('saveBotSettings',botSettings as unknown as Record<string,unknown>,'تم حفظ إعدادات البوتات في MySQL وستقرأها واجهة الزائر من /api/public/bot-settings.php'); }
  async function saveBotBrain(){ const c=botBrain.contextState||{}; await runAction('saveBotBrain',{siteMood:c.site_mood||'',seasonOverride:c.season_override||'auto',occasion:c.occasion||'',directive:c.bot_directive||''},'تم حفظ وعي الوقت/الموسم وسياق البوتات في MySQL'); }
  function fillBotProfile(pf:BotProfile){ setEditingBotProfileId(String(pf.id||'')); setBotProfileDraft({...pf, active: Boolean(Number(pf.active ?? 1))}); }
  async function saveBotProfile(){ if(!botProfileDraft.display_name){ setError('اسم البوت مطلوب'); return; } await runAction(editingBotProfileId?'updateBotProfile':'createBotProfile',{...botProfileDraft,id:editingBotProfileId||undefined,active:Boolean(botProfileDraft.active)}, editingBotProfileId?'تم تعديل شخصية البوت':'تم إنشاء شخصية بوت',()=>{ setEditingBotProfileId(''); setBotProfileDraft(emptyBotProfile()); }); }
  async function saveChatSettings(){ await runAction('saveChatSettings',chatSettings as unknown as Record<string,unknown>,'تم حفظ إعدادات الدردشة وتطبيقها من Backend'); }
  async function saveSiteSettings(){ await runAction('saveSiteSettings',siteSettings as unknown as Record<string,unknown>,'تم حفظ إعدادات الموقع'); }
  async function createAdmin(){ if(!newAdminUsername || !newAdminPassword){ setError('اسم المستخدم وكلمة المرور مطلوبان'); return; } await runAction('createAdmin',{username:newAdminUsername,email:newAdminEmail||null,password:newAdminPassword,role:newAdminRole},'تم إنشاء المدير',()=>{setNewAdminUsername('');setNewAdminEmail('');setNewAdminPassword('');setNewAdminRole('admin');}); }
  async function submitPasswordChange(e:React.FormEvent){ e.preventDefault(); setError(''); setSuccess(''); setSaving(true); try{ const r=await fetch('/api/admin/change-password.php',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newUsername,newPassword,confirmPassword})}); const j=await r.json(); if(!r.ok || !j.success){ setError(j.error||'فشل تغيير بيانات الدخول'); } else { setSuccess('تم تغيير بيانات الدخول. سيتم تسجيل الخروج.'); setTimeout(()=>{window.location.href='/esraa';},1400); } } catch { setError('فشل الاتصال بواجهة MySQL API'); } finally{ setSaving(false); } }
  function testCountryChange(v:string){ setTestCountry(v); if(v==='DEFAULT') sessionStorage.removeItem('admin_test_country'); else sessionStorage.setItem('admin_test_country', v); }

  if(authLoading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"/></div>;
  if(!isAuthenticated) return null;
  const visibleTabs=tabs.filter(t=>!t.superOnly || isSuperAdmin);

  return <div className="min-h-screen bg-midnight text-white" dir="rtl">
    <header className="sticky top-0 z-40 bg-deep-purple/95 border-b border-gold/20 px-4 py-4 backdrop-blur-xl"><div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-gradient-gold flex items-center justify-center"><Shield className="text-midnight"/></div><div><h1 className="font-black text-xl text-gradient-gold">لوحة تحكم إسراء</h1><p className="text-gray-400 text-xs">{adminUser?.username} · {adminUser?.role} · PHP + MySQL</p></div></div><button onClick={logout} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl flex items-center gap-2"><LogOut size={16}/>خروج</button></div></header>
    <div className="max-w-7xl mx-auto grid lg:grid-cols-[260px_1fr] gap-5 px-4 py-5">
      <aside className="lg:sticky lg:top-24 h-fit"><nav className="grid grid-cols-2 lg:grid-cols-1 gap-2">{visibleTabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold ${tab===t.id?'bg-gradient-gold text-midnight':'bg-deep-purple border border-gold/10 text-gray-200 hover:text-gold'}`}>{t.icon}<span>{t.label}</span></button>)}</nav></aside>
      <main className="min-w-0 pb-24 space-y-5">
        {error && <Notice type="err">{error}</Notice>}{success && <Notice type="ok">{success}</Notice>}{saving && <Notice type="warn">جاري التنفيذ من MySQL API...</Notice>}{loading && <Notice type="warn">جاري تحميل بيانات MySQL...</Notice>}
        {tab==='overview' && <section className="space-y-5"><Panel title="اختبار الدولة" icon={<Globe size={18}/>}><select value={testCountry} onChange={e=>testCountryChange(e.target.value)} className="input max-w-xs"><option value="DEFAULT">الوضع الطبيعي</option><option value="EG">مصر</option><option value="SA">السعودية</option><option value="AE">الإمارات</option><option value="US">أمريكا</option></select><p className="text-gray-500 text-xs mt-2">تفضيل واجهة فقط، لا يمنح صلاحية.</p></Panel><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Stat icon={<Video/>} label="المسلسلات" value={String(dramas.length)}/><Stat icon={<Tag/>} label="التصنيفات" value={String(categories.length)}/><Stat icon={<Eye/>} label="المشاهدات" value={totalViews.toLocaleString('ar-EG')}/><Stat icon={<MessageSquare/>} label="رسائل الشات" value={String(recentChatMessages.length)}/></div><Panel title="أعلى مسلسل" icon={<TrendingUp/>}>{topDrama?<DramaMini drama={topDrama}/>:<EmptyState/>}</Panel></section>}
        {tab==='dramas' && <section className="space-y-5"><Panel title={editingDramaId?'تعديل مسلسل':'إضافة/تعديل مسلسل'} icon={<Video/>}><DramaForm draft={dramaDraft} setField={setDraftField} categories={categories}/><ActionButton onClick={saveDrama} label={editingDramaId?'حفظ التعديل في MySQL':'إضافة مسلسل في MySQL'}/>{editingDramaId&&<button className="btn" onClick={()=>{setEditingDramaId('');setDramaDraft(emptyDrama());}}>إلغاء التعديل</button>}</Panel><Panel title={`المسلسلات (${dramas.length})`} icon={<LayoutList/>}>{dramas.length===0?<EmptyState/>:<div className="space-y-2">{dramas.map(d=><Row key={d.id}><DramaMini drama={d}/><div className="actions"><button className="btn" onClick={()=>fillDrama(d)}><Edit3 size={14}/>تعديل</button><button className="btn red" onClick={()=>runAction('deleteDrama',{id:d.id},'تم حذف المسلسل')}><Trash2 size={14}/>حذف</button></div></Row>)}</div>}</Panel></section>}
        {tab==='videos' && <Panel title="إدارة الفيديوهات Dailymotion ID فقط" icon={<Video/>}>{dramas.map(d=><Row key={d.id}><span>{d.title}<small className="block text-gray-500" dir="ltr">{d.video_id||'no-id'}</small></span><button className="btn gold" onClick={()=>saveVideo(d)}>تعديل الفيديو</button></Row>)}</Panel>}
        {tab==='posters' && <Panel title="البوسترات والواجهة" icon={<Image/>}>{dramas.map(d=><Row key={d.id}><DramaMini drama={d}/><button className="btn gold" onClick={()=>savePoster(d)}>تعديل البوستر</button></Row>)}</Panel>}
        {tab==='episodes' && <section className="space-y-5"><Panel title={editingEpisodeId?'تعديل حلقة':'إضافة حلقة'} icon={<FileText/>}><div className="grid md:grid-cols-3 gap-3"><Select label="المسلسل" value={episodeDraft.drama_id||''} onChange={v=>setEpisodeDraft(p=>({...p,drama_id:v}))} options={dramas.map(d=>({value:d.id,label:d.title}))}/><Input label="رقم الحلقة" value={String(episodeDraft.episode_number||1)} onChange={v=>setEpisodeDraft(p=>({...p,episode_number:Number(v)||1}))} type="number"/><Input label="عنوان الحلقة" value={episodeDraft.title||''} onChange={v=>setEpisodeDraft(p=>({...p,title:v}))}/><Input label="Dailymotion ID" value={episodeDraft.video_id||''} onChange={v=>setEpisodeDraft(p=>({...p,video_id:v}))}/><Input label="المدة بالثواني" value={String(episodeDraft.duration||45)} onChange={v=>setEpisodeDraft(p=>({...p,duration:Number(v)||45}))} type="number"/><Select label="الحالة" value={episodeDraft.status||'published'} onChange={v=>setEpisodeDraft(p=>({...p,status:v}))} options={[{value:'published',label:'منشورة'},{value:'draft',label:'مسودة'},{value:'archived',label:'مؤرشفة'}]}/></div><ActionButton onClick={saveEpisode} label="حفظ الحلقة في MySQL"/></Panel><Panel title="الحلقات" icon={<FileText/>}>{episodes.length===0?<p className="text-orange text-sm">إدارة الحلقات متاحة الآن لكن لا توجد بيانات كافية بعد.</p>:episodes.map(e=><Row key={e.id}><span>{e.drama_title} · حلقة {e.episode_number}<small className="block text-gray-500" dir="ltr">{e.video_id}</small></span><div className="actions"><button className="btn" onClick={()=>fillEpisode(e)}>تعديل</button><button className="btn red" onClick={()=>runAction('deleteEpisode',{id:e.id},'تم حذف الحلقة')}>حذف</button></div></Row>)}</Panel></section>}
        {tab==='categories' && <section className="space-y-5"><Panel title={editingCategoryId?'تعديل تصنيف':'إضافة تصنيف'} icon={<Tag/>}><div className="grid md:grid-cols-4 gap-3"><Input label="الاسم" value={categoryDraft.name||''} onChange={v=>setCategoryDraft(p=>({...p,name:v}))}/><Input label="Slug" value={categoryDraft.slug||''} onChange={v=>setCategoryDraft(p=>({...p,slug:v}))}/><Input label="الترتيب" value={String(categoryDraft.sort_order||0)} onChange={v=>setCategoryDraft(p=>({...p,sort_order:Number(v)||0}))} type="number"/><Select label="الحالة" value={categoryDraft.status||'active'} onChange={v=>setCategoryDraft(p=>({...p,status:v}))} options={[{value:'active',label:'نشط'},{value:'inactive',label:'غير نشط'}]}/></div><ActionButton onClick={saveCategory} label="حفظ التصنيف"/></Panel><Panel title="التصنيفات" icon={<Tag/>}>{categories.map(c=><Row key={c.id}><span>{c.name}<small className="block text-gray-500">{c.slug}</small></span><div className="actions"><button className="btn" onClick={()=>fillCategory(c as Category & {status?:string;sort_order?:number})}>تعديل</button><button className="btn red" onClick={()=>runAction('disableCategory',{id:c.id},'تم تعطيل التصنيف')}>تعطيل</button></div></Row>)}</Panel></section>}
        {tab==='analytics' && (
          <section className="space-y-6">
            {/* Period Selector */}
            <div className="flex gap-2">
              {(['24h','7d','30d'] as const).map(p => (
                <button key={p} onClick={()=>setAnalyticsPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${analyticsPeriod===p?'bg-gold text-midnight':'bg-midnight text-gray-400 border border-gold/20'}`}>
                  {p==='24h'?'24 ساعة':p==='7d'?'7 أيام':'30 يوم'}
                </button>
              ))}
            </div>

            {!realAnalytics ? (
              <div className="text-center py-12 text-gray-400">جاري تحميل التحليلات...</div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Stat icon={<Users/>} label="زوار فريدين" value={String(realAnalytics.overview?.totalVisitors||0)}/>
                  <Stat icon={<Eye/>} label="جلسات" value={String(realAnalytics.overview?.totalSessions||0)}/>
                  <Stat icon={<Clock/>} label="متوسط المدة" value={String(Math.round(realAnalytics.overview?.avgDuration||0)+' ث')}/>
                  <Stat icon={<MessageSquare/>} label="رسائل الشات" value={String(realAnalytics.overview?.totalMessages||0)}/>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <Stat icon={<TrendingUp/>} label="CTR" value={String((realAnalytics.overview?.ctaClicks||0))}/>
                  <Stat icon={<Check/>} label="Conversions" value={String(realAnalytics.overview?.conversions||0)}/>
                  <Stat icon={<Globe/>} label="دول" value={String(realAnalytics.countries?.length||0)}/>
                  <Stat icon={<Video/>} label="مسلسلات مشاهدة" value={String(realAnalytics.topDramas?.length||0)}/>
                </div>

                {/* Countries */}
                <Panel title="الدول" icon={<Globe/>}>
                  {realAnalytics.countries?.length===0?<EmptyState/>:realAnalytics.countries.map((c:any,i:number)=>(
                    <Row key={i}><span>{c.country||'غير معروف'}</span><span className="text-gold">{c.visitors} زائر</span></Row>
                  ))}
                </Panel>

                {/* Devices */}
                <Panel title="الأجهزة" icon={<Activity/>}>
                  {realAnalytics.devices?.length===0?<EmptyState/>:realAnalytics.devices.map((d:any,i:number)=>(
                    <Row key={i}><span>{d.device_type==='mobile'?'موبايل':d.device_type==='tablet'?'تابلت':'ديسكتوب'}</span><span className="text-gold">{d.count}</span></Row>
                  ))}
                </Panel>

                {/* Top Dramas */}
                <Panel title="أكثر المسلسلات مشاهدة" icon={<Video/>}>
                  {realAnalytics.topDramas?.length===0?<EmptyState/>:realAnalytics.topDramas.map((d:any,i:number)=>(
                    <Row key={i}><span>{d.title}</span><span className="text-gold">{d.views} مشاهدة</span></Row>
                  ))}
                </Panel>

                {/* Chat Sentiment */}
                <Panel title="تحليل مشاعر الشات" icon={<MessageSquare/>}>
                  {realAnalytics.sentimentBreakdown?.length===0?<EmptyState/>:realAnalytics.sentimentBreakdown.map((s:any,i:number)=>(
                    <Row key={i}>
                      <span>{s.sentiment==='positive'?'إيجابي':s.sentiment==='negative'?'سلبي':s.sentiment==='question'?'سؤال':'محايد'}</span>
                      <span className={s.sentiment==='positive'?'text-green-400':s.sentiment==='negative'?'text-red-400':'text-gold'}>{s.count} رسالة</span>
                    </Row>
                  ))}
                </Panel>

                {/* Top Chatters */}
                <Panel title="أكثر الناس نشاطاً" icon={<Users/>}>
                  {realAnalytics.topChatters?.length===0?<EmptyState/>:realAnalytics.topChatters.map((c:any,i:number)=>(
                    <Row key={i}><span>{c.username}</span><span className="text-gold">{c.messages} رسالة (متوسط {Math.round(c.avg_length||0)} حرف)</span></Row>
                  ))}
                </Panel>

                {/* Hourly Activity */}
                <Panel title="النشاط حسب الساعة" icon={<Activity/>}>
                  {realAnalytics.hourlyActivity?.length===0?<EmptyState/>:realAnalytics.hourlyActivity.map((h:any,i:number)=>(
                    <Row key={i}><span>{h.hour}:00</span><span className="text-gold">{h.count} نشاط</span></Row>
                  ))}
                </Panel>
              </>
            )}
          </section>
        )}
        {tab==='chat' && <section className="space-y-5"><Panel title="إعدادات الدردشة" icon={<Shield/>}><div className="grid md:grid-cols-3 gap-3"><Input label="Cooldown بالثواني" value={String(chatSettings.cooldownSeconds)} onChange={v=>setChatSettings(p=>({...p,cooldownSeconds:Number(v)||0}))} type="number"/><Input label="الحد في الدقيقة" value={String(chatSettings.rateLimitPerMinute)} onChange={v=>setChatSettings(p=>({...p,rateLimitPerMinute:Number(v)||1}))} type="number"/><div className="bg-midnight rounded-xl border border-green-500/20 px-3 py-3 text-sm text-green-300">فلترة Backend إجبارية دائمًا لحماية الشات</div></div><ActionButton onClick={saveChatSettings} label="حفظ إعدادات الدردشة"/></Panel><Panel title="الأسماء النشطة" icon={<Users/>}>{activeUsernames.length===0?<EmptyState/>:activeUsernames.map(u=><Row key={u.session_id||u.username}><span>{u.username}<small className="block text-gray-500">{u.expires_at}</small></span><button className="btn red" onClick={()=>runAction('releaseUsername',{session_id:u.session_id,username:u.username},'تم تحرير الاسم')}>تحرير</button></Row>)}</Panel><Panel title="آخر رسائل الشات + Moderation" icon={<MessageSquare/>}>{recentChatMessages.length===0?<EmptyState/>:recentChatMessages.map(m=><Row key={m.id}><span><b className="text-gold">{m.username}</b> <small className="text-gray-500">{m.status}</small><p className="text-gray-300">{m.message}</p></span><div className="actions"><button className="btn" onClick={()=>runAction('reviewChatMessage',{id:m.id},'تمت مراجعة الرسالة')}>مراجعة</button><button className="btn red" onClick={()=>runAction('hideChatMessage',{id:m.id},'تم إخفاء الرسالة')}>إخفاء</button><button className="btn red" onClick={()=>runAction('deleteChatMessage',{id:m.id},'تم حذف الرسالة')}>حذف</button>{m.visitor_id && <button className="btn red" onClick={()=>{const reason=prompt('سبب تقييد الزائر','مخالفة قواعد الشات'); if(reason) void runAction('banChatVisitor',{visitor_id:m.visitor_id,reason,minutes:1440},'تم تقييد الزائر من قاعدة البانات');}}>Ban visitor</button>}</div></Row>)}</Panel></section>}
        {tab==='bots' && <section className="space-y-5"><Panel title="إعدادات البوتات من MySQL" icon={<Bot/>}><p className="text-gray-400 text-sm mb-3">واجهة الزائر تقرأ من /api/public/bot-settings.php، ورسائل البوت تتولد الآن من Backend وتتحفظ في MySQL.</p><textarea className="input h-32" value={botSettings.knowledgeBase} onChange={e=>setBotSettings(p=>({...p,knowledgeBase:e.target.value}))} placeholder="قاعدة معرفة البوتات"/><div className="grid md:grid-cols-4 gap-3 mt-3"><Input label="اسم الهدف" value={botSettings.targetGame} onChange={v=>setBotSettings(p=>({...p,targetGame:v}))}/><Input label="Steering %" value={String(botSettings.steeringWeight)} onChange={v=>setBotSettings(p=>({...p,steeringWeight:Number(v)||0}))} type="number"/><Input label="Polling ثواني" value={String(botSettings.pollingInterval)} onChange={v=>setBotSettings(p=>({...p,pollingInterval:Number(v)||10}))} type="number"/><Toggle label="تشغيل feed البوتات" checked={botSettings.feedEnabled} onChange={v=>setBotSettings(p=>({...p,feedEnabled:v}))}/></div><ActionButton onClick={saveBotSettings} label="حفظ إعدادات البوتات في MySQL"/></Panel><Panel title="وعي الوقت والموسم وسياق الشات" icon={<Activity/>}><div className="grid md:grid-cols-2 gap-3"><Input label="مود الموقع" value={botBrain.contextState.site_mood||''} onChange={v=>setBotBrain(p=>({...p,contextState:{...p.contextState,site_mood:v}}))}/><Input label="الموسم override أو auto" value={botBrain.contextState.season_override||'auto'} onChange={v=>setBotBrain(p=>({...p,contextState:{...p.contextState,season_override:v}}))}/><Input label="المناسبة الحالية" value={botBrain.contextState.occasion||''} onChange={v=>setBotBrain(p=>({...p,contextState:{...p.contextState,occasion:v}}))}/><Input label="توجيه البوتات" value={botBrain.contextState.bot_directive||''} onChange={v=>setBotBrain(p=>({...p,contextState:{...p.contextState,bot_directive:v}}))}/></div><div className="text-xs text-gray-400 mt-3">الوقت الحالي من السيرفر: {String(botBrain.timeContext?.daypart||'غير متاح')} · الموسم: {String(botBrain.timeContext?.season||'غير متاح')} · الذاكرة: {botBrain.memoryCount}</div><ActionButton onClick={saveBotBrain} label="حفظ Bot Brain Context"/></Panel><Panel title={editingBotProfileId?'تعديل شخصية بوت':'إضافة شخصية بوت'} icon={<Bot/>}><div className="grid md:grid-cols-4 gap-3"><Input label="اسم البوت" value={botProfileDraft.display_name} onChange={v=>setBotProfileDraft(p=>({...p,display_name:v}))}/><Input label="الشخصية" value={botProfileDraft.persona} onChange={v=>setBotProfileDraft(p=>({...p,persona:v}))}/><Input label="أسلوب الكلام" value={botProfileDraft.speech_style} onChange={v=>setBotProfileDraft(p=>({...p,speech_style:v}))}/><Input label="Activity" value={String(botProfileDraft.activity_level)} onChange={v=>setBotProfileDraft(p=>({...p,activity_level:Number(v)||60}))} type="number"/><Input label="Memory weight" value={String(botProfileDraft.memory_weight)} onChange={v=>setBotProfileDraft(p=>({...p,memory_weight:Number(v)||60}))} type="number"/><Input label="Delay min" value={String(botProfileDraft.response_delay_min)} onChange={v=>setBotProfileDraft(p=>({...p,response_delay_min:Number(v)||7}))} type="number"/><Input label="Delay max" value={String(botProfileDraft.response_delay_max)} onChange={v=>setBotProfileDraft(p=>({...p,response_delay_max:Number(v)||22}))} type="number"/><Toggle label="نشط" checked={Boolean(botProfileDraft.active)} onChange={v=>setBotProfileDraft(p=>({...p,active:v}))}/></div><ActionButton onClick={saveBotProfile} label="حفظ شخصية البوت في MySQL"/></Panel><Panel title="شخصيات البوتات والذاكرة" icon={<FileText/>}><p className="text-sm text-green-300">{botAudit?.note || 'رسائل البوتات محفوظة في MySQL'}</p><p className="text-gray-400 text-xs mt-2">رسائل بوت محفوظة: {botAudit?.storedMessages ?? 0} · سجل بوت: {botAudit?.botLogRows ?? 0} · Memory events: {botBrain.memoryCount}</p>{botBrain.profiles.length===0?<EmptyState/>:botBrain.profiles.map(pf=><Row key={String(pf.id||pf.display_name)}><span>{pf.display_name} · {pf.persona}<small className="block text-gray-500">Activity {pf.activity_level} · Memory {pf.memory_weight} · آخر كلام: {pf.last_spoke_at||'لا يوجد'}</small></span><button className="btn" onClick={()=>fillBotProfile(pf)}>تعديل</button></Row>)}</Panel><Panel title="ملخصات المحادثات" icon={<MessageSquare/>}>{botBrain.summaries.length===0?<EmptyState/>:botBrain.summaries.map(su=><Row key={su.conversation_key}><span>{su.conversation_key} · {su.dominant_mood}<small className="block text-gray-500">{su.summary_text}</small></span><span className="text-gray-400 text-xs">{su.message_count} رسالة</span></Row>)}</Panel></section>}
                
{tab==='unknownTerms' && <section className="space-y-5"><Panel title="الكلمات غير المعروفة" icon={<MessageSquare size={18}/>}>
  <UnknownTermsPanel />
</Panel></section>}
{tab==='admins' && isSuperAdmin && <section className="space-y-5"><Panel title="إضافة مدير" icon={<UserCheck/>}><div className="grid md:grid-cols-4 gap-3"><Input label="اسم المستخدم" value={newAdminUsername} onChange={setNewAdminUsername}/><Input label="البريد" value={newAdminEmail} onChange={setNewAdminEmail}/><Input label="كلمة المرور" value={newAdminPassword} onChange={setNewAdminPassword} type="password"/><Select label="الصلاحية" value={newAdminRole} onChange={v=>setNewAdminRole(v as 'admin'|'super_admin')} options={[{value:'admin',label:'admin'},{value:'super_admin',label:'super_admin'}]}/></div><ActionButton onClick={createAdmin} label="إنشاء مدير"/></Panel><Panel title="المديرون" icon={<Users/>}>{admins.map(a=><Row key={a.id}><span>{a.username} · {a.role} · {a.status}<small className="block text-gray-500">فشل: {a.failed_login_count||0} · قفل: {a.locked_until||'لا يوجد'} · آخر دخول: {a.last_login_at||'لا يوجد'}</small></span><div className="actions"><button className="btn" onClick={()=>runAction('updateAdminRole',{id:a.id,role:a.role==='super_admin'?'admin':'super_admin'},'تم تعديل الصلاحية')}>تغيير الصلاحية</button><button className="btn" onClick={()=>runAction('unlockAdmin',{id:a.id},'تم فك القفل')}>فك القفل</button><button className="btn" onClick={()=>{const p=prompt('كلمة مرور جديدة قوية'); if(p) void runAction('resetAdminPassword',{id:a.id,password:p},'تم إعادة تعيين كلمة المرور');}}>Reset password</button><button className="btn red" onClick={()=>runAction('updateAdminStatus',{id:a.id,status:a.status==='disabled'?'active':'disabled'},'تم تعديل الحالة')}>{a.status==='disabled'?'تفعيل':'تعطيل'}</button></div></Row>)}</Panel></section>}
        {tab==='security' && <section className="space-y-5"><Panel title="إدارة بيانات الدخول الحساسة" icon={<Lock/>}><form onSubmit={submitPasswordChange} className="grid md:grid-cols-4 gap-3"><Input label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword} type="password"/><Input label="اسم مستخدم جديد اختياري" value={newUsername} onChange={setNewUsername}/><Input label="كلمة مرور جديدة" value={newPassword} onChange={setNewPassword} type="password"/><Input label="تأكيد كلمة المرور" value={confirmPassword} onChange={setConfirmPassword} type="password"/><button className="btn gold" type="submit">حفظ وإجبار تسجيل الدخول</button></form></Panel><Panel title="Storage Security Audit" icon={<Lock/>}>{[...storageAudit.localKeys.map(k=>({...k,type:'localStorage'})),...storageAudit.sessionKeys.map(k=>({...k,type:'sessionStorage'}))].map(k=><Row key={`${k.type}-${k.key}`}><span dir="ltr">{k.type}: {k.key}<small className="block text-gray-500">{k.file || (k.sourceKnown ? 'source audit' : 'runtime only')}</small></span><span className={k.safe?'text-green-400':'text-red-400'}>{k.safe?'آمن':'يحتاج مراجعة'} · {k.purpose}</span></Row>)}</Panel></section>}
        {tab==='settings' && isSuperAdmin && <Panel title="الإعدادات العامة" icon={<Globe/>}><div className="grid md:grid-cols-3 gap-3"><Input label="اسم الموقع" value={siteSettings.siteTitle} onChange={v=>setSiteSettings(p=>({...p,siteTitle:v}))}/><Input label="الوصف" value={siteSettings.siteSubtitle} onChange={v=>setSiteSettings(p=>({...p,siteSubtitle:v}))}/><Input label="عدد الرئيسية" value={String(siteSettings.homepageLimit)} onChange={v=>setSiteSettings(p=>({...p,homepageLimit:Number(v)||24}))} type="number"/><Toggle label="Analytics" checked={siteSettings.analyticsEnabled} onChange={v=>setSiteSettings(p=>({...p,analyticsEnabled:v}))}/><Toggle label="Maintenance" checked={siteSettings.maintenanceMode} onChange={v=>setSiteSettings(p=>({...p,maintenanceMode:v}))}/></div><ActionButton onClick={saveSiteSettings} label="حفظ الإعدادات"/></Panel>}
        {tab==='audit' && <Panel title="سجل العمليات" icon={<FileText/>}>{auditLogs.length===0?<EmptyState/>:auditLogs.map(l=><Row key={l.id}><span>{l.action}<small className="block text-gray-500">{l.entity_type||'system'} {l.entity_id||''}</small></span><small>{new Date(l.created_at).toLocaleString('ar')}</small></Row>)}</Panel>}
        {tab==='health' && <Panel title="صحة النظام" icon={<Activity/>}>{Object.keys(healthChecks).length===0?<EmptyState/>:Object.entries(healthChecks).map(([k,c])=><Row key={k}><span>{c.label}<small className="block text-gray-500" dir="ltr">{c.details}</small></span><span className={c.status==='ok'?'text-green-400':c.status==='warning'?'text-orange':'text-red-400'}>{c.status}</span></Row>)}</Panel>}
      </main>
    </div>
  </div>;
}

function Panel({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}){ return <section className="bg-deep-purple rounded-xl border border-gold/10 p-4"><div className="flex items-center gap-2 mb-4 text-gold font-bold">{icon}<h2>{title}</h2></div>{children}</section>; }
function Row({children}:{children:ReactNode}){ return <div className="bg-midnight rounded-xl border border-gold/10 p-3 flex items-center justify-between gap-3 flex-wrap">{children}</div>; }
function Stat({icon,label,value}:{icon:ReactNode;label:string;value:string}){ return <div className="bg-deep-purple rounded-xl p-4 border border-gold/10"><div className="text-gold mb-2">{icon}</div><p className="text-gray-400 text-xs">{label}</p><p className="text-2xl font-black">{value}</p></div>; }
function Notice({type,children}:{type:'ok'|'err'|'warn';children:ReactNode}){ const cls=type==='ok'?'bg-green-500/10 border-green-500/30 text-green-300':type==='err'?'bg-red-500/10 border-red-500/30 text-red-300':'bg-gold/10 border-gold/30 text-gold'; return <div className={`border rounded-xl p-3 text-sm ${cls}`}>{children}</div>; }
function Input({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){ return <label className="block"><span className="text-gray-400 text-xs block mb-1">{label}</span><input className="input" type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){ return <label className="block"><span className="text-gray-400 text-xs block mb-1">{label}</span><select className="input" value={value} onChange={e=>onChange(e.target.value)}><option value="">اختاري</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){ return <label className="flex items-center justify-between gap-2 bg-midnight rounded-xl border border-gold/10 px-3 py-3"><span className="text-sm">{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>; }
function ActionButton({onClick,label}:{onClick:()=>void|Promise<void>;label:string}){ return <button type="button" onClick={()=>void onClick()} className="btn gold mt-3"><Save size={16}/>{label}</button>; }
function EmptyState(){ return <div className="text-gray-500 text-sm text-center py-6">لا توجد بيانات كافية بعد</div>; }
function DramaMini({drama}:{drama:Drama}){ return <div className="flex items-center gap-3"><img src={drama.thumbnail_url} className="w-12 h-16 object-cover rounded-lg bg-midnight"/><div><p className="font-bold text-white">{drama.title}</p><p className="text-gray-500 text-xs">{drama.category?.name || drama.category_id} · {Number(drama.view_count||0).toLocaleString('ar-EG')} مشاهدة</p><p className="text-gray-600 text-[10px]" dir="ltr">{drama.video_id}</p></div></div>; }
function DramaForm({draft,setField,categories}:{draft:Partial<Drama>;setField:<K extends keyof Drama>(key:K,value:Drama[K])=>void;categories:Category[]}){ return <div className="grid md:grid-cols-3 gap-3"><Input label="العنوان" value={draft.title||''} onChange={v=>setField('title',v)}/><Input label="Slug" value={draft.slug||''} onChange={v=>setField('slug',v)}/><Select label="القسم" value={draft.category_id||''} onChange={v=>setField('category_id',v)} options={categories.map(c=>({value:c.id,label:c.name}))}/><Input label="Dailymotion ID" value={draft.video_id||''} onChange={v=>setField('video_id',v)}/><div className="md:col-span-3">
                <span className="text-gray-400 text-xs block mb-1">البوستر</span>
                <div 
                  className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragActive ? 'border-gold bg-gold/10' : 'border-gold/20 bg-black/40'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadedImage || draft.thumbnail_url ? (
                    <div className="space-y-2">
                      <img src={uploadedImage || draft.thumbnail_url} alt="Preview" className="max-h-24 mx-auto rounded-lg" />
                      <button onClick={() => {setUploadedImage(null); setField('thumbnail_url','');}} className="text-red-400 text-xs hover:text-red-300">إزالة</button>
                    </div>
                  ) : (
                    <>
                      <Image className="w-6 h-6 text-gold/50 mx-auto mb-1" />
                      <p className="text-gray-400 text-xs">اسحب الصورة هنا أو</p>
                      <label className="cursor-pointer text-gold text-xs hover:text-gold/80">
                        اختر من الجهاز
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const result = ev.target?.result as string;
                              setUploadedImage(result);
                              setField('thumbnail_url', result);
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }} />
                      </label>
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={draft.thumbnail_url||''}
                  onChange={e=>setField('thumbnail_url',e.target.value)}
                  placeholder="أو أدخل رابط الصورة"
                  className="w-full bg-black/40 border border-gold/20 rounded-xl px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-gold/50 mt-2"
                />
              </div><Input label="السنة" value={String(draft.year||'')} onChange={v=>setField('year',Number(v) as Drama['year'])} type="number"/><Input label="التقييم" value={String(draft.rating||'')} onChange={v=>setField('rating',Number(v) as Drama['rating'])} type="number"/><Input label="المشاهدات" value={String(draft.view_count||0)} onChange={v=>setField('view_count',Number(v) as Drama['view_count'])} type="number"/><Input label="الحلقات" value={String(draft.episodes_count||1)} onChange={v=>setField('episodes_count',Number(v) as Drama['episodes_count'])} type="number"/><Input label="الترتيب" value={String(draft.sort_order||0)} onChange={v=>setField('sort_order',Number(v) as Drama['sort_order'])} type="number"/><Select label="الحالة" value={String(draft.status||'published')} onChange={v=>setField('status',v as Drama['status'])} options={[{value:'published',label:'منشور'},{value:'draft',label:'مسودة'},{value:'archived',label:'مؤرشف'}]}/><Toggle label="Featured" checked={Boolean(draft.featured)} onChange={v=>setField('featured',v as Drama['featured'])}/><label className="md:col-span-3"><span className="text-gray-400 text-xs block mb-1">الوصف</span><textarea className="input h-24" value={draft.description||''} onChange={e=>setField('description',e.target.value)} /></label></div>; }
