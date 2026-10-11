'use strict';
/* =============================================================================
   HR & Operations ERP — Frontend SPA (GitHub Pages)
   Offline-first (IndexedDB) · dynamic schema · RBAC · chat-like entry · admin
   ============================================================================= */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwCXgPmO1ggMLbRJIImlfCHVJ0Ngf3WshWVsen7LuuOBUALlPqrFbnqRvCEQzXnpLKyag/exec',   // Apps Script Web App /exec URL
  HEARTBEAT_MS: 30000,
  SYNC_MS: 10000,
  ADMIN_POLL_MS: 10000,
  DEFAULT_MAX_MB: 5,
  PAGE: 100
};

/* ----------------------------- utilities ----------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));
const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hhmm = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fullTime = ms => ms ? new Date(ms).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : '—';

/* ----------------------------- i18n ----------------------------- */
const I18N = {
  en: {
    appName: 'HR Ops', tagline: 'Recruitment & staffing platform', signIn: 'Sign in', username: 'Username', password: 'Password', login: 'Log in',
    invalid: 'Invalid username or password', attemptsLeft: n => `${n} attempt(s) left before lockout`, lockedFor: s => `Too many attempts. Try again in ${s}`,
    disabled: 'This account is disabled', logout: 'Log out', search: 'Search…', all: 'All', add: 'Add', save: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit',
    saved: 'Saved', savedOffline: 'Saved on this device — will sync automatically', deleted: 'Deleted', undo: 'Undo', synced: 'Synchronized', syncing: 'Syncing…',
    offlineN: n => n ? `Offline · ${n} pending` : 'Offline', pendingN: n => `${n} pending`, noData: 'Nothing here yet', noDataHint: 'Tap + to add the first record',
    noTabs: 'No tabs are assigned to you. Ask your administrator.', required: 'Required', formMode: 'Form', chatMode: 'Chat', ask: l => `What is the ${l}?`,
    skip: 'Skip', done: 'Done', yes: 'Yes', no: 'No', typeHere: 'Type your answer…', summary: 'All set! Here is what I have:', editInForm: 'Edit in form',
    dropFiles: 'Drop files here or tap to choose', uploading: 'Uploading…', tooLarge: (n, m) => `${n} is larger than ${m} MB`, tooMany: m => `Maximum ${m} file(s)`, uploadWait: 'Please wait for uploads to finish',
    admin: 'Admin', overview: 'Overview', users: 'Users', audit: 'Audit log', tabs: 'Tabs', onlineNow: 'Online now', totalUsers: 'Users', actionsToday: 'Changes today', openAlerts: 'Security alerts',
    onlineSince: t => `Online since ${t}`, lastSeen: t => `Last seen ${t}`, never: 'Never', justNow: 'just now', minAgo: n => `${n} min ago`, hrAgo: n => `${n} h ago`, dayAgo: n => `${n} d ago`,
    newUser: 'New user', editUser: 'Edit user', role: 'Role', permissions: 'Permissions', active: 'Active', unlock: 'Unlock', ack: 'Acknowledge', createTab: 'New tab', tabName: 'Tab name',
    fields: 'Fields', addField: 'Add field', label: 'Label', labelAr: 'Arabic label', type: 'Type', options: 'Options (comma separated)', advanced: 'Advanced', from: 'From', to: 'To',
    user: 'User', action: 'Action', details: 'Details', time: 'Time', record: 'Record', prev: 'Previous', next: 'Next', apply: 'Apply', conflictTitle: 'Edit conflict',
    conflictBody: 'Someone changed these fields while you were offline.', keepMine: 'Keep mine', keepTheirs: 'Keep theirs', networkErr: 'No connection', sessionExpired: 'Session expired — please sign in again',
    readOnly: 'View only', theme: 'Theme', language: 'Language', brute: 'Brute-force alert', locked: 'Locked', activity24: 'Activity — last 24 h', recent: 'Recent activity', noAlerts: 'No open alerts',
    newRecord: 'New record', total: 'total', rows: 'rows', columns: 'Columns', icon: 'Icon', selectUser: 'Pick a user', allUsers: 'All', allTabs: 'All tabs', allActions: 'All actions',
    tabCreated: 'Tab created — it is live for everyone', userSaved: 'User saved', pw: 'Password (min 8 chars)', pwKeep: 'Leave empty to keep current', status: 'Status', switchedChat: 'Chat entry',
    permsChanged: 'Your permissions changed — reloading', saveFail: 'Could not save', confirmDel: 'Delete this record?', openFile: 'Open', fileOffline: 'File is stored on this device until you are online', mic: 'Voice input',
    dashboard: 'Dashboard', records: 'Records', sum: 'Σ Total', today: 'Today', pending: 'Pending', attachments: 'Attachments', recentRecords: 'Recent records',
    exportExcel: 'Export Excel', exportDone: 'Excel file downloaded', allTabsRead: 'Access to ALL tabs (read-only)', settings: 'Settings',
    branding: 'Branding', brandingHint: 'Logo & name shown on the splash screen, login and sidebar', appName: 'App name', tagline: 'Tagline',
    logoEmoji: 'Logo (emoji)', logoUrl: 'Logo image URL (optional)', loginHint: 'Sign in to continue to your workspace',
    secureLogin: 'Protected login · repeated wrong passwords lock the account',
    feat1: 'Offline-first: capture data anywhere, it syncs automatically', feat2: 'Tabs & dashboards shaped by your permissions',
    feat3: 'Chat-style or form data entry, with file uploads', feat4: 'Full audit trail, security alerts & Excel export',
    syncNow: 'Sync now', syncStatus: 'Sync status', syncVerified: (n, k) => `Verified: ${n} record(s) in ${k} page(s) match the server`, lastSyncAt: x => `Last successful sync: ${x}`,
    nothingPending: 'Nothing is waiting to sync', discardConfirm: 'Discard this unsynced change?', syncFailed: 'Sync failed'
  },
  ar: {
    appName: 'نظام العمليات', tagline: 'منصة التوظيف والاستقدام', signIn: 'تسجيل الدخول', username: 'اسم المستخدم', password: 'كلمة المرور', login: 'دخول',
    invalid: 'اسم المستخدم أو كلمة المرور غير صحيحة', attemptsLeft: n => `متبقي ${n} محاولة قبل الإيقاف المؤقت`, lockedFor: s => `محاولات كثيرة. حاول بعد ${s}`,
    disabled: 'هذا الحساب معطّل', logout: 'تسجيل الخروج', search: 'بحث…', all: 'الكل', add: 'إضافة', save: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل',
    saved: 'تم الحفظ', savedOffline: 'تم الحفظ على جهازك — سيتم المزامنة تلقائياً', deleted: 'تم الحذف', undo: 'تراجع', synced: 'متزامن', syncing: 'جارٍ المزامنة…',
    offlineN: n => n ? `بدون إنترنت · ${n} معلّق` : 'بدون إنترنت', pendingN: n => `${n} معلّق`, noData: 'لا توجد بيانات بعد', noDataHint: 'اضغط + لإضافة أول سجل',
    noTabs: 'لا توجد صفحات مخصصة لك. تواصل مع المسؤول.', required: 'مطلوب', formMode: 'نموذج', chatMode: 'محادثة', ask: l => `ما هو ${l}؟`,
    skip: 'تخطي', done: 'تم', yes: 'نعم', no: 'لا', typeHere: 'اكتب إجابتك…', summary: 'تمام! هذه هي البيانات:', editInForm: 'تعديل في النموذج',
    dropFiles: 'اسحب الملفات هنا أو اضغط للاختيار', uploading: 'جارٍ الرفع…', tooLarge: (n, m) => `${n} أكبر من ${m} ميجابايت`, tooMany: m => `الحد الأقصى ${m} ملف`, uploadWait: 'انتظر انتهاء الرفع',
    admin: 'الإدارة', overview: 'نظرة عامة', users: 'المستخدمون', audit: 'سجل التدقيق', tabs: 'الصفحات', onlineNow: 'متصل الآن', totalUsers: 'المستخدمون', actionsToday: 'تعديلات اليوم', openAlerts: 'تنبيهات الأمان',
    onlineSince: t => `متصل منذ ${t}`, lastSeen: t => `آخر ظهور ${t}`, never: 'أبداً', justNow: 'الآن', minAgo: n => `منذ ${n} دقيقة`, hrAgo: n => `منذ ${n} ساعة`, dayAgo: n => `منذ ${n} يوم`,
    newUser: 'مستخدم جديد', editUser: 'تعديل مستخدم', role: 'الدور', permissions: 'الصلاحيات', active: 'نشط', unlock: 'فك القفل', ack: 'تم الاطلاع', createTab: 'صفحة جديدة', tabName: 'اسم الصفحة',
    fields: 'الحقول', addField: 'إضافة حقل', label: 'العنوان', labelAr: 'العنوان بالعربية', type: 'النوع', options: 'الخيارات (مفصولة بفواصل)', advanced: 'متقدم', from: 'من', to: 'إلى',
    user: 'المستخدم', action: 'الإجراء', details: 'التفاصيل', time: 'الوقت', record: 'السجل', prev: 'السابق', next: 'التالي', apply: 'تطبيق', conflictTitle: 'تعارض في التعديل',
    conflictBody: 'قام شخص آخر بتغيير هذه الحقول أثناء عدم اتصالك.', keepMine: 'احتفظ بتعديلي', keepTheirs: 'احتفظ بتعديلهم', networkErr: 'لا يوجد اتصال', sessionExpired: 'انتهت الجلسة — سجّل الدخول مجدداً',
    readOnly: 'للعرض فقط', theme: 'المظهر', language: 'اللغة', brute: 'تنبيه محاولات اختراق', locked: 'مقفل', activity24: 'النشاط — آخر ٢٤ ساعة', recent: 'آخر الأنشطة', noAlerts: 'لا توجد تنبيهات مفتوحة',
    newRecord: 'سجل جديد', total: 'إجمالي', rows: 'صف', columns: 'الأعمدة', icon: 'أيقونة', selectUser: 'اختر مستخدماً', allUsers: 'الكل', allTabs: 'كل الصفحات', allActions: 'كل الإجراءات',
    tabCreated: 'تم إنشاء الصفحة — أصبحت متاحة للجميع', userSaved: 'تم حفظ المستخدم', pw: 'كلمة المرور (٨ أحرف على الأقل)', pwKeep: 'اتركها فارغة للإبقاء على الحالية', status: 'الحالة', switchedChat: 'إدخال بالمحادثة',
    permsChanged: 'تغيّرت صلاحياتك — جارٍ التحديث', saveFail: 'تعذّر الحفظ', confirmDel: 'حذف هذا السجل؟', openFile: 'فتح', fileOffline: 'الملف محفوظ على جهازك حتى تتصل بالإنترنت', mic: 'إدخال صوتي',
    dashboard: 'لوحة المعلومات', records: 'السجلات', sum: 'Σ المجموع', today: 'اليوم', pending: 'معلّق', attachments: 'المرفقات', recentRecords: 'أحدث السجلات',
    exportExcel: 'تصدير Excel', exportDone: 'تم تنزيل ملف Excel', allTabsRead: 'الوصول لكل الصفحات (قراءة فقط)', settings: 'الإعدادات',
    branding: 'هوية النظام', brandingHint: 'الشعار والاسم في شاشة البداية وشاشة الدخول والقائمة الجانبية', appName: 'اسم النظام', tagline: 'الوصف المختصر',
    logoEmoji: 'الشعار (رمز)', logoUrl: 'رابط صورة الشعار (اختياري)', loginHint: 'سجّل الدخول للمتابعة إلى مساحة العمل',
    secureLogin: 'دخول محمي · المحاولات الخاطئة المتكررة تقفل الحساب',
    feat1: 'يعمل بدون إنترنت: سجّل البيانات في أي مكان وتتم المزامنة تلقائياً', feat2: 'صفحات ولوحات معلومات تُبنى حسب صلاحياتك',
    feat3: 'إدخال بالمحادثة أو بالنموذج، مع رفع الملفات', feat4: 'سجل تدقيق كامل وتنبيهات أمان وتصدير Excel',
    syncNow: 'مزامنة الآن', syncStatus: 'حالة المزامنة', syncVerified: (n, k) => `تم التحقق: ${n} سجل في ${k} صفحة مطابق للسيرفر`, lastSyncAt: x => `آخر مزامنة ناجحة: ${x}`,
    nothingPending: 'لا يوجد شيء في انتظار المزامنة', discardConfirm: 'تجاهل هذا التعديل غير المتزامن؟', syncFailed: 'فشلت المزامنة'
  }
};
const T_TYPES = { en: { text: 'Text', longtext: 'Long text', number: 'Number', date: 'Date', datetime: 'Date & time', select: 'Dropdown', multiselect: 'Multi-select', checkbox: 'Checkbox', phone: 'Phone', email: 'Email', file: 'File upload', calc: 'Calculated' },
  ar: { text: 'نص', longtext: 'نص طويل', number: 'رقم', date: 'تاريخ', datetime: 'تاريخ ووقت', select: 'قائمة', multiselect: 'اختيار متعدد', checkbox: 'مربع اختيار', phone: 'هاتف', email: 'بريد', file: 'رفع ملف', calc: 'محسوب' } };
const ACTIONS = ['login', 'logout', 'login_fail', 'login_blocked', 'lockout', 'security_alert', 'create', 'update', 'delete', 'conflict', 'upload', 'download', 'user_create', 'user_update', 'user_unlock', 'tab_create'];

const BRAND = { name: { en: 'HR Ops', ar: 'نظام العمليات' }, tag: { en: 'Recruitment & staffing platform', ar: 'منصة التوظيف والاستقدام' }, logo: '🧭', logoImg: '' };
function brandName() { return (S.lang === 'ar' && BRAND.name.ar) ? BRAND.name.ar : BRAND.name.en; }
function brandTag() { return (S.lang === 'ar' && BRAND.tag && BRAND.tag.ar) ? BRAND.tag.ar : (BRAND.tag && BRAND.tag.en || ''); }
function logoHtml(sz = '') { return BRAND.logoImg ? `<img class="logoimg ${sz === 'sm' ? 'sm' : ''}" src="${esc(BRAND.logoImg)}" alt="logo">` : `<div class="logo ${sz === 'sm' ? 'sm' : (sz === 'lg' ? 'lg' : '')}">${esc(BRAND.logo || '🧭')}</div>`; }
function applySettings(st) { if (!st) return; if (st.name) { if (st.name.en) BRAND.name.en = st.name.en; if (st.name.ar) BRAND.name.ar = st.name.ar; } if (st.tag) { if (st.tag.en) BRAND.tag.en = st.tag.en; if (st.tag.ar) BRAND.tag.ar = st.tag.ar; } if (st.logo) BRAND.logo = st.logo; if (st.logoImg) BRAND.logoImg = st.logoImg; }
function hideSplash() { const sp = $('#splash'); if (!sp || sp.dataset.done) return; sp.dataset.done = '1'; const wait = Math.max(0, 1100 - (Date.now() - (window.__t0 || 0))); setTimeout(() => { sp.classList.add('hide'); setTimeout(() => sp.remove(), 700); }, wait); }

const S = { lang: 'en', theme: 'dark', token: null, user: null, tabs: [], data: {}, lastSync: {}, view: { kind: 'tab', tab: null, admin: 'overview' },
  online: navigator.onLine, syncing: false, pending: 0, search: '', filter: {}, layout: null, alerts: 0, limit: CONFIG.PAGE, auditQ: { page: 0, filters: {} }, adminTimer: null, tabView: {} };
const t = (k, ...a) => { const v = (I18N[S.lang] || I18N.en)[k] ?? I18N.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const fl = f => (S.lang === 'ar' && f.ar) ? f.ar : f.label;
const tl = tb => (S.lang === 'ar' && tb.ar) ? tb.ar : tb.label;
const typeName = k => (T_TYPES[S.lang] || T_TYPES.en)[k] || k;

/* ----------------------------- icons ----------------------------- */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', check: '<path d="M20 6 9 17l-5-5"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  spin: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sync: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* ----------------------------- IndexedDB ----------------------------- */
const DB = (() => {
  let db;
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('hr_erp', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('records', { keyPath: 'k' }); d.createObjectStore('meta', { keyPath: 'k' }); d.createObjectStore('queue', { keyPath: 'qid', autoIncrement: true }); d.createObjectStore('files', { keyPath: 'lid' }); };
    r.onsuccess = () => { db = r.result; res(); }; r.onerror = () => rej(r.error);
  });
  const tx = (s, m, fn) => new Promise((res, rej) => { const x = db.transaction(s, m); const rq = fn(x.objectStore(s)); x.oncomplete = () => res(rq && rq.result); x.onerror = () => rej(x.error); x.onabort = () => rej(x.error); });
  return { open, get: (s, k) => tx(s, 'readonly', st => st.get(k)), put: (s, v) => tx(s, 'readwrite', st => st.put(v)), del: (s, k) => tx(s, 'readwrite', st => st.delete(k)), all: s => tx(s, 'readonly', st => st.getAll()), clear: s => tx(s, 'readwrite', st => st.clear()) };
})();
const meta = { get: async k => (await DB.get('meta', k))?.v, set: (k, v) => DB.put('meta', { k, v }) };

/* ----------------------------- schema logic (mirrors Code.gs) ----------------------------- */
function cond(expr, data) {
  if (!expr) return true;
  const m = String(expr).match(/^(.+?)(!=|=)(.*)$/); if (!m) return true;
  const want = m[3].split('|').map(s => s.trim()); const v = data[m[1].trim()];
  const hit = (Array.isArray(v) ? v.map(String) : [String(v ?? '')]).some(x => want.includes(x));
  return m[2] === '!=' ? !hit : hit;
}
function calcVal(expr, data) {
  try {
    const s = String(expr).replace(/\{([^}]+)\}|[A-Za-z_]\w*/g, (m0, k) => String(Number(data[(k || m0).trim()]) || 0));
    if (!/^[0-9+\-*/().\s%]*$/.test(s)) return '';
    const r = Function('"use strict";return (' + s + ')')(); return isFinite(r) ? Math.round(r * 100) / 100 : '';
  } catch (e) { return ''; }
}
const schemaOf = tab => S.tabs.find(x => x.name === tab);
const vf = sc => sc.fields.filter(f => !f.hidden);
const canR = (sc, r) => (sc.rights || '').includes(r);
const blank = f => f.type === 'checkbox' ? false : (f.type === 'multiselect' || f.type === 'file') ? [] : '';
const blankDraft = sc => Object.fromEntries(sc.fields.map(f => [f.key, blank(f)]));
function recalc(sc, d) { sc.fields.forEach(f => { if (f.type === 'calc') d[f.key] = calcVal(f.calc, d); }); }
const isEmpty = v => v === '' || v == null || (Array.isArray(v) && !v.length);
function fieldError(sc, f, d) {
  if (f.showIf && !cond(f.showIf, d)) return '';
  const v = d[f.key], req = f.req || (f.reqIf && cond(f.reqIf, d));
  if (req && f.type !== 'checkbox' && f.type !== 'calc' && isEmpty(v)) return t('required');
  if (isEmpty(v)) return '';
  if (f.type === 'number') { if (isNaN(Number(v))) return '#'; if (f.min !== undefined && v < f.min) return '≥ ' + f.min; if (f.max !== undefined && v > f.max) return '≤ ' + f.max; }
  if (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return '@';
  return '';
}
function validateDraft(sc, d) { const e = {}; sc.fields.forEach(f => { if (!f.hidden || f.req) { const m = fieldError(sc, f, d); if (m) e[f.key] = m; } }); return e; }
function displayVal(f, v) {
  if (isEmpty(v)) return '';
  switch (f.type) {
    case 'file': return '📎 ' + v.length;
    case 'checkbox': return v ? '✓' : '—';
    case 'multiselect': return v.join(', ');
    case 'number': case 'calc': return Number(v).toLocaleString(S.lang === 'ar' ? 'ar-EG' : undefined);
    case 'date': try { return new Date(v + 'T00:00').toLocaleDateString(S.lang === 'ar' ? 'ar-EG' : undefined, { dateStyle: 'medium' }); } catch (e) { return v; }
    case 'datetime': try { return new Date(v).toLocaleString(S.lang === 'ar' ? 'ar-EG' : undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return v; }
    default: return String(v);
  }
}

/* ----------------------------- relative time ----------------------------- */
function relTime(ms) {
  if (!ms) return t('never');
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return t('justNow'); if (m < 60) return t('minAgo', m); if (m < 1440) return t('hrAgo', Math.floor(m / 60)); return t('dayAgo', Math.floor(m / 1440));
}

/* ----------------------------- API ----------------------------- */
async function api(action, payload = {}, { auth = true } = {}) {
  const body = JSON.stringify({ action, token: auth ? S.token : undefined, ...payload });
  let r;
  try { r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' }); }
  catch (e) { setOnline(false); throw Object.assign(new Error('network'), { code: 'network' }); }
  let j; try { j = await r.json(); } catch (e) { setOnline(false); throw Object.assign(new Error('bad_response'), { code: 'network' }); }
  setOnline(true);
  if (!j.ok) { const err = new Error(j.message || j.error); err.code = j.error; err.data = j; if (j.error === 'auth' && auth) handleAuthExpired(); throw err; }
  return j;
}
function uploadFile(tab, field, file, onProgress) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('read'));
    rd.onload = () => {
      const b64 = String(rd.result).split(',')[1] || '';
      const x = new XMLHttpRequest(); x.open('POST', CONFIG.API_URL); x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      x.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onerror = () => reject(Object.assign(new Error('network'), { code: 'network' }));
      x.onload = () => { try { const j = JSON.parse(x.responseText); if (j.ok) { setOnline(true); resolve(j.file); } else { if (j.error === 'auth') handleAuthExpired(); reject(Object.assign(new Error(j.message || j.error), { code: j.error })); } } catch (e) { reject(Object.assign(new Error('bad'), { code: 'network' })); } };
      x.send(JSON.stringify({ action: 'upload', token: S.token, tab, field, name: file.name, mime: file.type, data: b64 }));
    };
    rd.readAsDataURL(file);
  });
}

/* ----------------------------- connectivity + status pill ----------------------------- */
function setOnline(v) { if (S.online === v) return; S.online = v; renderStatus(); if (v) flush(); }
function statusInfo() {
  if (!navigator.onLine || !S.online) return S.pending ? { c: 'err', txt: t('offlineN', S.pending) } : { c: 'warn', txt: t('offlineN', 0) };
  if (S.syncing) return { c: 'busy', txt: t('syncing') };
  if (S.pending) return { c: 'warn', txt: t('pendingN', S.pending) };
  return { c: 'ok', txt: t('synced') };
}
function renderStatus() { const el = $('#statusPill'); if (!el) return; const s = statusInfo(); el.className = 'pill ' + s.c; el.innerHTML = `<span class="d"></span><span class="hidden sm:inline">${esc(s.txt)}</span>${S.pending && s.c !== 'busy' ? `<b class="sm:hidden">${S.pending}</b>` : ''}`; el.title = s.txt; }
async function refreshPending() { S.pending = (await DB.all('queue')).length; renderStatus(); }

/* ----------------------------- local data ----------------------------- */
const dataOf = tab => S.data[tab] || (S.data[tab] = new Map());
const mkServerRec = r => { const rec = { ...r }; rec._srv = clone(Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')))); delete rec._pending; return rec; };
async function putLocal(tab, rec) { dataOf(tab).set(rec._id, rec); await DB.put('records', { k: tab + '|' + rec._id, tab, rec }); }
async function delLocal(tab, id) { dataOf(tab).delete(id); await DB.del('records', tab + '|' + id); }
async function loadLocal() {
  S.data = {};
  (await DB.all('records')).forEach(r => dataOf(r.tab).set(r.rec._id, r.rec));
  S.lastSync = (await meta.get('lastSync')) || {};
}
async function pullTab(tab) {
  const since = S.lastSync[tab] || 0;
  const r = await api('list', { tab, since });
  const m = dataOf(tab);
  if (r.full) { const ids = new Set(r.records.map(x => x._id)); for (const [id, rec] of [...m]) if (!ids.has(id) && !rec._pending) await delLocal(tab, id); }
  for (const rec of r.records) { const cur = m.get(rec._id); if (cur && cur._pending) continue; await putLocal(tab, mkServerRec(rec)); }
  for (const id of r.deleted) { const cur = m.get(id); if (cur && !cur._pending) await delLocal(tab, id); }
  S.lastSync[tab] = r.serverTime - 2000; await meta.set('lastSync', S.lastSync);
}
async function pullAll() { await Promise.all(S.tabs.map(tb => pullTab(tb.name).catch(e => { if (e.code !== 'network' && e.code !== 'auth') { console.warn(e); toast(`${tb.label}: ${e.message}`, 'err', { ms: 8000 }); } }))); }

/* ----------------------------- queue / sync engine ----------------------------- */
async function enqueue(op) {
  const q = await DB.all('queue');
  const same = q.find(o => o.tab === op.tab && o.id === op.id);
  if (op.type === 'update' && same && (same.type === 'create' || same.type === 'update')) { same.data = { ...same.data, ...op.data }; await DB.put('queue', same); }
  else if (op.type === 'delete' && same && same.type === 'create') { for (const o of q.filter(o => o.tab === op.tab && o.id === op.id)) await DB.del('queue', o.qid); }
  else if (op.type === 'delete' && same) { for (const o of q.filter(o => o.tab === op.tab && o.id === op.id)) await DB.del('queue', o.qid); await DB.put('queue', op); }
  else await DB.put('queue', op);
  await refreshPending();
}
async function saveRecord(tab, id, data, isNew) {
  const sc = schemaOf(tab), m = dataOf(tab), ex = m.get(id);
  const clean = {}; sc.fields.forEach(f => { if (f.key in data && !f.readonly) clean[f.key] = data[f.key]; });
  let rec, op;
  if (isNew) { rec = { _id: id, ...clean, _updated: Date.now(), _by: S.user.username, _pending: true }; op = { opId: uid(), tab, type: 'create', id, data: clean, ts: Date.now() }; }
  else {
    const changed = {}, base = {};
    sc.fields.forEach(f => { if (f.key in clean && JSON.stringify(clean[f.key]) !== JSON.stringify(ex[f.key] ?? blank(f))) { changed[f.key] = clean[f.key]; base[f.key] = ex._srv ? (ex._srv[f.key] ?? blank(f)) : (ex[f.key] ?? blank(f)); } });
    if (!Object.keys(changed).length) return;
    rec = { ...ex, ...clean, _pending: true }; op = { opId: uid(), tab, type: 'update', id, data: changed, base, ts: Date.now() };
  }
  recalc(sc, rec);
  await putLocal(tab, rec); await enqueue(op); renderList(); flush();
}
async function deleteRecord(tab, id) { await delLocal(tab, id); await enqueue({ opId: uid(), tab, type: 'delete', id, ts: Date.now() }); renderList(); flush(); }

let flushing = false;
async function flush() {
  if (flushing || !S.token || !navigator.onLine) return;
  const ops = (await DB.all('queue')).sort((a, b) => a.qid - b.qid);
  S.pending = ops.length; if (!ops.length) { renderStatus(); return; }
  flushing = true; S.syncing = true; S.syncError = null; renderStatus();
  try {
    for (const op of ops) await uploadPendingFiles(op);
    const res = await api('sync', { ops: ops.map(({ qid, ...o }) => o) });
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i], r = res.results[i]; if (!r) continue;
      await DB.del('queue', op.qid);
      if (r.status === 'ok' || r.status === 'conflict') {
        if (op.type === 'delete') { /* already removed locally */ }
        else if (r.record) { const cur = dataOf(op.tab).get(op.id); const later = (await DB.all('queue')).some(o => o.tab === op.tab && o.id === op.id); if (!later || !cur) await putLocal(op.tab, mkServerRec(r.record)); else { cur._srv = mkServerRec(r.record)._srv; await putLocal(op.tab, cur); } }
        if (r.status === 'conflict') showConflict(op, r);
      } else {
        if (r.error === 'forbidden') toast(r.message || t('saveFail'), 'err');
        else toast(`${t('saveFail')}: ${r.message}`, 'err', { ms: 6000 });
        await pullTab(op.tab).catch(() => {}); await dropLocalPending(op.tab, op.id);
      }
    }
  } catch (e) { S.syncError = e.code === 'network' ? t('networkErr') : e.message; if (e.code !== 'network' && e.code !== 'auth') toast(e.message, 'err'); }
  finally { flushing = false; S.syncing = false; await refreshPending(); if (!S.syncError && !S.pending) S.lastOk = Date.now(); if (S.pending && navigator.onLine && S.online && S.token) setTimeout(flush, 1500); renderList(); }
}
async function dropLocalPending(tab, id) { const r = dataOf(tab).get(id); if (r && r._pending && !(await DB.all('queue')).some(o => o.tab === tab && o.id === id)) { if (r._srv) { await putLocal(tab, mkServerRec({ _id: id, ...r._srv, _updated: r._updated })); } else await delLocal(tab, id); } }
async function uploadPendingFiles(op) {
  if (op.type === 'delete' || !op.data) return;
  let dirty = false;
  for (const [key, val] of Object.entries(op.data)) {
    if (!Array.isArray(val)) continue;
    for (let i = 0; i < val.length; i++) {
      const it = val[i]; if (!it || !it.pending) continue;
      const rec = await DB.get('files', it.lid); if (!rec) { val.splice(i--, 1); dirty = true; continue; }
      const f = await uploadFile(op.tab, key, new File([rec.blob], rec.name, { type: rec.type }));
      val[i] = f; await DB.del('files', it.lid); dirty = true;
      const loc = dataOf(op.tab).get(op.id); if (loc && Array.isArray(loc[key])) { loc[key] = loc[key].map(x => x.lid === it.lid ? f : x); await putLocal(op.tab, loc); }
    }
  }
  if (dirty && op.qid) await DB.put('queue', op);
}
let manualSync = false;
function setSyncBtn(on) { const b = $('#syncBtn'); if (!b) return; b.disabled = on; b.firstElementChild.classList.toggle('spin', on); }
async function syncNow() {
  if (manualSync || !S.token) return;
  if (!navigator.onLine) { toast(t('offlineN', S.pending), 'warn'); return; }
  manualSync = true; setSyncBtn(true); closeSheet(true);
  try {
    while (flushing) await sleep(200);
    await flush(); while (flushing) await sleep(200);
    S.syncing = true; renderStatus();
    S.tabs.forEach(tb => { S.lastSync[tb.name] = 0; });                    // full pull = verify local copy against the server
    const failed = [];
    await Promise.all(S.tabs.map(async tb => { try { await pullTab(tb.name); } catch (e) { failed.push(`${tb.label}: ${e.code === 'network' ? t('networkErr') : e.message}`); } }));
    await refreshPending();
    const count = S.tabs.reduce((n, tb) => n + dataOf(tb.name).size, 0);
    if (failed.length) toast(`${t('syncFailed')} — ${failed[0]}`, 'err', { ms: 7000 });
    else if (S.pending) toast(`${t('pendingN', S.pending)}${S.syncError ? ' — ' + S.syncError : ''}`, 'warn', { ms: 6000 });
    else { S.lastOk = Date.now(); toast(t('syncVerified', count, S.tabs.length), 'ok'); }
  } catch (e) { toast(`${t('syncFailed')} — ${e.message}`, 'err', { ms: 6000 }); }
  finally { manualSync = false; S.syncing = false; setSyncBtn(false); renderStatus(); renderList(); }
}
async function openSyncInfo() {
  const ops = (await DB.all('queue')).sort((a, b) => a.qid - b.qid), s = statusInfo();
  const label = op => { const sc = schemaOf(op.tab), rec = dataOf(op.tab).get(op.id), f = sc && vf(sc)[0]; return (rec && f ? displayVal(f, rec[f.key]) : '') || String(op.id).slice(0, 8); };
  const o = openSheet(`<div class="hd"><h3>${ic('sync')} ${esc(t('syncStatus'))}</h3><button class="btn icon ghost" data-s="x">${ic('x')}</button></div>
    <div class="card" style="margin-bottom:12px"><span class="pill ${s.c}"><span class="d"></span>${esc(s.txt)}</span><div class="muted" style="margin-top:8px;font-size:13px">${esc(t('lastSyncAt', S.lastOk ? fullTime(S.lastOk) : '—'))}</div>${S.syncError ? `<div style="margin-top:6px;color:var(--err);font-size:13px">${esc(S.syncError)}</div>` : ''}</div>
    ${ops.length ? ops.map(op => `<div class="urow"><span class="badge ${esc(op.type)}">${esc(op.type)}</span><div style="flex:1;min-width:0"><b>${esc(label(op))}</b><div class="muted" style="font-size:12px">${esc(op.tab)} · ${esc(relTime(op.ts))}</div></div><button class="btn icon danger" data-s="drop" data-q="${op.qid}">${ic('trash')}</button></div>`).join('') : `<div class="muted" style="padding:6px 0 12px">${esc(t('nothingPending'))}</div>`}
    <button class="btn primary" data-s="sync" style="width:100%;margin-top:14px">${ic('sync')} ${esc(t('syncNow'))}</button>`);
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    if (b.dataset.s === 'x') return closeSheet();
    if (b.dataset.s === 'sync') return syncNow();
    if (b.dataset.s === 'drop') {
      if (!await confirmDlg(t('discardConfirm'))) return;
      const op = (await DB.all('queue')).find(x => x.qid === +b.dataset.q); if (!op) return;
      await DB.del('queue', op.qid); await dropLocalPending(op.tab, op.id);
      if (op.type === 'delete') await pullTab(op.tab).catch(() => {});
      await refreshPending(); renderList(); openSyncInfo();
    }
  });
}

function showConflict(op, r) {
  const sc = schemaOf(op.tab); if (!sc) return;
  const rows = r.conflicts.map(c => { const f = sc.fields.find(x => x.key === c.field); return `<div class="card" style="margin-bottom:10px"><b>${esc(fl(f))}</b><div class="muted" style="font-size:13px;margin-top:6px">${esc(t('keepMine'))}: <b style="color:var(--text)">${esc(displayVal(f, c.mine) || '—')}</b></div><div class="muted" style="font-size:13px">${esc(t('keepTheirs'))}: <b style="color:var(--text)">${esc(displayVal(f, c.theirs) || '—')}</b></div></div>`; }).join('');
  const o = openSheet(`<div class="hd"><h3>⚠️ ${esc(t('conflictTitle'))}</h3></div><p class="muted" style="margin-top:0">${esc(t('conflictBody'))}</p>${rows}<div style="display:flex;gap:10px"><button class="btn" data-x="theirs" style="flex:1">${esc(t('keepTheirs'))}</button><button class="btn primary" data-x="mine" style="flex:1">${esc(t('keepMine'))}</button></div>`);
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'mine') { const data = {}, base = {}; r.conflicts.forEach(c => { data[c.field] = c.mine; base[c.field] = c.theirs; }); const rec = dataOf(op.tab).get(op.id); if (rec) { Object.assign(rec, data); rec._pending = true; await putLocal(op.tab, rec); } await enqueue({ opId: uid(), tab: op.tab, type: 'update', id: op.id, data, base, force: true, ts: Date.now() }); flush(); }
    closeSheet(true); renderList();
  });
}

/* ----------------------------- UI primitives ----------------------------- */
function toast(msg, type = 'ok', opts = {}) {
  const box = $('#toasts'); const el = document.createElement('div'); el.className = 'toast ' + type;
  el.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>${opts.action ? `<button class="tbtn">${esc(opts.action)}</button>` : ''}`;
  box.appendChild(el); requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  if (opts.action) $('.tbtn', el).onclick = () => { opts.onAction && opts.onAction(); close(); };
  setTimeout(close, opts.ms || 3200); return close;
}
function openSheet(html, { wide = false, onClose } = {}) {
  closeSheet(true);
  const o = document.createElement('div'); o.id = 'overlay'; o.className = 'overlay';
  o.innerHTML = `<div class="sheet glass ${wide ? 'wide' : ''}" role="dialog"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(o); o._onClose = onClose; requestAnimationFrame(() => o.classList.add('open'));
  o.addEventListener('mousedown', e => { if (e.target === o) closeSheet(); });
  const sh = $('.sheet', o); let y0 = null, dy = 0; const g = $('.grab', o);
  g.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; sh.style.transition = 'none'; }, { passive: true });
  g.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  g.addEventListener('touchend', () => { sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) closeSheet(); y0 = null; dy = 0; });
  return o;
}
function closeSheet(silent) { const o = $('#overlay'); if (!o) return; o.classList.remove('open'); o.id = ''; const cb = o._onClose; setTimeout(() => o.remove(), 240); if (!silent && cb) cb(); }
function confirmDlg(msg, danger = true) {
  return new Promise(res => {
    const o = document.createElement('div'); o.id = 'dlg'; o.className = 'overlay';
    o.style.alignItems = 'center'; o.innerHTML = `<div class="sheet glass" style="max-width:360px;border-radius:22px;transform:scale(.94)"><div class="sheet-body" style="padding:22px"><p style="margin:0 0 18px;font-weight:600">${esc(msg)}</p><div style="display:flex;gap:10px"><button class="btn" style="flex:1" data-r="0">${esc(t('cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" style="flex:1" data-r="1">${esc(t('del'))}</button></div></div></div>`;
    document.body.appendChild(o); requestAnimationFrame(() => { o.classList.add('open'); $('.sheet', o).style.transform = 'none'; });
    o.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b || e.target === o) { o.classList.remove('open'); setTimeout(() => o.remove(), 200); res(b?.dataset.r === '1'); } });
  });
}
function micButton(target) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return '';
  return `<button type="button" class="btn icon ghost" data-mic="${esc(target)}" title="${esc(t('mic'))}">${ic('mic')}</button>`;
}
function startVoice(btn, input) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR || !input) return;
  const rec = new SR(); rec.lang = S.lang === 'ar' ? 'ar-EG' : 'en-US'; rec.interimResults = false;
  btn.style.color = 'var(--err)';
  rec.onresult = e => { const txt = e.results[0][0].transcript; input.value = (input.value ? input.value + ' ' : '') + txt; input.dispatchEvent(new Event('input', { bubbles: true })); };
  rec.onend = () => { btn.style.color = ''; }; rec.onerror = () => { btn.style.color = ''; }; rec.start();
}

/* ----------------------------- theme / language ----------------------------- */
function applyTheme() { document.documentElement.dataset.theme = S.theme; document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#0f172a' : '#f1f5f9'; }
function applyLang() { document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr'; }
function toggleTheme() { S.theme = S.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('hr_theme', S.theme); applyTheme(); renderApp(); }
function toggleLang() { S.lang = S.lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('hr_lang', S.lang); applyLang(); closeSheet(true); S.user ? renderApp() : renderLogin(); }

/* ----------------------------- session ----------------------------- */
function handleAuthExpired() {
  if (!S.token) return; S.token = null; localStorage.removeItem('hr_token'); stopTimers(); closeSheet(true);
  toast(t('sessionExpired'), 'warn', { ms: 5000 }); renderLogin();
}
async function logout() {
  const pend = await DB.all('queue'); if (pend.length && navigator.onLine) await flush();
  try { await api('logout'); } catch (e) {}
  S.token = null; localStorage.removeItem('hr_token'); stopTimers(); renderLogin();
}
let hbTimer, syncTimer;
function startTimers() {
  stopTimers();
  hbTimer = setInterval(async () => {
    if (!S.token || !navigator.onLine) return;
    try {
      const r = await api('ping');
      if (S.user && r.pv && S.user.pv && r.pv !== S.user.pv) { toast(t('permsChanged'), 'warn'); await refresh(); renderApp(); }
      if (S.user?.role === 'admin' && typeof r.alerts === 'number') { if (r.alerts > S.alerts) toast('🚨 ' + t('openAlerts') + ': ' + r.alerts, 'err', { ms: 6000 }); S.alerts = r.alerts; renderBell(); }
    } catch (e) {}
  }, CONFIG.HEARTBEAT_MS);
  syncTimer = setInterval(() => { if (S.token) { flush(); } }, CONFIG.SYNC_MS);
}
function stopTimers() { clearInterval(hbTimer); clearInterval(syncTimer); clearInterval(S.adminTimer); }

async function refresh() {
  const b = await api('bootstrap');
  S.user = b.user; S.tabs = b.tabs; if (b.settings) applySettings(b.settings); await meta.set('user', S.user); await meta.set('schema', S.tabs);
  if (!S.tabs.find(x => x.name === S.view.tab)) S.view.tab = S.tabs[0]?.name || null;
  await pullAll();
}

/* ----------------------------- login ----------------------------- */
function renderLogin(msg) {
  closeSheet(true); hideSplash();
  const feat = (icn, k) => `<div class="feat"><span class="fi-ic">${ic(icn)}</span><span>${esc(t(k))}</span></div>`;
  $('#app').innerHTML = `<div class="login"><div class="login-card glass">
    <div class="login-side">
      <div style="display:flex;align-items:center;gap:14px">${logoHtml('lg')}<div><h1>${esc(brandName())}</h1><div class="muted" style="font-size:13.5px">${esc(brandTag())}</div></div></div>
      <div style="margin:26px 0 8px;height:1px;background:linear-gradient(90deg,var(--border),transparent)"></div>
      ${feat('shield', 'feat1')}${feat('grid', 'feat2')}${feat('chat', 'feat3')}${feat('download', 'feat4')}
      <div style="margin-top:auto" class="muted">✦ ${esc(brandTag())}</div>
    </div>
    <form class="login-form" id="loginForm" autocomplete="on">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px">${logoHtml('sm')}<b style="font-size:16px">${esc(brandName())}</b></div>
        <div style="display:flex;gap:6px"><button type="button" class="btn icon ghost" data-act="theme">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button><button type="button" class="btn icon ghost" data-act="lang">${ic('globe')}<b style="font-size:12px">${S.lang === 'ar' ? 'EN' : 'ع'}</b></button></div>
      </div>
      <h2 style="margin:0 0 4px;font-size:24px;font-weight:800">${esc(t('signIn'))}</h2>
      <p class="muted" style="margin:0 0 22px;font-size:13.5px">${esc(t('loginHint'))}</p>
      <div class="fld"><label class="lab">${esc(t('username'))}</label><div style="position:relative"><span style="position:absolute;top:11px;inset-inline-start:12px;color:var(--muted);display:flex">${ic('user')}</span><input class="inp" id="lu" name="username" style="padding-inline-start:40px" autocomplete="username" autocapitalize="none" required></div></div>
      <div class="fld"><label class="lab">${esc(t('password'))}</label><div style="position:relative"><span style="position:absolute;top:11px;inset-inline-start:12px;color:var(--muted);display:flex">${ic('lock')}</span><input class="inp" id="lp" name="password" type="password" style="padding-inline-start:40px" autocomplete="current-password" required></div></div>
      <div id="lmsg" style="min-height:22px;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--err)">${esc(msg || '')}</div>
      <button class="btn primary" id="lbtn" style="width:100%;padding:13px">${ic('check')} ${esc(t('login'))}</button>
      <div class="muted" style="text-align:center;margin-top:18px;font-size:12px">🔒 ${esc(t('secureLogin'))}</div>
    </form></div></div>`;
  const last = localStorage.getItem('hr_lastuser'); if (last) $('#lu').value = last;
  $('#loginForm').addEventListener('submit', onLogin);
}
let lockTimer;
async function onLogin(e) {
  e.preventDefault(); const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lbtn'), msg = $('#lmsg');
  btn.disabled = true; btn.innerHTML = ic('spin', 'spin'); msg.textContent = '';
  try {
    const r = await api('login', { username: u, password: p, device: navigator.userAgent.slice(0, 120) }, { auth: false });
    if (localStorage.getItem('hr_lastuser') && localStorage.getItem('hr_lastuser') !== r.user.username) { await Promise.all(['records', 'queue', 'files', 'meta'].map(s => DB.clear(s))); S.data = {}; S.lastSync = {}; }
    S.token = r.token; S.user = r.user; localStorage.setItem('hr_token', r.token); localStorage.setItem('hr_lastuser', r.user.username);
    await refresh(); await refreshPending(); startTimers(); renderApp(); flush();
  } catch (err) {
    btn.disabled = false; btn.textContent = t('login');
    if (err.code === 'locked') {
      let s = err.data.retryAfter || 300; clearInterval(lockTimer); btn.disabled = true;
      const tick = () => { if (s <= 0) { clearInterval(lockTimer); msg.textContent = ''; btn.disabled = false; return; } msg.textContent = '🔒 ' + t('lockedFor', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); s--; };
      tick(); lockTimer = setInterval(tick, 1000);
    } else if (err.code === 'invalid') { msg.textContent = t('invalid') + (err.data.attemptsLeft != null ? ' — ' + t('attemptsLeft', err.data.attemptsLeft) : ''); $('.login-card').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); }
    else if (err.code === 'disabled') msg.textContent = t('disabled');
    else msg.textContent = err.code === 'network' ? t('networkErr') : err.message;
  }
}

/* ----------------------------- shell ----------------------------- */
function navItems() {
  const items = S.tabs.map(tb => ({ id: 'tab:' + tb.name, em: tb.icon || '📄', label: tl(tb), on: S.view.kind === 'tab' && S.view.tab === tb.name }));
  if (S.user.role === 'admin') items.push({ id: 'admin', em: '🛡️', label: t('admin'), on: S.view.kind === 'admin' });
  return items;
}
function renderApp() {
  hideSplash();
  if (!S.user || !S.token) { renderLogin(); return; }
  const items = navItems(), isAdmin = S.user.role === 'admin';
  $('#app').innerHTML = `<div class="shell">
    <aside class="side glass hidden lg:flex"><div style="display:flex;align-items:center;gap:10px;padding:6px 8px 16px">${logoHtml('sm')}<b style="font-size:17px">${esc(brandName())}</b></div>
      ${items.map(i => `<button class="navi ${i.on ? 'on' : ''}" data-act="nav" data-id="${esc(i.id)}"><span class="em">${i.em}</span><span>${esc(i.label)}</span></button>`).join('')}</aside>
    <div class="main-col"><header class="topbar glass">
      <div style="flex:1;min-width:0"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="hdTitle"></div><div class="muted" style="font-size:12px">${esc(S.user.name || S.user.username)}</div></div>
      <span id="statusPill" class="pill" data-act="syncinfo" style="cursor:pointer"></span>
      <button class="btn icon ghost" id="syncBtn" data-act="sync" title="${esc(t('syncNow'))}">${ic('sync')}</button>
      ${isAdmin ? `<button class="btn icon ghost" id="bell" data-act="alerts" style="position:relative">${ic('bell')}<span id="bellN"></span></button>` : ''}
      <button class="btn icon ghost" data-act="theme" title="${esc(t('theme'))}">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button>
      <button class="btn icon ghost" data-act="lang" title="${esc(t('language'))}">${ic('globe')}<b style="font-size:12px">${S.lang === 'ar' ? 'EN' : 'ع'}</b></button>
      <button class="btn icon ghost" data-act="logout" title="${esc(t('logout'))}">${ic('logout')}</button></header>
      <main id="main"></main>
      <nav class="bottom-nav glass">${items.map(i => `<button class="bnav ${i.on ? 'on' : ''}" data-act="nav" data-id="${esc(i.id)}"><span class="em">${i.em}</span><span>${esc(i.label)}</span></button>`).join('')}</nav></div></div>
    <button id="fab" data-act="add" aria-label="${esc(t('add'))}" style="display:none">${ic('plus')}</button>`;
  renderStatus(); renderBell(); renderMain();
}
function renderBell() { const n = $('#bellN'); if (!n) return; n.innerHTML = S.alerts ? `<i style="position:absolute;top:2px;inset-inline-end:2px;min-width:16px;height:16px;border-radius:9px;background:var(--err);color:#fff;font-size:10px;font-style:normal;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">${S.alerts}</i>` : ''; }
function renderMain() {
  clearInterval(S.adminTimer);
  if (S.view.kind === 'admin' && S.user.role === 'admin') { $('#hdTitle').textContent = '🛡️ ' + t('admin'); $('#fab').style.display = 'none'; renderAdmin(); }
  else { S.view.kind = 'tab'; renderTabShell(); }
}

/* ----------------------------- tab view ----------------------------- */
function renderTabShell() {
  const main = $('#main'), fab = $('#fab'), sc = schemaOf(S.view.tab);
  if (!sc) { $('#hdTitle').textContent = brandName(); fab.style.display = 'none'; main.innerHTML = `<div class="card" style="text-align:center;padding:40px">${esc(t('noTabs'))}</div>`; return; }
  $('#hdTitle').textContent = `${sc.icon || ''} ${tl(sc)}`; fab.style.display = canR(sc, 'w') ? 'flex' : 'none';
  const sel = vf(sc).find(f => f.type === 'select' && f.options?.length);
  const mode = S.tabView[sc.name] || 'dash';
  const lay = S.layout || (innerWidth >= 1024 ? 'table' : 'cards');
  main.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
      <div class="seg"><button class="segbtn ${mode === 'dash' ? 'on' : ''}" data-act="tview" data-id="dash">${ic('dash')}<span class="hidden sm:inline">${esc(t('dashboard'))}</span></button><button class="segbtn ${mode === 'list' ? 'on' : ''}" data-act="tview" data-id="list">${ic('list')}<span class="hidden sm:inline">${esc(t('records'))}</span></button></div>
      <div style="position:relative;flex:1;min-width:170px"><span style="position:absolute;top:11px;inset-inline-start:12px;color:var(--muted)">${ic('search')}</span>
      <input id="q" class="inp" style="padding-inline-start:42px" placeholder="${esc(t('search'))}" autocomplete="off" value="${esc(S.search)}"><div id="sugg" class="sugg glass" style="display:none"></div></div>
      <button class="btn icon" data-act="export" title="${esc(t('exportExcel'))}">${ic('download')}</button>
      ${mode === 'list' ? `<button class="btn icon" data-act="layout" title="layout">${ic(lay === 'table' ? 'grid' : 'list')}</button>` : ''}</div>
    ${mode === 'list' && sel ? `<div class="chips" id="fchips" style="margin-bottom:14px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px"><button class="chip ${!S.filter[sc.name] ? 'on' : ''}" data-f="">${esc(t('all'))}</button>${sel.options.map(o => `<button class="chip ${S.filter[sc.name] === o ? 'on' : ''}" data-f="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
    <div id="list"></div>`;
  const q = $('#q'); q.addEventListener('input', debounce(() => { S.search = q.value; S.limit = CONFIG.PAGE; if ((S.tabView[sc.name] || 'dash') === 'list') renderList(); renderSugg(); }, 80));
  q.addEventListener('focus', renderSugg); q.addEventListener('blur', () => setTimeout(() => { const s = $('#sugg'); if (s) s.style.display = 'none'; }, 180));
  if (mode === 'list') renderList(); else renderDash(sc);
}
function renderDash(sc) {
  const box = $('#list'); if (!box) return;
  const recs = [...dataOf(sc.name).values()].sort((a, b) => (b._updated || 0) - (a._updated || 0));
  const sod = new Date(); sod.setHours(0, 0, 0, 0);
  const today = recs.filter(r => (r._updated || 0) >= sod.getTime()).length;
  const pending = recs.filter(r => r._pending).length;
  const files = recs.reduce((n, r) => n + vf(sc).filter(f => f.type === 'file').reduce((m, f) => m + ((r[f.key] || []).length), 0), 0);
  const nums = vf(sc).filter(f => ['number', 'calc'].includes(f.type)).slice(0, 4);
  const sels = vf(sc).filter(f => f.type === 'select' && f.options && f.options.length).slice(0, 3);
  const tf = vf(sc)[0];
  const stat = (l, v, c) => `<div class="stat"><small>${esc(l)}</small><b style="color:${c || 'var(--text)'}">${v}</b></div>`;
  box.innerHTML = `<div class="statgrid">${stat(t('total'), recs.length)}${stat(t('today'), today, 'var(--accent)')}${pending ? stat(t('pending'), pending, 'var(--warn)') : ''}${files ? stat('📎 ' + t('attachments'), files) : ''}${nums.map(f => { const s = recs.reduce((a, r) => a + (Number(r[f.key]) || 0), 0); return s ? stat(`${esc(fl(f))} · ${esc(t('sum'))}`, displayVal(f, s), 'var(--ok)') : ''; }).join('')}</div>
  ${sels.map(f => { const c = {}; recs.forEach(r => { const v = r[f.key] || '—'; c[v] = (c[v] || 0) + 1; }); return `<div class="card glass" style="margin-top:12px"><b style="font-size:13px">${esc(fl(f))}</b><div class="statgrid" style="margin-top:10px">${Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="stat" data-act="dfilter" data-id="${esc(k === '—' ? '' : k)}" style="cursor:pointer" title="${esc(t('records'))}"><small>${esc(k)}</small><b>${v}</b></div>`).join('')}</div></div>`; }).join('')}
  <div class="card glass" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:13px">${esc(t('recentRecords'))}</b><button class="btn icon ghost" data-act="export">${ic('download')}</button></div>
  ${recs.slice(0, 6).map(r => `<div class="urow" data-act="open" data-id="${esc(r._id)}" style="cursor:pointer"><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(displayVal(tf, r[tf.key]) || '—')}</b>${r._pending ? ' <span class="dotp"></span>' : ''}<div class="muted" style="font-size:12px">${esc(fullTime(r._updated))}</div></div>${ic('edit')}</div>`).join('') || `<div class="muted" style="padding:8px 0">${esc(t('noData'))}</div>`}</div>`;
}
function exportXlsx() {
  const sc = schemaOf(S.view.tab); if (!sc) return;
  if (!window.XLSX) return toast(t('networkErr'), 'err');
  const fields = vf(sc), rows = rowsFor(sc);
  const aoa = [fields.map(f => fl(f))].concat(rows.map(r => fields.map(f => {
    const v = r[f.key];
    if (f.type === 'file') return (v || []).map(x => x.name).join(', ');
    if (f.type === 'checkbox') return v ? t('yes') : t('no');
    if (Array.isArray(v)) return v.join(', ');
    if (f.type === 'number' || f.type === 'calc') return v === '' || v == null ? '' : Number(v);
    return v == null ? '' : v;
  })));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = fields.map(f => ({ wch: Math.max(14, String(fl(f)).length + 6) }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sc.name.slice(0, 28));
  XLSX.writeFile(wb, `${sc.name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast(t('exportDone') + ` (${rows.length})`, 'ok');
}
function rowsFor(sc) {
  const q = S.search.trim().toLowerCase().split(/\s+/).filter(Boolean), flt = S.filter[sc.name], sel = vf(sc).find(f => f.type === 'select' && f.options?.length);
  return [...dataOf(sc.name).values()].filter(r => (!flt || !sel || r[sel.key] === flt) && (!q.length || (() => { const h = vf(sc).map(f => displayVal(f, r[f.key])).join(' ').toLowerCase(); return q.every(k => h.includes(k)); })()))
    .sort((a, b) => (b._updated || 0) - (a._updated || 0));
}
function hl(s, q) {
  s = esc(s); const tk = q.trim().split(/\s+/).filter(Boolean); if (!tk.length) return s;
  return s.replace(new RegExp('(' + tk.map(k => escRe(esc(k))).join('|') + ')', 'gi'), '<mark class="mk">$1</mark>');
}
function renderSugg() {
  const box = $('#sugg'); if (!box) return; const sc = schemaOf(S.view.tab); const q = S.search.trim();
  if (!q || !sc) { box.style.display = 'none'; return; }
  const tf = vf(sc)[0], rows = rowsFor(sc).slice(0, 5);
  box.style.display = rows.length ? 'block' : 'none';
  box.innerHTML = rows.map(r => `<button data-act="open" data-id="${esc(r._id)}">${hl(displayVal(tf, r[tf.key]) || '—', q)}</button>`).join('');
}
function renderList() {
  const box = $('#list'); const sc = schemaOf(S.view.tab); if (!box || !sc || S.view.kind !== 'tab') return;
  const rows = rowsFor(sc), q = S.search, f = vf(sc), lay = S.layout || (innerWidth >= 1024 ? 'table' : 'cards'), shown = rows.slice(0, S.limit);
  if (!rows.length) { box.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--muted)"><div style="font-size:46px;margin-bottom:8px">🗂️</div><b style="color:var(--text)">${esc(t('noData'))}</b><div>${canR(sc, 'w') ? esc(t('noDataHint')) : ''}</div></div>`; return; }
  const more = rows.length > shown.length ? `<button class="btn" style="width:100%;margin-top:8px" data-act="more">+ ${rows.length - shown.length}</button>` : '';
  if (lay === 'table') {
    const cols = f.filter(x => x.type !== 'longtext').slice(0, 8);
    box.innerHTML = `<table class="t"><thead><tr><th></th>${cols.map(c => `<th>${esc(fl(c))}</th>`).join('')}</tr></thead><tbody>${shown.map(r => `<tr class="row" data-act="open" data-id="${esc(r._id)}"><td style="width:20px">${r._pending ? '<span class="dotp"></span>' : ''}</td>${cols.map((c, i) => `<td>${i === 0 ? '<b>' : ''}${hl(displayVal(c, r[c.key]), q)}${i === 0 ? '</b>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>${more}`;
  } else {
    const tf = f[0], sel = f.find(x => x.type === 'select'), subs = f.filter(x => x !== tf && x !== sel && !['longtext', 'file', 'checkbox'].includes(x.type)).slice(0, 2);
    box.innerHTML = shown.map((r, i) => `<div class="swipe" data-id="${esc(r._id)}" style="animation-delay:${Math.min(i, 8) * 25}ms"><div class="swipe-bg"><span class="e">${ic('edit')}</span><span class="x">${ic('trash')}</span></div>
      <div class="card" data-act="open" data-id="${esc(r._id)}"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px">${hl(displayVal(tf, r[tf.key]) || '—', q)}</b>${r._pending ? '<span class="dotp"></span>' : ''}${sel && r[sel.key] ? `<span class="tag">${esc(r[sel.key])}</span>` : ''}</div>
      <div class="muted" style="font-size:13px;margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 14px">${subs.map(s => displayVal(s, r[s.key]) ? `<span>${hl(displayVal(s, r[s.key]), q)}</span>` : '').join('')}${f.some(x => x.type === 'file' && r[x.key]?.length) ? `<span>📎</span>` : ''}</div></div></div>`).join('') + more;
  }
}
/* swipe gestures on cards */
(() => {
  let st = null;
  document.addEventListener('touchstart', e => { const c = e.target.closest('.swipe .card'); if (!c) return; st = { c, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: null }; c.style.transition = 'none'; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return; const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y;
    if (st.lock == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) st.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (st.lock === 'x') { st.dx = dx; st.c.style.transform = `translateX(${dx}px)`; }
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (!st) return; const { c, dx } = st; st = null; c.style.transition = 'transform .2s'; c.style.transform = '';
    if (Math.abs(dx) < 90) return; c.dataset.sw = '1'; setTimeout(() => delete c.dataset.sw, 350);
    const id = c.dataset.id, sc = schemaOf(S.view.tab), d = dx * (document.dir === 'rtl' ? -1 : 1);
    if (d > 0) openRecord(id); else if (canR(sc, 'd')) softDelete(sc.name, id);
  });
})();
function softDelete(tab, id) {
  const m = dataOf(tab), rec = m.get(id); if (!rec) return; let undone = false;
  const el = $(`.swipe[data-id="${CSS.escape(id)}"]`); if (el) { el.style.transition = 'all .25s'; el.style.opacity = '0'; el.style.transform = 'scale(.96)'; setTimeout(() => el.style.display = 'none', 250); }
  toast(t('deleted'), 'warn', { action: t('undo'), ms: 4500, onAction: () => { undone = true; renderList(); } });
  setTimeout(() => { if (!undone) deleteRecord(tab, id); }, 4600);
}

/* ----------------------------- field rendering (form mode) ----------------------------- */
const fid = f => 'f_' + f.key.replace(/\W/g, '_');
function fieldHtml(f, v, ro) {
  const dis = (ro || f.readonly) ? 'disabled' : '', k = esc(f.key);
  let inp = '';
  switch (f.type) {
    case 'longtext': inp = `<div class="crow" style="align-items:flex-start"><textarea class="inp" id="${fid(f)}" data-k="${k}" ${dis}>${esc(v)}</textarea>${dis ? '' : micButton(fid(f))}</div>`; break;
    case 'number': inp = `<input class="inp" id="${fid(f)}" data-k="${k}" type="number" inputmode="decimal" step="any" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} value="${esc(v)}" ${dis}>`; break;
    case 'date': inp = `<input class="inp" id="${fid(f)}" data-k="${k}" type="date" value="${esc(v)}" ${dis}>`; break;
    case 'datetime': inp = `<input class="inp" id="${fid(f)}" data-k="${k}" type="datetime-local" value="${esc(v)}" ${dis}>`; break;
    case 'phone': inp = `<input class="inp" id="${fid(f)}" data-k="${k}" type="tel" inputmode="tel" dir="ltr" style="text-align:start" value="${esc(v)}" ${dis}>`; break;
    case 'email': inp = `<input class="inp" id="${fid(f)}" data-k="${k}" type="email" dir="ltr" style="text-align:start" value="${esc(v)}" ${dis}>`; break;
    case 'select':
      if (f.lookup || (f.options || []).length > 6) inp = `<input class="inp" id="${fid(f)}" data-k="${k}" list="dl_${fid(f)}" value="${esc(v)}" autocomplete="off" ${dis}><datalist id="dl_${fid(f)}">${(f.options || []).map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
      else inp = `<div class="chips" data-k="${k}" data-t="select">${(f.options || []).map(o => `<button type="button" class="chip ${v === o ? 'on' : ''}" data-v="${esc(o)}" ${dis}>${esc(o)}</button>`).join('')}</div>`; break;
    case 'multiselect': inp = `<div class="chips" data-k="${k}" data-t="multi">${(f.options || []).map(o => `<button type="button" class="chip ${(v || []).includes(o) ? 'on' : ''}" data-v="${esc(o)}" ${dis}>${esc(o)}</button>`).join('')}</div>`; break;
    case 'checkbox': inp = `<div class="switch ${v ? 'on' : ''}" data-k="${k}" data-t="check" role="switch" aria-checked="${!!v}"></div>`; break;
    case 'calc': inp = `<div class="calcv" data-calc="${k}">${esc(displayVal(f, v) || '—')}</div>`; break;
    case 'file': inp = `<div class="fz" data-k="${k}">${fileZoneHtml(f, v, ro)}</div>`; break;
    default: inp = `<div class="crow"><input class="inp" id="${fid(f)}" data-k="${k}" value="${esc(v)}" autocomplete="off" ${dis}>${dis ? '' : micButton(fid(f))}</div>`;
  }
  return `<div class="fld" data-fk="${k}"><label class="lab" for="${fid(f)}">${esc(fl(f))}<b class="req" ${f.req ? '' : 'hidden'}>*</b></label>${inp}<div class="err"></div></div>`;
}
function fileZoneHtml(f, arr, ro) {
  const max = f.maxFiles || 3;
  return `${ro || (arr || []).length >= max ? '' : `<label class="dz">${ic('upload')}<div style="margin-top:4px;font-size:13px">${esc(t('dropFiles'))}</div><input type="file" hidden multiple data-fin="${esc(f.key)}"></label>`}
  ${(arr || []).map((it, i) => `<div class="fi"><span>${ic('file')}</span><div class="nm" data-open="${i}">${esc(it.name)}${it.pending ? ' ⏳' : ''}<div class="bar" ${it.status === 'uploading' ? '' : 'hidden'}><i style="width:${Math.round((it.progress || 0) * 100)}%"></i></div></div><span class="muted">${it.size ? Math.max(1, Math.round(it.size / 1024)) + ' KB' : ''}</span>${ro ? '' : `<button type="button" class="btn icon ghost" data-rm="${i}" style="padding:4px">${ic('x')}</button>`}</div>`).join('')}`;
}
async function handleFiles(tab, f, draft, files, rerender) {
  const max = f.maxFiles || 3, maxMB = f.maxMB || CONFIG.DEFAULT_MAX_MB; draft[f.key] = draft[f.key] || [];
  for (const file of files) {
    if (draft[f.key].length >= max) { toast(t('tooMany', max), 'warn'); break; }
    if (file.size > maxMB * 1048576) { toast(t('tooLarge', file.name, maxMB), 'err'); continue; }
    const it = { lid: uid(), name: file.name, size: file.size, status: 'uploading', progress: 0 }; draft[f.key].push(it); rerender();
    const finish = r => { const i = draft[f.key].indexOf(it); if (i >= 0) draft[f.key][i] = r; rerender(); };
    if (!navigator.onLine || !S.online) { await DB.put('files', { lid: it.lid, blob: file, name: file.name, type: file.type }); finish({ lid: it.lid, name: file.name, size: file.size, pending: true }); toast(t('fileOffline'), 'warn'); continue; }
    try { const r = await uploadFile(tab, f.key, file, p => { it.progress = p; const bar = $('.bar i', $(`.fz[data-k="${CSS.escape(f.key)}"]`) || document); rerender(true); }); finish(r); }
    catch (e) {
      if (e.code === 'network') { await DB.put('files', { lid: it.lid, blob: file, name: file.name, type: file.type }); finish({ lid: it.lid, name: file.name, size: file.size, pending: true }); toast(t('fileOffline'), 'warn'); }
      else { const i = draft[f.key].indexOf(it); if (i >= 0) draft[f.key].splice(i, 1); rerender(); toast(e.message, 'err'); }
    }
  }
}
async function openFileItem(tab, it) {
  try {
    let blob;
    if (it.pending) { const r = await DB.get('files', it.lid); if (!r) return; blob = r.blob; }
    else { const r = await api('file_get', { tab, id: it.id }); const bin = atob(r.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); blob = new Blob([u8], { type: r.mime }); }
    const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast(e.code === 'network' ? t('networkErr') : e.message, 'err'); }
}

/* bind generic form behaviour to a container */
function bindForm(root, tab, sc, draft, ro) {
  const refreshAll = () => {
    recalc(sc, draft);
    sc.fields.forEach(f => {
      const w = $(`.fld[data-fk="${CSS.escape(f.key)}"]`, root); if (!w) return;
      w.classList.toggle('off', !!(f.showIf && !cond(f.showIf, draft)));
      const star = $('.req', w); if (star) star.hidden = !(f.req || (f.reqIf && cond(f.reqIf, draft)));
      if (f.type === 'calc') $('.calcv', w).textContent = displayVal(f, draft[f.key]) || '—';
    });
  };
  const rerenderFile = f => (soft) => { const z = $(`.fz[data-k="${CSS.escape(f.key)}"]`, root); if (!z) return; if (soft) { $$('.fi', z).forEach((el, i) => { const it = draft[f.key][i]; if (it && it.status === 'uploading') { $('.bar', el).hidden = false; $('.bar i', el).style.width = Math.round((it.progress || 0) * 100) + '%'; } }); return; } z.innerHTML = fileZoneHtml(f, draft[f.key], ro); };
  const onVal = e => {
    const el = e.target.closest('input[data-k],textarea[data-k]'); if (!el || el.type === 'file') return;
    draft[el.dataset.k] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    el.closest('.fld')?.classList.remove('bad'); refreshAll();
  };
  root.addEventListener('input', onVal); root.addEventListener('change', onVal);
  root.addEventListener('click', e => {
    const mic = e.target.closest('[data-mic]'); if (mic) return startVoice(mic, document.getElementById(mic.dataset.mic));
    const chip = e.target.closest('.chip'); if (chip && !chip.disabled) {
      const box = chip.closest('[data-k]'), k = box.dataset.k, v = chip.dataset.v;
      if (box.dataset.t === 'select') { draft[k] = draft[k] === v ? '' : v; $$('.chip', box).forEach(c => c.classList.toggle('on', c.dataset.v === draft[k])); }
      else { const a = draft[k] || []; draft[k] = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; chip.classList.toggle('on'); }
      box.closest('.fld')?.classList.remove('bad'); refreshAll(); return;
    }
    const sw = e.target.closest('.switch'); if (sw && !ro) { draft[sw.dataset.k] = !draft[sw.dataset.k]; sw.classList.toggle('on', draft[sw.dataset.k]); refreshAll(); return; }
    const z = e.target.closest('.fz'); if (!z) return; const f = sc.fields.find(x => x.key === z.dataset.k);
    const rm = e.target.closest('[data-rm]'); if (rm) { const it = draft[f.key].splice(+rm.dataset.rm, 1)[0]; if (it?.lid) DB.del('files', it.lid); rerenderFile(f)(); return; }
    const op = e.target.closest('[data-open]'); if (op) openFileItem(tab, draft[f.key][+op.dataset.open]);
  });
  root.addEventListener('change', e => { const fin = e.target.closest('[data-fin]'); if (!fin) return; const f = sc.fields.find(x => x.key === fin.dataset.fin); handleFiles(tab, f, draft, [...fin.files], rerenderFile(f)); fin.value = ''; });
  root.addEventListener('dragover', e => { const d = e.target.closest('.dz'); if (d) { e.preventDefault(); d.classList.add('drag'); } });
  root.addEventListener('dragleave', e => { const d = e.target.closest('.dz'); if (d) d.classList.remove('drag'); });
  root.addEventListener('drop', e => { const d = e.target.closest('.dz'); if (!d) return; e.preventDefault(); d.classList.remove('drag'); const f = sc.fields.find(x => x.key === d.closest('.fz').dataset.k); handleFiles(tab, f, draft, [...e.dataTransfer.files], rerenderFile(f)); });
  refreshAll(); return refreshAll;
}
function markErrors(root, errs) {
  $$('.fld', root).forEach(w => { const m = errs[w.dataset.fk]; w.classList.toggle('bad', !!m); const e = $('.err', w); if (e) e.textContent = m || ''; });
  const first = $('.fld.bad', root); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function submitDraft(tab, id, draft, isNew, root) {
  const sc = schemaOf(tab);
  if (Object.values(draft).some(v => Array.isArray(v) && v.some(x => x && x.status === 'uploading'))) { toast(t('uploadWait'), 'warn'); return false; }
  const errs = validateDraft(sc, draft);
  if (Object.keys(errs).length) { if (root) markErrors(root, errs); else toast(Object.values(errs)[0], 'err'); toast(t('required'), 'err'); return false; }
  const d = clone(draft); sc.fields.forEach(f => { if (f.showIf && !cond(f.showIf, d)) d[f.key] = blank(f); if (f.type === 'file') d[f.key] = (d[f.key] || []).map(x => { const { status, progress, ...r } = x; return r; }); });
  await saveRecord(tab, id, d, isNew); toast(navigator.onLine && S.online ? t('saved') : t('savedOffline'), navigator.onLine && S.online ? 'ok' : 'warn'); closeSheet(true); return true;
}

/* ----------------------------- record sheet (form mode) ----------------------------- */
function openRecord(id) {
  const tab = S.view.tab, sc = schemaOf(tab); if (!sc) return;
  const ex = id ? dataOf(tab).get(id) : null; if (id && !ex) return;
  const ro = id ? !canR(sc, 'w') : false, isNew = !id, rid = id || uid();
  const draft = ex ? Object.fromEntries(sc.fields.map(f => [f.key, clone(ex[f.key] ?? blank(f))])) : blankDraft(sc);
  const o = openSheet(`<div class="hd"><h3>${esc(isNew ? t('newRecord') : (displayVal(vf(sc)[0], ex[vf(sc)[0].key]) || tl(sc)))}${ro ? ` <span class="tag">${esc(t('readOnly'))}</span>` : ''}</h3><div style="display:flex;gap:6px">${isNew ? `<button class="btn icon ghost" data-go="chat" title="${esc(t('chatMode'))}">${ic('chat')}</button>` : ''}<button class="btn icon ghost" data-go="x">${ic('x')}</button></div></div>
    <div id="formRoot">${vf(sc).map(f => fieldHtml(f, draft[f.key], ro)).join('')}</div>
    <div style="display:flex;gap:10px;position:sticky;bottom:0;padding-top:8px">${!isNew && canR(sc, 'd') ? `<button class="btn danger icon" data-go="del">${ic('trash')}</button>` : ''}<button class="btn" style="flex:1" data-go="x">${esc(t('cancel'))}</button>${ro ? '' : `<button class="btn primary" style="flex:2" data-go="save">${ic('check')} ${esc(t('save'))}</button>`}</div>`);
  const root = $('#formRoot', o); bindForm(root, tab, sc, draft, ro);
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    if (b.dataset.go === 'x') closeSheet();
    else if (b.dataset.go === 'chat') { closeSheet(true); openChat(tab, draft, rid); }
    else if (b.dataset.go === 'save') { b.disabled = true; const ok = await submitDraft(tab, rid, draft, isNew, root); if (!ok) b.disabled = false; }
    else if (b.dataset.go === 'del') { if (await confirmDlg(t('confirmDel'))) { closeSheet(true); softDelete(tab, rid); } }
  });
}

/* ----------------------------- chat-like entry ----------------------------- */
function openChat(tab, startDraft, rid) {
  const sc = schemaOf(tab), draft = startDraft ? clone(startDraft) : blankDraft(sc), asked = new Set(), id = rid || uid();
  const o = openSheet(`<div class="hd"><h3>💬 ${esc(tl(sc))}</h3><div style="display:flex;gap:6px"><button class="btn icon ghost" data-c="form" title="${esc(t('formMode'))}">${ic('list')}</button><button class="btn icon ghost" data-c="x">${ic('x')}</button></div></div><div class="chat" id="chat"></div><div class="composer" id="comp"></div>`);
  const chat = $('#chat', o), comp = $('#comp', o); let cur = null;
  const scroll = () => chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  const bot = h => { const m = document.createElement('div'); m.className = 'msg bot'; m.innerHTML = h; chat.appendChild(m); scroll(); return m; };
  const me = h => { const m = document.createElement('div'); m.className = 'msg me'; m.textContent = h; chat.appendChild(m); scroll(); };
  const typing = () => { const m = bot('<span class="typing"><i></i><i></i><i></i></span>'); return () => m.remove(); };
  const nextField = () => sc.fields.find(f => !f.hidden && f.type !== 'calc' && !f.readonly && !asked.has(f.key) && (!f.showIf || cond(f.showIf, draft)));
  async function ask() {
    const f = nextField(); if (!f) return summary();
    cur = f; const rm = typing(); await sleep(320); rm(); bot(esc(t('ask', fl(f))) + (f.req ? ' <b class="req">*</b>' : '')); composer(f);
  }
  function skipBtn(f) { return f.req && f.type !== 'checkbox' ? '' : `<button class="btn ghost" data-c="skip">${esc(t('skip'))}</button>`; }
  function composer(f) {
    const v = draft[f.key]; let h = '';
    if (f.type === 'select' && !f.lookup && (f.options || []).length <= 12) h = `<div class="chips">${f.options.map(op => `<button class="chip" data-c="pick" data-v="${esc(op)}">${esc(op)}</button>`).join('')}${skipBtn(f)}</div>`;
    else if (f.type === 'checkbox') h = `<div class="chips"><button class="chip" data-c="bool" data-v="1">${esc(t('yes'))}</button><button class="chip" data-c="bool" data-v="0">${esc(t('no'))}</button></div>`;
    else if (f.type === 'multiselect') h = `<div class="chips" id="mchips" data-k="${esc(f.key)}" data-t="multi">${f.options.map(op => `<button class="chip ${(v || []).includes(op) ? 'on' : ''}" data-c="mtoggle" data-v="${esc(op)}">${esc(op)}</button>`).join('')}</div><div class="crow"><button class="btn primary" style="flex:1" data-c="mdone">${ic('check')} ${esc(t('done'))}</button>${skipBtn(f)}</div>`;
    else if (f.type === 'file') h = `<div class="fz" data-k="${esc(f.key)}">${fileZoneHtml(f, draft[f.key])}</div><div class="crow"><button class="btn primary" style="flex:1" data-c="fdone">${ic('check')} ${esc(t('done'))}</button>${skipBtn(f)}</div>`;
    else {
      const type = { number: 'number', date: 'date', datetime: 'datetime-local', phone: 'tel', email: 'email' }[f.type] || 'text';
      h = `<div class="crow"><input class="inp" id="cin" type="${type}" ${type === 'number' ? 'inputmode="decimal" step="any"' : ''} ${f.lookup || (f.type === 'select') ? `list="cdl"` : ''} placeholder="${esc(t('typeHere'))}" autocomplete="off" ${['phone', 'email'].includes(f.type) ? 'dir="ltr"' : ''}>${(f.lookup || f.type === 'select') ? `<datalist id="cdl">${(f.options || []).map(op => `<option value="${esc(op)}">`).join('')}</datalist>` : ''}${['text', 'longtext'].includes(f.type) ? micButton('cin') : ''}<button class="btn primary icon" data-c="send">${ic('send')}</button></div>${skipBtn(f) ? `<div>${skipBtn(f)}</div>` : ''}`;
    }
    comp.innerHTML = h; const inp = $('#cin', comp); if (inp) setTimeout(() => inp.focus(), 80);
  }
  async function answer(f, val, shown) {
    const tmp = { ...draft, [f.key]: val }, err = fieldError(sc, f, tmp);
    if (err) { comp.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); toast(err === t('required') ? t('required') : err, 'err', { ms: 1800 }); return; }
    draft[f.key] = val; asked.add(f.key); recalc(sc, draft); comp.innerHTML = '';
    if (shown !== null) me(shown ?? (displayVal(f, val) || '—')); await ask();
  }
  async function summary() {
    cur = null; const rm = typing(); await sleep(350); rm();
    const lines = vf(sc).filter(f => !isEmpty(draft[f.key]) && (!f.showIf || cond(f.showIf, draft))).map(f => `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0"><span class="muted">${esc(fl(f))}</span><b>${esc(displayVal(f, draft[f.key]))}</b></div>`).join('');
    bot(`<b>${esc(t('summary'))}</b><div style="margin-top:8px">${lines}</div>`);
    comp.innerHTML = `<div class="crow"><button class="btn" style="flex:1" data-c="edit">${ic('edit')} ${esc(t('editInForm'))}</button><button class="btn primary" style="flex:1" data-c="save">${ic('check')} ${esc(t('save'))}</button></div>`;
  }
  o.addEventListener('click', async e => {
    const mic = e.target.closest('[data-mic]'); if (mic) return startVoice(mic, $('#cin', o));
    const fz = e.target.closest('.fz'); if (fz && cur?.type === 'file') {
      const rm = e.target.closest('[data-rm]'); if (rm) { const it = draft[cur.key].splice(+rm.dataset.rm, 1)[0]; if (it?.lid) DB.del('files', it.lid); fz.innerHTML = fileZoneHtml(cur, draft[cur.key]); } return;
    }
    const b = e.target.closest('[data-c]'); if (!b) return; const a = b.dataset.c;
    if (a === 'x') return closeSheet();
    if (a === 'form') { closeSheet(true); return openChatToForm(); }
    if (a === 'skip') { asked.add(cur.key); comp.innerHTML = ''; me('—'); return ask(); }
    if (a === 'pick') return answer(cur, b.dataset.v);
    if (a === 'bool') return answer(cur, b.dataset.v === '1', b.dataset.v === '1' ? t('yes') : t('no'));
    if (a === 'mtoggle') { const arr = draft[cur.key] || []; draft[cur.key] = arr.includes(b.dataset.v) ? arr.filter(x => x !== b.dataset.v) : [...arr, b.dataset.v]; b.classList.toggle('on'); return; }
    if (a === 'mdone') return answer(cur, draft[cur.key] || []);
    if (a === 'fdone') { if ((draft[cur.key] || []).some(x => x.status === 'uploading')) return toast(t('uploadWait'), 'warn'); return answer(cur, draft[cur.key] || []); }
    if (a === 'send') { const inp = $('#cin', o); let v = inp.value.trim(); if (cur.type === 'number' && v !== '') v = Number(v); return answer(cur, v, cur.type === 'number' || cur.type === 'date' || cur.type === 'datetime' ? undefined : String(v)); }
    if (a === 'edit') { closeSheet(true); return openChatToForm(); }
    if (a === 'save') { b.disabled = true; const ok = await submitDraft(tab, id, draft, true, null); if (!ok) b.disabled = false; }
  });
  o.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cin') { e.preventDefault(); $('[data-c=send]', o)?.click(); } });
  o.addEventListener('change', e => { const fin = e.target.closest('[data-fin]'); if (!fin || !cur) return; const f = cur; handleFiles(tab, f, draft, [...fin.files], () => { const z = $(`.fz`, comp); if (z) z.innerHTML = fileZoneHtml(f, draft[f.key]); }); fin.value = ''; });
  o.addEventListener('dragover', e => { if (e.target.closest('.dz')) e.preventDefault(); });
  o.addEventListener('drop', e => { if (!e.target.closest('.dz') || !cur) return; e.preventDefault(); const f = cur; handleFiles(tab, f, draft, [...e.dataTransfer.files], () => { const z = $(`.fz`, comp); if (z) z.innerHTML = fileZoneHtml(f, draft[f.key]); }); });
  function openChatToForm() { openNewFormWith(tab, draft, id); }
  bot('👋 ' + esc(t('switchedChat'))); ask();
}
function openNewFormWith(tab, draft, rid) {
  const sc = schemaOf(tab), o = openSheet(`<div class="hd"><h3>${esc(t('newRecord'))}</h3><div style="display:flex;gap:6px"><button class="btn icon ghost" data-go="chat">${ic('chat')}</button><button class="btn icon ghost" data-go="x">${ic('x')}</button></div></div><div id="formRoot">${vf(sc).map(f => fieldHtml(f, draft[f.key], false)).join('')}</div><div style="display:flex;gap:10px;position:sticky;bottom:0;padding-top:8px"><button class="btn" style="flex:1" data-go="x">${esc(t('cancel'))}</button><button class="btn primary" style="flex:2" data-go="save">${ic('check')} ${esc(t('save'))}</button></div>`);
  const root = $('#formRoot', o); bindForm(root, tab, sc, draft, false);
  o.addEventListener('click', async e => { const b = e.target.closest('[data-go]'); if (!b) return; if (b.dataset.go === 'x') closeSheet(); else if (b.dataset.go === 'chat') { closeSheet(true); openChat(tab, draft, rid); } else if (b.dataset.go === 'save') { b.disabled = true; if (!await submitDraft(tab, rid, draft, true, root)) b.disabled = false; } });
}

/* ----------------------------- admin dashboard ----------------------------- */
function renderAdmin() {
  const sec = S.view.admin, names = { overview: 'overview', users: 'users', audit: 'audit', tabs: 'tabs', settings: 'settings' };
  $('#main').innerHTML = `<div class="sub">${Object.keys(names).map(k => `<button class="btn ${sec === k ? 'primary' : ''}" data-act="adm" data-id="${k}">${esc(t(k === 'audit' ? 'audit' : k))}</button>`).join('')}</div><div id="adm"></div>`;
  ({ overview: admOverview, users: admUsers, audit: admAudit, tabs: admTabs, settings: admSettings }[sec] || admOverview)();
}
const adminErr = e => { if (e.code !== 'auth') toast(e.code === 'network' ? t('networkErr') : e.message, 'err'); };
function presenceText(u) { return u.online ? t('onlineSince', hhmm(u.since)) : t('lastSeen', relTime(u.lastSeen)); }
async function admOverview() {
  const box = $('#adm'); box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  const load = async () => {
    try {
      const r = await api('admin_overview'); if (S.view.kind !== 'admin' || S.view.admin !== 'overview') return;
      S.alerts = r.kpis.openAlerts; renderBell(); const k = r.kpis, max = Math.max(1, ...r.hourly), now = new Date().getHours();
      box.innerHTML = `<div class="kpis">${[['onlineNow', k.online, 'var(--ok)'], ['totalUsers', k.total, 'var(--accent)'], ['actionsToday', k.actionsToday, 'var(--accent2)'], ['openAlerts', k.openAlerts, k.openAlerts ? 'var(--err)' : 'var(--muted)']].map(([l, v, c]) => `<div class="kpi glass" style="--c:${c}"><small>${esc(t(l))}</small><b style="color:${c}">${v}</b></div>`).join('')}</div>
      ${r.alerts.length ? `<div style="margin-top:14px">${r.alerts.map(a => `<div class="alert"><span style="font-size:22px">🚨</span><div style="flex:1"><b>${esc(t('brute'))}</b><div style="font-size:13px">${esc(a.message)}</div><div class="muted" style="font-size:12px">${fullTime(a.ts)}</div></div><button class="btn" data-act="ack" data-id="${esc(a.id)}">${esc(t('ack'))}</button></div>`).join('')}</div>` : ''}
      <div class="card glass" style="margin-top:14px"><b>${esc(t('onlineNow'))} / ${esc(t('users'))}</b>${r.users.map(u => `<div class="urow"><div class="av">${esc((u.name || u.username)[0].toUpperCase())}<span class="on ${u.online ? 'y' : ''}"></span></div><div style="flex:1;min-width:0"><b>${esc(u.name || u.username)}</b> <span class="badge">${esc(u.role)}</span>${u.locked ? ` <span class="badge" style="color:var(--err)">🔒 ${esc(t('locked'))}</span>` : ''}${u.active ? '' : ' <span class="badge">off</span>'}<div class="muted" style="font-size:12px">@${esc(u.username)} · ${esc(presenceText(u))}</div></div>${u.locked ? `<button class="btn" data-act="unlock" data-id="${esc(u.username)}">${esc(t('unlock'))}</button>` : ''}</div>`).join('')}</div>
      <div class="card glass" style="margin-top:14px"><b>${esc(t('activity24'))}</b><svg viewBox="0 0 240 70" style="width:100%;height:90px;margin-top:8px">${r.hourly.map((v, i) => { const h = Math.round(v / max * 56); return `<rect x="${i * 10 + 1}" y="${64 - h}" width="8" height="${Math.max(h, 2)}" rx="2" fill="url(#g)" opacity="${v ? 1 : .25}"/>`; }).join('')}<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs></svg></div>
      <div class="card glass" style="margin-top:14px"><b>${esc(t('recent'))}</b>${r.recent.map(a => `<div class="urow" style="font-size:13px"><span class="badge ${esc(a.action)}">${esc(a.action)}</span><b>${esc(a.user)}</b><span class="muted" style="flex:1">${esc(a.tab)}</span><span class="muted">${hhmm(a.ts)}</span></div>`).join('') || `<div class="muted">—</div>`}</div>`;
    } catch (e) { adminErr(e); }
  };
  await load(); S.adminTimer = setInterval(load, CONFIG.ADMIN_POLL_MS);
}
async function admAudit() {
  const box = $('#adm'), q = S.auditQ; box.innerHTML = '<div class="skeleton"></div>';
  try {
    const [u, r] = await Promise.all([api('admin_users'), api('admin_audit', { filters: q.filters, page: q.page })]); const F = q.filters;
    box.innerHTML = `<div class="card glass" style="margin-bottom:12px"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px" class="md:grid-cols-4">
      <select class="inp" id="aq_user"><option value="">${esc(t('user'))}: ${esc(t('allUsers'))}</option>${u.users.map(x => `<option ${F.user === x.username ? 'selected' : ''}>${esc(x.username)}</option>`).join('')}</select>
      <select class="inp" id="aq_tab"><option value="">${esc(t('allTabs'))}</option>${u.tabs.map(x => `<option ${F.tab === x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <select class="inp" id="aq_action"><option value="">${esc(t('allActions'))}</option>${ACTIONS.map(x => `<option ${F.action === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <input class="inp" id="aq_text" placeholder="${esc(t('search'))}" value="${esc(F.text || '')}">
      <input class="inp" id="aq_from" type="date" value="${esc(F.from || '')}" title="${esc(t('from'))}"><input class="inp" id="aq_to" type="date" value="${esc(F.to || '')}" title="${esc(t('to'))}">
      <button class="btn primary" data-act="aq_apply" style="grid-column:span 2">${ic('search')} ${esc(t('apply'))}</button></div></div>
      <div class="muted" style="margin:0 4px 8px;font-size:13px">${r.total} ${esc(t('rows'))}</div><div style="overflow-x:auto"><table class="t"><thead><tr><th>${esc(t('time'))}</th><th>${esc(t('user'))}</th><th>${esc(t('action'))}</th><th>${esc(t('tabs'))}</th><th>${esc(t('details'))}</th></tr></thead><tbody>
      ${r.rows.map(a => `<tr><td style="white-space:nowrap">${fullTime(a.ts)}</td><td>${esc(a.user)}</td><td><span class="badge ${esc(a.action)}">${esc(a.action)}</span></td><td>${esc(a.tab)}<div class="muted" style="font-size:11px">${esc(String(a.rowId).slice(0, 8))}</div></td><td style="max-width:360px"><details><summary class="muted" style="cursor:pointer;font-size:12px">${esc(String(a.details).slice(0, 60))}</summary><pre style="white-space:pre-wrap;word-break:break-all;font-size:11px;margin:6px 0 0">${esc(prettyJson(a.details))}</pre></details></td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button class="btn" data-act="apage" data-id="-1" ${q.page <= 0 ? 'disabled' : ''}>${esc(t('prev'))}</button><span class="muted" style="align-self:center">${q.page + 1} / ${Math.max(1, Math.ceil(r.total / r.size))}</span><button class="btn" data-act="apage" data-id="1" ${(q.page + 1) * r.size >= r.total ? 'disabled' : ''}>${esc(t('next'))}</button></div>`;
  } catch (e) { adminErr(e); }
}
async function admSettings() {
  const box = $('#adm');
  box.innerHTML = `<div class="card glass" style="max-width:560px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">${logoHtml('sm')}<div><b>${esc(t('branding'))}</b><div class="muted" style="font-size:12px">${esc(t('brandingHint'))}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="fld"><label class="lab">${esc(t('appName'))} (EN)</label><input class="inp" id="g_en" dir="ltr" value="${esc(BRAND.name.en)}"></div>
    <div class="fld"><label class="lab">${esc(t('appName'))} (AR)</label><input class="inp" id="g_ar" value="${esc(BRAND.name.ar || '')}"></div></div>
    <div class="fld"><label class="lab">${esc(t('tagline'))}</label><input class="inp" id="g_tag" value="${esc(S.lang === 'ar' ? (BRAND.tag.ar || '') : (BRAND.tag.en || ''))}"></div>
    <div style="display:grid;grid-template-columns:110px 1fr;gap:10px"><div class="fld"><label class="lab">${esc(t('logoEmoji'))}</label><input class="inp" id="g_logo" style="text-align:center;font-size:24px;padding:6px" maxlength="4" value="${esc(BRAND.logo || '🧭')}"></div>
    <div class="fld"><label class="lab">${esc(t('logoUrl'))}</label><input class="inp" id="g_img" dir="ltr" placeholder="https://…" value="${esc(BRAND.logoImg || '')}"></div></div>
    <button class="btn primary" data-act="g_save" style="width:100%">${ic('check')} ${esc(t('save'))}</button></div>`;
}
const prettyJson = s => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return s; } };
async function admUsers() {
  const box = $('#adm'); box.innerHTML = '<div class="skeleton"></div>';
  try {
    const r = await api('admin_users'); S._adm = r;
    box.innerHTML = `<button class="btn primary" data-act="user_new" style="margin-bottom:12px">${ic('plus')} ${esc(t('newUser'))}</button><div class="card glass">${r.users.map(u => `<div class="urow"><div class="av">${esc((u.name || u.username)[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b>${esc(u.name)}</b> <span class="badge">${esc(u.role)}</span>${u.active ? '' : ' <span class="badge">off</span>'}<div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">@${esc(u.username)} · ${esc(u.role === 'admin' ? '*' : u.perms || '—')}</div></div><button class="btn icon" data-act="user_edit" data-id="${esc(u.username)}">${ic('edit')}</button></div>`).join('')}</div>`;
  } catch (e) { adminErr(e); }
}
function parsePermsClient(s) { const m = {}; String(s || '').split(';').forEach(p => { p = p.trim(); if (!p) return; const i = p.lastIndexOf(':'); m[i < 0 ? p : p.slice(0, i)] = i < 0 ? 'r' : p.slice(i + 1); }); return m; }
function openUserForm(username) {
  const r = S._adm, ex = username ? r.users.find(u => u.username === username) : null, pm = parsePermsClient(ex?.perms);
  const o = openSheet(`<div class="hd"><h3>${esc(ex ? t('editUser') : t('newUser'))}</h3><button class="btn icon ghost" data-u="x">${ic('x')}</button></div>
    <div class="fld"><label class="lab">${esc(t('username'))}</label><input class="inp" id="u_name" ${ex ? 'disabled' : ''} value="${esc(ex?.username || '')}" autocapitalize="none" dir="ltr"></div>
    <div class="fld"><label class="lab">${esc(t('user'))}</label><input class="inp" id="u_full" value="${esc(ex?.name || '')}"></div>
    <div class="fld"><label class="lab">${esc(t('password'))}</label><input class="inp" id="u_pw" type="password" autocomplete="new-password" placeholder="${esc(ex ? t('pwKeep') : t('pw'))}"></div>
    <div class="fld"><label class="lab">${esc(t('role'))}</label><div class="chips" id="u_role"><button type="button" class="chip ${ex?.role === 'admin' ? '' : 'on'}" data-v="user">user</button><button type="button" class="chip ${ex?.role === 'admin' ? 'on' : ''}" data-v="admin">admin</button></div></div>
    <div class="fld" id="u_perms"><label class="lab">${esc(t('permissions'))}</label><div class="pm muted" style="font-weight:700"><span></span><span style="text-align:center">R</span><span style="text-align:center">W</span><span style="text-align:center">D</span></div>
      <div class="pm" style="padding:6px 0;font-weight:800;color:var(--accent)" data-tab="*"><span>✨ ${esc(t('allTabsRead'))}</span><label class="c"><input type="checkbox" data-r="r" ${(pm['*'] || '').includes('r') ? 'checked' : ''}></label><span></span><span></span></div>
      ${r.tabs.map(tb => `<div class="pm" style="padding:6px 0;border-top:1px solid var(--border)" data-tab="${esc(tb.name)}"><span>${esc(tb.label)}</span>${['r', 'w', 'd'].map(c => `<label class="c"><input type="checkbox" data-r="${c}" ${(pm[tb.name] || '').includes(c) ? 'checked' : ''}></label>`).join('')}</div>`).join('')}</div>
    <div class="fld" style="display:flex;align-items:center;justify-content:space-between"><span class="lab" style="margin:0">${esc(t('active'))}</span><div class="switch ${ex?.active === false ? '' : 'on'}" id="u_active"></div></div>
    <button class="btn primary" data-u="save" style="width:100%">${ic('check')} ${esc(t('save'))}</button>`);
  const sync = () => { $('#u_perms', o).style.display = $('#u_role .on', o).dataset.v === 'admin' ? 'none' : ''; }; sync();
  o.addEventListener('click', async e => {
    const chip = e.target.closest('#u_role .chip'); if (chip) { $$('#u_role .chip', o).forEach(c => c.classList.toggle('on', c === chip)); sync(); return; }
    if (e.target.closest('#u_active')) { $('#u_active', o).classList.toggle('on'); return; }
    const b = e.target.closest('[data-u]'); if (!b) return; if (b.dataset.u === 'x') return closeSheet();
    const perms = $$('[data-tab]', o).map(row => { const rs = $$('[data-r]', row).filter(c => c.checked).map(c => c.dataset.r).join(''); return rs ? `${row.dataset.tab}:${rs}` : ''; }).filter(Boolean).join(';');
    b.disabled = true;
    try { await api('admin_saveUser', { username: $('#u_name', o).value.trim(), name: $('#u_full', o).value.trim(), password: $('#u_pw', o).value, role: $('#u_role .on', o).dataset.v, perms, active: $('#u_active', o).classList.contains('on') }); toast(t('userSaved')); closeSheet(true); admUsers(); }
    catch (er) { b.disabled = false; adminErr(er); }
  });
}
async function admTabs() {
  const box = $('#adm'); box.innerHTML = '<div class="skeleton"></div>';
  try {
    const r = await api('admin_tabs');
    box.innerHTML = `<button class="btn primary" data-act="tab_new" style="margin-bottom:12px">${ic('plus')} ${esc(t('createTab'))}</button>${r.tabs.map(tb => `<div class="card glass" style="margin-bottom:10px"><b>${tb.icon} ${esc(tb.label)}</b> ${tb.ar ? `<span class="muted">· ${esc(tb.ar)}</span>` : ''}<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${tb.fields.map(f => `<span class="badge">${esc(f.label)} <span class="muted">· ${esc(typeName(f.type))}</span></span>`).join('')}</div></div>`).join('')}`;
  } catch (e) { adminErr(e); }
}
function openTabBuilder() {
  const rows = [{ label: '', ar: '', type: 'text', req: false, options: '' }];
  const TYPES = Object.keys(T_TYPES.en);
  const o = openSheet(`<div class="hd"><h3>${esc(t('createTab'))}</h3><button class="btn icon ghost" data-b="x">${ic('x')}</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 70px;gap:8px"><div class="fld"><label class="lab">${esc(t('tabName'))}</label><input class="inp" id="b_name"></div><div class="fld"><label class="lab">${esc(t('labelAr'))}</label><input class="inp" id="b_ar"></div><div class="fld"><label class="lab">${esc(t('icon'))}</label><input class="inp" id="b_icon" value="📄" style="text-align:center"></div></div>
    <label class="lab">${esc(t('fields'))}</label><div id="b_rows"></div><button class="btn" data-b="add" style="width:100%;margin:6px 0 14px">${ic('plus')} ${esc(t('addField'))}</button><button class="btn primary" data-b="save" style="width:100%">${ic('check')} ${esc(t('save'))}</button>`, { wide: true });
  const draw = () => { $('#b_rows', o).innerHTML = rows.map((r, i) => `<div class="card" style="margin-bottom:8px;padding:10px" data-i="${i}"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="inp" data-p="label" placeholder="${esc(t('label'))}" value="${esc(r.label)}"><input class="inp" data-p="ar" placeholder="${esc(t('labelAr'))}" value="${esc(r.ar)}"><select class="inp" data-p="type">${TYPES.map(x => `<option value="${x}" ${r.type === x ? 'selected' : ''}>${esc(typeName(x))}</option>`).join('')}</select>
    <div style="display:flex;align-items:center;gap:8px"><label class="chip ${r.req ? 'on' : ''}" style="flex:1;text-align:center"><input type="checkbox" hidden data-p="req" ${r.req ? 'checked' : ''}>${esc(t('required'))}</label><button class="btn icon danger" data-rm="${i}">${ic('trash')}</button></div></div>
    ${['select', 'multiselect'].includes(r.type) ? `<input class="inp" style="margin-top:8px" data-p="options" placeholder="${esc(t('options'))}" value="${esc(r.options)}">` : ''}${r.type === 'calc' ? `<input class="inp" style="margin-top:8px" data-p="calc" dir="ltr" placeholder="{Qty}*{Price}" value="${esc(r.calc || '')}">` : ''}${r.type === 'file' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><input class="inp" type="number" data-p="maxMB" placeholder="max MB" value="${esc(r.maxMB || '')}"><input class="inp" type="number" data-p="maxFiles" placeholder="max files" value="${esc(r.maxFiles || '')}"></div>` : ''}
    <details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:12px">${esc(t('advanced'))}</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><input class="inp" data-p="showIf" dir="ltr" placeholder="showIf: Status=Hired" value="${esc(r.showIf || '')}"><input class="inp" data-p="reqIf" dir="ltr" placeholder="reqIf: Status=Hired" value="${esc(r.reqIf || '')}"><input class="inp" data-p="lookup" dir="ltr" placeholder="lookup: Clients.Company" value="${esc(r.lookup || '')}"></div></details></div>`).join(''); };
  draw();
  o.addEventListener('input', e => { const p = e.target.dataset.p; if (!p) return; const i = +e.target.closest('[data-i]').dataset.i; rows[i][p] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
  o.addEventListener('change', e => { const p = e.target.dataset.p; if (p === 'type' || p === 'req') draw(); });
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-b]'), rm = e.target.closest('[data-rm]');
    if (rm) { rows.splice(+rm.dataset.rm, 1); if (!rows.length) rows.push({ label: '', ar: '', type: 'text', options: '' }); return draw(); }
    if (!b) return; if (b.dataset.b === 'x') return closeSheet(); if (b.dataset.b === 'add') { rows.push({ label: '', ar: '', type: 'text', options: '' }); draw(); return; }
    b.disabled = true;
    try {
      await api('admin_createTab', { name: $('#b_name', o).value.trim(), label: $('#b_name', o).value.trim(), ar: $('#b_ar', o).value.trim(), icon: $('#b_icon', o).value.trim() || '📄', fields: rows.map(r => ({ ...r, options: r.options ? r.options.split(',').map(s => s.trim()).filter(Boolean) : [] })) });
      toast(t('tabCreated')); closeSheet(true); await refresh(); renderApp(); S.view = { kind: 'admin', tab: S.view.tab, admin: 'tabs' }; renderApp();
    } catch (er) { b.disabled = false; adminErr(er); }
  });
}

/* ----------------------------- global actions ----------------------------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) {
    const fc = e.target.closest('#fchips .chip'); if (fc) { S.filter[S.view.tab] = fc.dataset.f || null; $$('#fchips .chip').forEach(c => c.classList.toggle('on', c === fc)); renderList(); } return;
  }
  const a = el.dataset.act, id = el.dataset.id;
  if (el.classList.contains('card') && el.dataset.sw) return;
  switch (a) {
    case 'sync': syncNow(); break; case 'syncinfo': openSyncInfo(); break;
    case 'theme': toggleTheme(); break; case 'lang': toggleLang(); break; case 'logout': logout(); break;
    case 'nav': S.view = id === 'admin' ? { ...S.view, kind: 'admin' } : { ...S.view, kind: 'tab', tab: id.slice(4) }; S.search = ''; S.limit = CONFIG.PAGE; renderApp(); break;
    case 'add': { const sc = schemaOf(S.view.tab); if (!sc) break; if (innerWidth < 768) openChat(sc.name); else openNewFormWith(sc.name, blankDraft(sc), uid()); break; }
    case 'open': { const sg = $('#sugg'); if (sg) sg.style.display = 'none'; openRecord(id); break; }
    case 'more': S.limit += CONFIG.PAGE; renderList(); break;
    case 'layout': S.layout = (S.layout || (innerWidth >= 1024 ? 'table' : 'cards')) === 'table' ? 'cards' : 'table'; renderTabShell(); break;
    case 'tview': S.tabView[S.view.tab] = id; renderTabShell(); break;
    case 'dfilter': S.filter[S.view.tab] = id || null; S.tabView[S.view.tab] = 'list'; renderTabShell(); break;
    case 'export': exportXlsx(); break;
    case 'g_save': {
      const brand = clone(BRAND);
      brand.name.en = $('#g_en').value.trim() || 'HR Ops'; brand.name.ar = $('#g_ar').value.trim();
      brand.logo = $('#g_logo').value.trim() || '🧭'; brand.logoImg = $('#g_img').value.trim();
      if (S.lang === 'ar') brand.tag.ar = $('#g_tag').value.trim(); else brand.tag.en = $('#g_tag').value.trim();
      localStorage.setItem('hr_brand', JSON.stringify(brand)); Object.assign(BRAND, brand);
      try { await api('admin_saveSettings', { settings: brand }); } catch (er) { adminErr(er); }
      toast(t('userSaved')); renderApp(); break;
    }
    case 'alerts': S.view = { ...S.view, kind: 'admin', admin: 'overview' }; renderApp(); break;
    case 'adm': S.view.admin = id; renderApp(); break;
    case 'ack': try { await api('admin_ackAlert', { id }); admOverview(); } catch (er) { adminErr(er); } break;
    case 'unlock': try { await api('admin_userAction', { username: id, op: 'unlock' }); toast(t('unlock') + ' ✓'); admOverview(); } catch (er) { adminErr(er); } break;
    case 'user_new': openUserForm(null); break; case 'user_edit': openUserForm(id); break; case 'tab_new': openTabBuilder(); break;
    case 'aq_apply': S.auditQ = { page: 0, filters: { user: $('#aq_user').value, tab: $('#aq_tab').value, action: $('#aq_action').value, text: $('#aq_text').value.trim(), from: $('#aq_from').value, to: $('#aq_to').value } }; admAudit(); break;
    case 'apage': S.auditQ.page = Math.max(0, S.auditQ.page + Number(id)); admAudit(); break;
  }
});
window.addEventListener('online', () => { S.online = true; renderStatus(); flush(); if (S.token) refresh().then(() => renderMain()).catch(() => {}); });
window.addEventListener('offline', () => { S.online = false; renderStatus(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) { flush(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ----------------------------- boot ----------------------------- */
async function boot() {
  try { const sb = JSON.parse(localStorage.getItem('hr_brand') || 'null'); if (sb) Object.assign(BRAND, sb); } catch (e) {}
  S.lang = localStorage.getItem('hr_lang') || (navigator.language || '').startsWith('ar') ? (localStorage.getItem('hr_lang') || 'ar') : 'en';
  S.theme = localStorage.getItem('hr_theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); applyTheme(); applyLang();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await DB.open(); } catch (e) { $('#app').innerHTML = '<p style="padding:30px">IndexedDB unavailable in this browser mode.</p>'; return; }
  S.token = localStorage.getItem('hr_token');
  if (!S.token) return renderLogin();
  await loadLocal(); S.user = await meta.get('user'); S.tabs = (await meta.get('schema')) || []; await refreshPending();
  if (!S.user || !S.tabs.length && !navigator.onLine) { return S.user ? renderApp() : renderLogin(); }
  S.view.tab = S.tabs[0]?.name || null; renderApp(); startTimers();
  if (navigator.onLine) { try { await refresh(); renderApp(); flush(); } catch (e) { if (e.code === 'network') setOnline(false); } }
}
boot();
