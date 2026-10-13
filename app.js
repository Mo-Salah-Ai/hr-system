'use strict';
/* =============================================================================
   HR & Operations ERP — Frontend SPA (GitHub Pages)
   Offline-first (IndexedDB) · dynamic schema · RBAC · chat-like entry · admin
   ============================================================================= */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyhVZUAmrNDWI8Jm7Inkbf8tGohy0xvLZ3AjM1ektZ9u5ue1g-9xl1EKF9N1xKB5eQwYg/exec',   // Apps Script Web App /exec URL
  HEARTBEAT_MS: 30000,
  SYNC_MS: 10000,
  ADMIN_POLL_MS: 15000,
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
    syncNow: 'Sync now', syncStatus: 'Sync status', syncVerified: (n, k) => `Verified: ${n} record(s) in ${k} page(s) match the server`, lastSyncAt: x => `Last successful sync: ${x}`,
    nothingPending: 'Nothing is waiting to sync', discardConfirm: 'Discard this unsynced change?', syncFailed: 'Sync failed', dashboard: 'Dashboard', customize: 'Customize', doneEdit: 'Done', addWidget: 'Add widget', editWidget: 'Edit widget', dashHint: 'Your personal dashboard — tap any box or chart to drill in', emptyDash: 'Your dashboard is empty', resetDash: 'Reset to default', resetConfirm: 'Reset your dashboard to the default layout?', reset: 'Reset', wDelConfirm: 'Remove this widget?', wKpi: 'Number', wBar: 'Columns', wHbar: 'Bars', wDonut: 'Donut', wLine: 'Trend', wList: 'Latest', wTitle: 'Title (optional)', source: 'Data source', aggregate: 'Calculation', aggCount: 'Count', aggSum: 'Sum', aggAvg: 'Average', aggMin: 'Minimum', aggMax: 'Maximum', valueField: 'Number field', groupBy: 'Group by', dateBy: 'Date field', byUpdated: 'Last modified', filterBy: 'Filter by', filterVal: 'Value', none: 'None', range: 'Period', rAll: 'All time', r7: 'Last 7 days', r30: 'Last 30 days', r90: 'Last 90 days', r365: 'Last year', gran: 'Interval', gMonth: 'Monthly', gDay: 'Daily', size: 'Size', sSmall: 'Small', sMed: 'Medium', sLarge: 'Full width', color: 'Color', preview: 'Preview', records: 'Records', latest: 'Latest records', wUnavail: 'This data source is not available to you', wNeedGroup: 'Pick a field to group by', noWidgetData: 'No data yet', other: 'Other', moveEarlier: 'Move earlier', moveLater: 'Move later', editTab: 'Edit page', tabUpdated: 'Page updated — changes are live for everyone', displayName: 'Display name', readonlyL: 'Read only', hiddenL: 'Hidden'
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
    syncNow: 'مزامنة الآن', syncStatus: 'حالة المزامنة', syncVerified: (n, k) => `تم التحقق: ${n} سجل في ${k} صفحة مطابق للسيرفر`, lastSyncAt: x => `آخر مزامنة ناجحة: ${x}`,
    nothingPending: 'لا يوجد شيء في انتظار المزامنة', discardConfirm: 'تجاهل هذا التعديل غير المتزامن؟', syncFailed: 'فشلت المزامنة', dashboard: 'لوحتي', customize: 'تخصيص', doneEdit: 'تم', addWidget: 'إضافة عنصر', editWidget: 'تعديل العنصر', dashHint: 'لوحتك الشخصية — اضغط على أي صندوق أو شارت لعرض التفاصيل', emptyDash: 'لوحتك فارغة', resetDash: 'استرجاع الافتراضي', resetConfirm: 'استرجاع اللوحة للشكل الافتراضي؟', reset: 'استرجاع', wDelConfirm: 'حذف هذا العنصر؟', wKpi: 'رقم', wBar: 'أعمدة', wHbar: 'أشرطة', wDonut: 'دائري', wLine: 'اتجاه', wList: 'الأحدث', wTitle: 'العنوان (اختياري)', source: 'مصدر البيانات', aggregate: 'العملية الحسابية', aggCount: 'عدد', aggSum: 'مجموع', aggAvg: 'متوسط', aggMin: 'أقل قيمة', aggMax: 'أعلى قيمة', valueField: 'الحقل الرقمي', groupBy: 'التجميع حسب', dateBy: 'حقل التاريخ', byUpdated: 'آخر تعديل', filterBy: 'تصفية حسب', filterVal: 'القيمة', none: 'بدون', range: 'الفترة', rAll: 'كل الوقت', r7: 'آخر ٧ أيام', r30: 'آخر ٣٠ يوم', r90: 'آخر ٩٠ يوم', r365: 'آخر سنة', gran: 'الفاصل الزمني', gMonth: 'شهري', gDay: 'يومي', size: 'الحجم', sSmall: 'صغير', sMed: 'متوسط', sLarge: 'عرض كامل', color: 'اللون', preview: 'معاينة', records: 'سجلات', latest: 'أحدث السجلات', wUnavail: 'مصدر البيانات هذا غير متاح لك', wNeedGroup: 'اختر حقلاً للتجميع', noWidgetData: 'لا توجد بيانات بعد', other: 'أخرى', moveEarlier: 'تقديم', moveLater: 'تأخير', editTab: 'تعديل الصفحة', tabUpdated: 'تم تحديث الصفحة — التغييرات متاحة للجميع الآن', displayName: 'الاسم المعروض', readonlyL: 'للقراءة فقط', hiddenL: 'مخفي'
  }
};
const T_TYPES = { en: { text: 'Text', longtext: 'Long text', number: 'Number', date: 'Date', datetime: 'Date & time', select: 'Dropdown', multiselect: 'Multi-select', checkbox: 'Checkbox', phone: 'Phone', email: 'Email', file: 'File upload', calc: 'Calculated' },
  ar: { text: 'نص', longtext: 'نص طويل', number: 'رقم', date: 'تاريخ', datetime: 'تاريخ ووقت', select: 'قائمة', multiselect: 'اختيار متعدد', checkbox: 'مربع اختيار', phone: 'هاتف', email: 'بريد', file: 'رفع ملف', calc: 'محسوب' } };
const ACTIONS = ['login', 'logout', 'login_fail', 'login_blocked', 'lockout', 'security_alert', 'create', 'update', 'delete', 'conflict', 'upload', 'download', 'user_create', 'user_update', 'user_unlock', 'tab_create', 'tab_update', 'brand_update'];

const S = { lang: 'en', theme: 'dark', token: null, user: null, tabs: [], data: {}, lastSync: {}, view: { kind: 'dash', tab: null, admin: 'overview' },
  online: navigator.onLine, syncing: false, pending: 0, search: '', filter: {}, layout: null, alerts: 0, limit: CONFIG.PAGE, auditQ: { page: 0, filters: {} }, adminTimer: null };
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
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'
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
function calcVal(expr, data, cols) {
  const DAY = 86400000, DRE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
  try {
    const s = String(expr == null ? '' : expr).replace(/^\s*=/, ''), T = []; let i = 0, m;
    while (i < s.length) {
      const c = s[i], rest = s.slice(i);
      if (/\s/.test(c)) { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) { T.push({ t: 'n', v: parseFloat(m[1]) }); i += m[1].length; }
      else if (c === '{') { const j = s.indexOf('}', i); if (j < 0) return ''; T.push({ t: 'r', v: s.slice(i + 1, j).trim() }); i = j + 1; }
      else if (c === '[') { const j = s.indexOf(']', i); if (j < 0) return ''; T.push({ t: 'r', v: s.slice(i + 1, j).trim() }); i = j + 1; }
      else if (c === '"' || c === "'") { const j = s.indexOf(c, i + 1); if (j < 0) return ''; T.push({ t: 's', v: s.slice(i + 1, j) }); i = j + 1; }
      else if ((m = /^[A-Za-z_]\w*/.exec(rest))) { T.push({ t: 'i', v: m[0] }); i += m[0].length; }
      else if ((m = /^(<=|>=|<>|!=|==|[-+*\/%^&:(),<>=])/.exec(rest))) { T.push({ t: 'o', v: m[1] }); i += m[1].length; }
      else return '';
    }
    let p = 0;
    const isD = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const num = v => Array.isArray(v) ? NaN : v == null ? 0 : isD(v) ? v.d : typeof v === 'number' ? v : (v === '' || isNaN(Number(v)) ? NaN : Number(v));
    const ref = k => {
      const v = data[k]; if (v === undefined || v === null || v === '') return null;
      if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; if (Array.isArray(v)) return v.join(', ');
      const str = String(v), d = DRE.exec(str);
      if (d) return { d: Date.UTC(+d[1], +d[2] - 1, +d[3], +(d[4] || 0), +(d[5] || 0)) / DAY };
      const e = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(str.trim());
      if (e && +e[2] >= 1 && +e[2] <= 12 && +e[1] >= 1 && new Date(Date.UTC(+e[3], +e[2] - 1, +e[1])).getUTCMonth() === +e[2] - 1) return { d: Date.UTC(+e[3], +e[2] - 1, +e[1], +(e[4] || 0), +(e[5] || 0)) / DAY };
      return str.trim() !== '' && !isNaN(Number(str)) ? Number(str) : str;
    };
    const colIdx = k => { const m = /^([A-Za-z]{1,2})\d*$/.exec(k); if (!m || !cols) return -1; let n = 0; m[1].toUpperCase().split('').forEach(ch => { n = n * 26 + ch.charCodeAt(0) - 64; }); return n - 1; };
    const nameRef = k => { if (Object.prototype.hasOwnProperty.call(data, k)) return ref(k); const i = colIdx(k); return i >= 0 && cols[i] !== undefined ? ref(cols[i]) : ref(k); };
    const ymd = v => new Date(Math.round(v.d * DAY));
    const addM = (v, n) => { const dt = ymd(v), y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + Math.trunc(n), last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(); return { d: Date.UTC(y, mo, Math.min(dt.getUTCDate(), last), dt.getUTCHours(), dt.getUTCMinutes()) / DAY }; };
    const months = (a, b) => { const x = ymd(a), y = ymd(b); let n = (x.getUTCFullYear() - y.getUTCFullYear()) * 12 + x.getUTCMonth() - y.getUTCMonth(); if (n > 0 && x.getUTCDate() < y.getUTCDate()) n--; if (n < 0 && x.getUTCDate() > y.getUTCDate()) n++; return n; };
    const must = v => { if (!isD(v)) throw 0; return v; };
    const nn = v => { const x = num(v); if (isNaN(x)) throw 0; return x; };
    const arith = (op, a, b) => {
      const ad = isD(a), bd = isD(b);
      if ((ad || bd) && (a == null || b == null)) return null;
      if (op === '+') { if (ad && bd) throw 0; if (ad) return { d: a.d + nn(b) }; if (bd) return { d: b.d + nn(a) }; return nn(a) + nn(b); }
      if (op === '-') { if (ad && bd) return a.d - b.d; if (ad) return { d: a.d - nn(b) }; if (bd) throw 0; return nn(a) - nn(b); }
      if (ad || bd) throw 0;
      const x = nn(a), y = nn(b); return op === '*' ? x * y : op === '/' ? x / y : x % y;
    };
    const cmp = (op, a, b) => {
      let x = isD(a) ? a.d : a, y = isD(b) ? b.d : b;
      if (typeof x === 'string' || typeof y === 'string') { x = String(x == null ? '' : x).toLowerCase(); y = String(y == null ? '' : y).toLowerCase(); } else { x = x == null ? 0 : x; y = y == null ? 0 : y; }
      return (op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : op === '>=' ? x >= y : (op === '=' || op === '==') ? x === y : x !== y) ? 1 : 0;
    };
    const truthy = v => v != null && v !== 0 && v !== '' && v !== false;
    const nums = a => a.filter(v => v != null).map(nn);
    const FN = {
      TODAY: () => ({ d: Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY) }),
      DAYS: a => a[0] == null || a[1] == null ? null : must(a[0]).d - must(a[1]).d,
      MONTHS: a => a[0] == null || a[1] == null ? null : months(must(a[0]), must(a[1])),
      YEARS: a => { if (a[0] == null || a[1] == null) return null; const n = months(must(a[0]), must(a[1])); return Math.trunc(n / 12); },
      ADDDAYS: a => a[0] == null ? null : { d: must(a[0]).d + nn(a[1]) },
      ADDMONTHS: a => a[0] == null ? null : addM(must(a[0]), nn(a[1])),
      ROUND: a => { const k = Math.pow(10, a.length > 1 ? nn(a[1]) : 0); return Math.round(nn(a[0]) * k) / k; },
      ABS: a => Math.abs(nn(a[0])),
      MIN: a => { const x = nums(a); return x.length ? Math.min.apply(null, x) : null; },
      MAX: a => { const x = nums(a); return x.length ? Math.max.apply(null, x) : null; },
      SUM: a => nums(a).reduce((s, v) => s + v, 0),
      AVG: a => { const x = nums(a); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; },
      IF: a => truthy(a[0]) ? (a[1] === undefined ? null : a[1]) : (a[2] === undefined ? null : a[2]),
      AND: a => a.every(truthy) ? 1 : 0, OR: a => a.some(truthy) ? 1 : 0, NOT: a => truthy(a[0]) ? 0 : 1,
      NOW: () => FN.TODAY(),
      DATEDIF: a => { if (a[0] == null || a[1] == null) return null; const u = String(a[2] == null ? 'd' : a[2]).toLowerCase(); if (u === 'd') return must(a[1]).d - must(a[0]).d; const n = months(must(a[1]), must(a[0])); return u === 'm' ? n : u === 'y' ? Math.trunc(n / 12) : (() => { throw 0; })(); },
      EDATE: a => a[0] == null ? null : addM(must(a[0]), nn(a[1])),
      EOMONTH: a => { if (a[0] == null) return null; const dt = ymd(must(a[0])); return { d: Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1 + Math.trunc(nn(a[1])), 0) / DAY }; },
      YEAR: a => a[0] == null ? null : ymd(must(a[0])).getUTCFullYear(),
      MONTH: a => a[0] == null ? null : ymd(must(a[0])).getUTCMonth() + 1,
      DAY: a => a[0] == null ? null : ymd(must(a[0])).getUTCDate(),
      INT: a => Math.floor(nn(a[0])), MOD: a => nn(a[0]) % nn(a[1]), POWER: a => Math.pow(nn(a[0]), nn(a[1])), SQRT: a => Math.sqrt(nn(a[0])),
      ROUNDUP: a => { const k = Math.pow(10, a.length > 1 ? nn(a[1]) : 0); return Math.ceil(nn(a[0]) * k) / k; },
      ROUNDDOWN: a => { const k = Math.pow(10, a.length > 1 ? nn(a[1]) : 0); return Math.trunc(nn(a[0]) * k) / k; },
      IFERROR: a => typeof a[0] === 'number' && !isFinite(a[0]) ? (a[1] === undefined ? null : a[1]) : a[0],
      ISBLANK: a => a[0] == null || a[0] === '' ? 1 : 0,
      LEN: a => FN.CONCAT([a[0]]).length, UPPER: a => FN.CONCAT([a[0]]).toUpperCase(), LOWER: a => FN.CONCAT([a[0]]).toLowerCase(), TRIM: a => FN.CONCAT([a[0]]).trim(),
      LEFT: a => FN.CONCAT([a[0]]).slice(0, a.length > 1 ? nn(a[1]) : 1), RIGHT: a => { const s = FN.CONCAT([a[0]]), n = a.length > 1 ? nn(a[1]) : 1; return n <= 0 ? '' : s.slice(-n); },
      CONCAT: a => a.map(v => isD(v) ? toStr(v) : v == null ? '' : String(v)).join('')
    };
    const toStr = v => { const dt = ymd(v), z = n => (n < 10 ? '0' : '') + n, base = dt.getUTCFullYear() + '-' + z(dt.getUTCMonth() + 1) + '-' + z(dt.getUTCDate()); return Number.isInteger(v.d) ? base : base + 'T' + z(dt.getUTCHours()) + ':' + z(dt.getUTCMinutes()); };
    const peek = v => T[p] && T[p].t === 'o' && T[p].v === v;
    const expr0 = () => {
      let a = cat();
      while (T[p] && T[p].t === 'o' && ['<', '>', '<=', '>=', '=', '==', '!=', '<>'].indexOf(T[p].v) >= 0) { const op = T[p++].v; a = cmp(op, a, cat()); }
      return a;
    };
    const cat = () => { let a = add(); while (peek('&')) { p++; const b = add(); a = FN.CONCAT([a, b]); } return a; };
    const add = () => { let a = mul(); while (peek('+') || peek('-')) { const op = T[p++].v; a = arith(op, a, mul()); } return a; };
    const mul = () => { let a = pw(); while (peek('*') || peek('/') || peek('%')) { const op = T[p++].v; a = arith(op, a, pw()); } return a; };
    const pw = () => { let a = un(); while (peek('^')) { p++; const b = un(); a = a == null || b == null ? null : Math.pow(nn(a), nn(b)); } return a; };
    const un = () => { if (peek('-')) { p++; const v = un(); return v == null ? null : -nn(v); } if (peek('+')) { p++; return un(); } return prim(); };
    const prim = () => {
      const k = T[p++]; if (!k) throw 0;
      if (k.t === 'n') return k.v;
      if (k.t === 's') { const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k.v); return dm ? { d: Date.UTC(+dm[1], +dm[2] - 1, +dm[3]) / DAY } : k.v; }
      if (k.t === 'r') return ref(k.v);
      if (k.t === 'o' && k.v === '(') { const v = expr0(); if (!peek(')')) throw 0; p++; return v; }
      if (k.t === 'i') {
        if (peek('(')) {
          p++; const args = [];
          if (peek(')')) p++; else { for (;;) { args.push(expr0()); if (peek(',')) { p++; continue; } if (peek(')')) { p++; break; } throw 0; } }
          const f = FN[k.v.toUpperCase()]; if (!f) throw 0; return f(args.reduce((acc, x) => acc.concat(Array.isArray(x) ? x : [x]), []));
        }
        const U = k.v.toUpperCase();
        if ((U === 'TRUE' || U === 'FALSE') && !(k.v in data)) return U === 'TRUE' ? 1 : 0;
        if (peek(':')) { p++; const e2 = T[p++]; if (!e2 || e2.t !== 'i') throw 0; const a = colIdx(k.v), b = colIdx(e2.v); if (a < 0 || b < 0 || !cols) throw 0; const out = []; for (let x = Math.min(a, b); x <= Math.max(a, b); x++) if (cols[x] !== undefined) out.push(ref(cols[x])); return out; }
        return nameRef(k.v);
      }
      throw 0;
    };
    let r = expr0(); if (p < T.length) return '';
    if (r == null || Array.isArray(r)) return ''; if (isD(r)) return toStr(r); if (typeof r === 'string') return r;
    return isFinite(r) ? Math.round(r * 100) / 100 : '';
  } catch (e) { return ''; }
}
const schemaOf = tab => S.tabs.find(x => x.name === tab);
const vf = sc => sc.fields.filter(f => !f.hidden);
const canR = (sc, r) => (sc.rights || '').includes(r);
const blank = f => f.type === 'checkbox' ? false : (f.type === 'multiselect' || f.type === 'file') ? [] : '';
const blankDraft = sc => Object.fromEntries(sc.fields.map(f => [f.key, blank(f)]));
function recalc(sc, d) { const cols = sc.fields.map(f => f.key); sc.fields.forEach(f => { if (f.type === 'calc') d[f.key] = calcVal(f.calc, d, cols); }); }
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
  if (/^admin_(saveUser|userAction|createTab|updateTab|ackAlert)$/.test(action)) ADC.clear();   // admin data changed → drop cached admin pages
  return j;
}
function uploadFile(tab, field, file, onProgress) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(Object.assign(new Error('read'), { code: 'read' }));
    rd.onload = async () => {
      const b64 = String(rd.result).split(',')[1] || '';
      let p = 0;
      const iv = setInterval(() => { p += (0.9 - p) * 0.08; onProgress && onProgress(p); }, 200); // simulated progress (XHR upload.onprogress forces a CORS preflight that Apps Script rejects)
      try {
        let r;
        try {
          r = await fetch(CONFIG.API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'upload', token: S.token, tab, field, name: file.name, mime: file.type || 'application/octet-stream', data: b64 })
          });
        } catch (e) { throw Object.assign(new Error('network'), { code: 'network' }); }
        let j;
        try { j = await r.json(); } catch (e) { throw Object.assign(new Error('Bad server response'), { code: 'server' }); }
        setOnline(true);
        if (!j.ok) {
          if (j.error === 'auth') handleAuthExpired();
          throw Object.assign(new Error(j.message || j.error), { code: j.error });
        }
        onProgress && onProgress(1);
        resolve(j.file);
      } catch (e) { reject(e); }
      finally { clearInterval(iv); }
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
function confirmDlg(msg, danger = true, label) {
  return new Promise(res => {
    const o = document.createElement('div'); o.id = 'dlg'; o.className = 'overlay';
    o.style.alignItems = 'center'; o.innerHTML = `<div class="sheet glass" style="max-width:360px;border-radius:22px;transform:scale(.94)"><div class="sheet-body" style="padding:22px"><p style="margin:0 0 18px;font-weight:600">${esc(msg)}</p><div style="display:flex;gap:10px"><button class="btn" style="flex:1" data-r="0">${esc(t('cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" style="flex:1" data-r="1">${esc(label || t('del'))}</button></div></div></div>`;
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
  setTimeout(prefetchAdmin, 1500);   // warm the admin pages in the background so the first click is instant
}
function stopTimers() { clearInterval(hbTimer); clearInterval(syncTimer); clearInterval(S.adminTimer); ADC.clear(); S._pf = 0; }

async function refresh() {
  const b = await api('bootstrap');
  S.user = b.user; S.tabs = b.tabs; await meta.set('user', S.user); await meta.set('schema', S.tabs);
  if (!S.tabs.find(x => x.name === S.view.tab)) S.view.tab = S.tabs[0]?.name || null;
  await pullAll(); ensureDash(); await pullDash();
}

/* ----------------------------- login ----------------------------- */
function renderLogin(msg) {
  closeSheet(true);
  $('#app').innerHTML = `<div class="login"><form class="box glass" id="loginForm" autocomplete="on">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px"><div class="logo">🧭</div>
      <div style="display:flex;gap:6px"><button type="button" class="btn icon ghost" data-act="theme">${ic(S.theme === 'dark' ? 'sun' : 'moon')}</button><button type="button" class="btn icon ghost" data-act="lang">${ic('globe')}<b style="font-size:12px">${S.lang === 'ar' ? 'EN' : 'ع'}</b></button></div></div>
    <h1 style="margin:0 0 4px;font-size:26px;font-weight:700">${esc(t('appName'))}</h1><p class="muted" style="margin:0 0 22px">${esc(t('tagline'))}</p>
    <div class="fld"><label class="lab">${esc(t('username'))}</label><input class="inp" id="lu" name="username" autocomplete="username" autocapitalize="none" required></div>
    <div class="fld"><label class="lab">${esc(t('password'))}</label><input class="inp" id="lp" name="password" type="password" autocomplete="current-password" required></div>
    <div id="lmsg" style="min-height:22px;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--err)">${esc(msg || '')}</div>
    <button class="btn primary" id="lbtn" style="width:100%;padding:13px">${esc(t('login'))}</button></form></div>`;
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
    await refresh(); await refreshPending(); startTimers(); S.view.kind = 'dash'; DASH.edit = false; renderApp(); flush();
  } catch (err) {
    btn.disabled = false; btn.textContent = t('login');
    if (err.code === 'locked') {
      let s = err.data.retryAfter || 300; clearInterval(lockTimer); btn.disabled = true;
      const tick = () => { if (s <= 0) { clearInterval(lockTimer); msg.textContent = ''; btn.disabled = false; return; } msg.textContent = '🔒 ' + t('lockedFor', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); s--; };
      tick(); lockTimer = setInterval(tick, 1000);
    } else if (err.code === 'invalid') { msg.textContent = t('invalid') + (err.data.attemptsLeft != null ? ' — ' + t('attemptsLeft', err.data.attemptsLeft) : ''); $('#loginForm .box, .box').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); }
    else if (err.code === 'disabled') msg.textContent = t('disabled');
    else msg.textContent = err.code === 'network' ? t('networkErr') : err.message;
  }
}

/* ----------------------------- shell ----------------------------- */
function navItems() {
  const items = [{ id: 'dash', em: '📊', label: t('dashboard'), on: S.view.kind === 'dash' }].concat(S.tabs.map(tb => ({ id: 'tab:' + tb.name, em: tb.icon || '📄', label: tl(tb), on: S.view.kind === 'tab' && S.view.tab === tb.name })));
  if (S.user.role === 'admin') items.push({ id: 'admin', em: '🛡️', label: t('admin'), on: S.view.kind === 'admin' });
  return items;
}
function renderApp() {
  if (!S.user || !S.token) { renderLogin(); return; }
  const items = navItems(), isAdmin = S.user.role === 'admin';
  $('#app').innerHTML = `<div class="shell">
    <aside class="side glass hidden lg:flex"><div style="display:flex;align-items:center;gap:10px;padding:6px 8px 16px"><div class="logo" style="width:40px;height:40px;font-size:20px;border-radius:14px">🧭</div><b style="font-size:17px">${esc(t('appName'))}</b></div>
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
  else if (S.view.kind === 'dash') { $('#hdTitle').textContent = '📊 ' + t('dashboard'); $('#fab').style.display = 'none'; renderDash(); }
  else { S.view.kind = 'tab'; renderTabShell(); }
}

/* ----------------------------- tab view ----------------------------- */
function renderTabShell() {
  const main = $('#main'), fab = $('#fab'), sc = schemaOf(S.view.tab);
  if (!sc) { $('#hdTitle').textContent = t('appName'); fab.style.display = 'none'; main.innerHTML = `<div class="card" style="text-align:center;padding:40px">${esc(t('noTabs'))}</div>`; return; }
  $('#hdTitle').textContent = `${sc.icon || ''} ${tl(sc)}`; fab.style.display = canR(sc, 'w') ? 'flex' : 'none';
  const sel = vf(sc).find(f => f.type === 'select' && f.options?.length); const lay = S.layout || (innerWidth >= 1024 ? 'table' : 'cards');
  main.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:12px"><div style="position:relative;flex:1"><span style="position:absolute;top:11px;inset-inline-start:12px;color:var(--muted)">${ic('search')}</span>
      <input id="q" class="inp" style="padding-inline-start:42px" placeholder="${esc(t('search'))}" autocomplete="off" value="${esc(S.search)}"><div id="sugg" class="sugg glass" style="display:none"></div></div>
      <button class="btn icon" data-act="layout" title="layout">${ic(lay === 'table' ? 'grid' : 'list')}</button></div>
    ${sel ? `<div class="chips" id="fchips" style="margin-bottom:14px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px"><button class="chip ${!S.filter[sc.name] ? 'on' : ''}" data-f="">${esc(t('all'))}</button>${sel.options.map(o => `<button class="chip ${S.filter[sc.name] === o ? 'on' : ''}" data-f="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
    <div id="list"></div>`;
  const q = $('#q'); q.addEventListener('input', debounce(() => { S.search = q.value; S.limit = CONFIG.PAGE; renderList(); renderSugg(); }, 80));
  q.addEventListener('focus', renderSugg); q.addEventListener('blur', () => setTimeout(() => { const s = $('#sugg'); if (s) s.style.display = 'none'; }, 180));
  renderList();
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
  if (S.view.kind === 'dash') { dashSoft(); return; }
  const box = $('#list'); const sc = schemaOf(S.view.tab); if (!box || !sc || S.view.kind !== 'tab') return;
  const rows = rowsFor(sc), q = S.search, f = vf(sc), lay = S.layout || (innerWidth >= 1024 ? 'table' : 'cards'), shown = rows.slice(0, S.limit);
  if (!rows.length) { box.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--muted)"><div style="font-size:46px;margin-bottom:8px">🗂️</div><b style="color:var(--text)">${esc(t('noData'))}</b><div>${canR(sc, 'w') ? esc(t('noDataHint')) : ''}</div></div>`; return; }
  const more = rows.length > shown.length ? `<button class="btn" style="width:100%;margin-top:8px" data-act="more">+ ${rows.length - shown.length}</button>` : '';
  if (lay === 'table') {
    const cols = f.filter(x => x.type !== 'longtext').slice(0, 8);
    box.innerHTML = `<div class="tscroll"><table class="t"><thead><tr><th></th>${cols.map(c => `<th>${esc(fl(c))}</th>`).join('')}</tr></thead><tbody>${shown.map(r => `<tr class="row" data-act="open" data-id="${esc(r._id)}"><td style="width:20px">${r._pending ? '<span class="dotp"></span>' : ''}</td>${cols.map((c, i) => `<td>${i === 0 ? '<b>' : ''}${hl(displayVal(c, r[c.key]), q)}${i === 0 ? '</b>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${more}`;
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
  const sec = S.view.admin, names = { overview: 'overview', users: 'users', audit: 'audit', tabs: 'tabs' };
  $('#main').innerHTML = `<div class="sub">${Object.keys(names).map(k => `<button class="btn ${sec === k ? 'primary' : ''}" data-act="adm" data-id="${k}">${esc(t(k === 'audit' ? 'audit' : k))}</button>`).join('')}</div><div id="adm"></div>`;
  ({ overview: admOverview, users: admUsers, audit: admAudit, tabs: admTabs }[sec] || admOverview)();
}
const adminErr = e => { if (e.code !== 'auth') toast(e.code === 'network' ? t('networkErr') : e.message, 'err'); };
/* admin data cache — stale-while-revalidate: admin pages open instantly from memory, then refresh in the background */
const ADC = new Map(), ADF = new Map();
const adminKey = (a, p) => a + '|' + JSON.stringify(p || {});
const adminCached = (a, p) => { const e = ADC.get(adminKey(a, p)); return e ? e.v : null; };
function adminGet(a, p) {
  const k = adminKey(a, p); if (ADF.has(k)) return ADF.get(k);
  const pr = api(a, p || {}).then(v => { ADC.set(k, { v }); if (ADC.size > 40) ADC.delete(ADC.keys().next().value); return v; }).finally(() => ADF.delete(k));
  ADF.set(k, pr); return pr;
}
function prefetchAdmin() {
  if (!S.user || S.user.role !== 'admin' || !S.token || !navigator.onLine || Date.now() - (S._pf || 0) < 60000) return;
  S._pf = Date.now();
  [['admin_overview'], ['admin_users'], ['admin_tabs'], ['admin_audit', { filters: S.auditQ.filters, page: S.auditQ.page }]].forEach(([a, p], i) => setTimeout(() => adminGet(a, p).catch(() => {}), 500 * i));
}
function presenceText(u) { return u.online ? t('onlineSince', `<bdi dir="ltr">${esc(hhmm(u.since))}</bdi>`) : t('lastSeen', esc(relTime(u.lastSeen))); }   // returns safe HTML (time kept LTR inside RTL text)
function ovCss() {
  if (document.getElementById('ovcss')) return;
  const st = document.createElement('style'); st.id = 'ovcss';
  st.textContent = `.ov-kpi{text-align:start;cursor:pointer;font:inherit;color:inherit;width:100%;transition:transform .15s,box-shadow .2s,border-color .2s}
.ov-kpi:hover{transform:translateY(-3px);border-color:var(--c);box-shadow:0 14px 30px -16px var(--c)}.ov-kpi:active{transform:scale(.97)}
.ov-kpi small{display:block}.ov-go{position:absolute;inset-inline-end:12px;bottom:10px;font-size:22px;color:var(--c);opacity:.55;line-height:1}
.ov-tl{margin-top:10px;position:relative;display:flex;flex-direction:column;gap:2px}
.ov-ev{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:start;width:100%;padding:8px 6px;border:0;border-radius:14px;background:none;cursor:pointer;position:relative;transition:background .15s}
.ov-ev:hover{background:var(--surface2)}
.ov-ev:not(:last-child)::before{content:"";position:absolute;inset-inline-start:25px;top:44px;bottom:-4px;width:2px;background:linear-gradient(var(--border),transparent)}
.ov-dot{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:18px;background:color-mix(in srgb,var(--c) 16%,var(--bg2));border:1px solid color-mix(in srgb,var(--c) 42%,transparent);position:relative;z-index:1}
.ov-tx{min-width:0;display:flex;flex-direction:column;gap:2px}.ov-tx b{font-size:14px;color:var(--c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ov-tx small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ov-tm{display:flex;flex-direction:column;align-items:flex-end;font-size:12.5px;font-weight:700;white-space:nowrap}.ov-tm small{font-size:11px;font-weight:500;color:var(--muted)}
[dir=rtl] .ov-tm{align-items:flex-start}
.ov-flash{animation:ovf 1.2s ease}@keyframes ovf{0%,60%{box-shadow:0 0 0 3px var(--accent)}100%{box-shadow:none}}`;
  document.head.appendChild(st);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ov]'); if (!b) return;
  const k = b.dataset.ov, go = (sec, filters) => { S.auditQ = { page: 0, filters: filters || {} }; S.view = { ...S.view, kind: 'admin', admin: sec }; renderMain(); };
  const jump = id => { const el = document.getElementById(id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('ov-flash'); void el.offsetWidth; el.classList.add('ov-flash'); return true; } return false; };
  if (k === 'online') { if (!jump('ovUsers')) toast(t('noData'), 'warn'); }
  else if (k === 'users') go('users');
  else if (k === 'today') { const d = new Date(), z = n => String(n).padStart(2, '0'); go('audit', { from: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}` }); }
  else if (k === 'alerts') { if (!jump('ovAlerts')) go('audit', { action: 'security_alert' }); }
  else if (k === 'audit') go('audit');
  else if (k === 'user') go('audit', { user: b.dataset.u });
});
async function admOverview() {
  ovCss();
  const box = $('#adm'), c0 = adminCached('admin_overview'); if (!c0) box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  const paint = r => {
      S.alerts = r.kpis.openAlerts; renderBell(); const k = r.kpis, max = Math.max(1, ...r.hourly), now = new Date().getHours();
      const html = `<div class="kpis">${[['onlineNow', k.online, 'var(--ok)', 'online', '🟢'], ['totalUsers', k.total, 'var(--accent)', 'users', '👥'], ['actionsToday', k.actionsToday, 'var(--accent2)', 'today', '✏️'], ['openAlerts', k.openAlerts, k.openAlerts ? 'var(--err)' : 'var(--muted)', 'alerts', '🚨']].map(([l, v, c, go, em]) => `<button type="button" class="kpi ov-kpi glass" data-ov="${go}" style="--c:${c}"><small>${em} ${esc(t(l))}</small><b style="color:${c}">${v}</b><span class="ov-go">${S.lang === 'ar' ? '‹' : '›'}</span></button>`).join('')}</div>
      ${r.alerts.length ? `<div id="ovAlerts" style="margin-top:14px">${r.alerts.map(a => `<div class="alert"><span style="font-size:22px">🚨</span><div style="flex:1;min-width:0;word-break:break-word"><b>${esc(t('brute'))}</b><div style="font-size:13px">${esc(a.message)}</div><div class="muted" style="font-size:12px">${fullTime(a.ts)}</div></div><button class="btn" data-act="ack" data-id="${esc(a.id)}">${esc(t('ack'))}</button></div>`).join('')}</div>` : ''}
      <div class="card glass" id="ovUsers" style="margin-top:14px"><b>${esc(t('onlineNow'))} / ${esc(t('users'))}</b>${r.users.map(u => `<div class="urow"><div class="av">${esc((u.name || u.username)[0].toUpperCase())}<span class="on ${u.online ? 'y' : ''}"></span></div><div style="flex:1;min-width:0"><b>${esc(u.name || u.username)}</b> <span class="badge">${esc(u.role)}</span>${u.locked ? ` <span class="badge" style="color:var(--err)">🔒 ${esc(t('locked'))}</span>` : ''}${u.active ? '' : ' <span class="badge">off</span>'}<div class="muted" style="font-size:12px">@${esc(u.username)} · ${presenceText(u)}</div></div>${u.locked ? `<button class="btn" data-act="unlock" data-id="${esc(u.username)}">${esc(t('unlock'))}</button>` : ''}</div>`).join('')}</div>
      <div class="card glass" style="margin-top:14px"><b>${esc(t('activity24'))}</b><svg viewBox="0 0 240 70" style="width:100%;height:90px;margin-top:8px">${r.hourly.map((v, i) => { const h = Math.round(v / max * 56); return `<rect x="${i * 10 + 1}" y="${64 - h}" width="8" height="${Math.max(h, 2)}" rx="2" fill="url(#g)" opacity="${v ? 1 : .25}"/>`; }).join('')}<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs></svg></div>
      <div class="card glass" style="margin-top:14px"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1">${esc(t('recent'))}</b><button type="button" class="btn" data-ov="audit" style="padding:6px 12px;font-size:12px">${esc(t('audit'))} ${S.lang === 'ar' ? '‹' : '›'}</button></div>
        <div class="ov-tl">${r.recent.map(a => { const m = (typeof AUD !== 'undefined' && AUD[a.action]) || ['•', 'var(--muted)'], sc0 = a.tab ? schemaOf(a.tab) : null; return `<button type="button" class="ov-ev" data-ov="user" data-u="${esc(a.user)}" style="--c:${m[1]}"><span class="ov-dot">${m[0]}</span><span class="ov-tx"><b>${esc(audLbl(a.action))}</b><small>${esc(a.user || '—')}${a.tab ? ' · ' + esc(sc0 ? tl(sc0) : a.tab) : ''}</small></span><span class="ov-tm" dir="ltr">${esc(hhmm(a.ts))}<small>${esc(relTime(a.ts))}</small></span></button>`; }).join('') || `<div class="muted" style="padding:10px 0">—</div>`}</div></div>`;
      if (box._h !== html) { box.innerHTML = html; box._h = html; }   // repaint only when something changed (no flicker)
  };
  const load = async () => {
    if (document.hidden && box._h) return;   // pause polling while the tab is in the background
    try { const r = await adminGet('admin_overview'); if (S.view.kind !== 'admin' || S.view.admin !== 'overview') return; paint(r); }
    catch (e) { if (!box._h) adminErr(e); }
  };
  if (c0) paint(c0);
  await load(); S.adminTimer = setInterval(load, CONFIG.ADMIN_POLL_MS);
}
/* ----------------------------- audit log: timeline view (UI only — API/filters/paging unchanged) ----------------------------- */
Object.assign(I18N.en, {
  audSub: 'Every sign-in, edit and security event — newest first', audToday: 'Today', audYesterday: 'Yesterday', audOpenRec: 'Open record', audOpenTab: 'Open page', audOpenUser: 'Open user',
  audOpenTabs: 'Page settings', audMissing: 'Record no longer exists', audNoUser: 'User no longer exists', audNoRows: 'No events match these filters', audFilters: 'Filters', audEvents: 'events',
  audEmpty: '(empty)', audFile: 'File', audSize: 'Size', audRenamed: 'Renamed', audAttempt: 'Attempt', audFailsTotal: 'Wrong attempts', audLocks: 'Lockouts', audDevice: 'Device',
  audAdded: 'Added', audEdited: 'Edited', audDeleted: 'Deleted', audSecurity: 'Security', audThisPage: 'on this page', audClear: 'Clear filters', audPwChanged: 'Password changed',
  a_login: 'Signed in', a_logout: 'Signed out', a_login_fail: 'Failed sign-in', a_login_blocked: 'Blocked sign-in', a_lockout: 'Account locked', a_security_alert: 'Security alert',
  a_create: 'Record added', a_update: 'Record edited', a_delete: 'Record deleted', a_conflict: 'Edit conflict', a_upload: 'File uploaded', a_download: 'File opened',
  a_user_create: 'User created', a_user_update: 'User updated', a_user_unlock: 'User unlocked', a_tab_create: 'Page created', a_tab_update: 'Page edited', a_brand_update: 'Logo / name changed'
});
Object.assign(I18N.ar, {
  audSub: 'كل عمليات الدخول والتعديل والأحداث الأمنية — الأحدث أولاً', audToday: 'اليوم', audYesterday: 'أمس', audOpenRec: 'فتح السجل', audOpenTab: 'فتح الصفحة', audOpenUser: 'فتح المستخدم',
  audOpenTabs: 'إعدادات الصفحة', audMissing: 'السجل لم يعد موجوداً', audNoUser: 'المستخدم لم يعد موجوداً', audNoRows: 'لا توجد أحداث مطابقة', audFilters: 'تصفية', audEvents: 'حدث',
  audEmpty: '(فارغ)', audFile: 'الملف', audSize: 'الحجم', audRenamed: 'إعادة تسمية', audAttempt: 'المحاولة', audFailsTotal: 'محاولات خاطئة', audLocks: 'مرات القفل', audDevice: 'الجهاز',
  audAdded: 'إضافات', audEdited: 'تعديلات', audDeleted: 'حذف', audSecurity: 'أمني', audThisPage: 'في هذه الصفحة', audClear: 'مسح التصفية', audPwChanged: 'تغيير كلمة المرور',
  a_login: 'تسجيل دخول', a_logout: 'تسجيل خروج', a_login_fail: 'محاولة دخول فاشلة', a_login_blocked: 'دخول محظور', a_lockout: 'قفل الحساب', a_security_alert: 'تنبيه أمني',
  a_create: 'إضافة سجل', a_update: 'تعديل سجل', a_delete: 'حذف سجل', a_conflict: 'تعارض في التعديل', a_upload: 'رفع ملف', a_download: 'فتح ملف',
  a_user_create: 'إنشاء مستخدم', a_user_update: 'تعديل مستخدم', a_user_unlock: 'فك قفل مستخدم', a_tab_create: 'إنشاء صفحة', a_tab_update: 'تعديل صفحة', a_brand_update: 'تغيير الشعار / الاسم'
});
const AUD = {
  login: ['🔑', 'var(--ok)'], logout: ['🚪', 'var(--muted)'], login_fail: ['⛔', 'var(--err)'], login_blocked: ['🚫', 'var(--err)'], lockout: ['🔒', 'var(--err)'], security_alert: ['🚨', 'var(--err)'],
  create: ['✨', 'var(--ok)'], update: ['✏️', 'var(--accent)'], delete: ['🗑️', 'var(--err)'], conflict: ['⚠️', 'var(--warn)'], upload: ['📎', 'var(--accent2)'], download: ['📥', 'var(--accent2)'],
  user_create: ['👤', 'var(--ok)'], user_update: ['🛠️', 'var(--accent)'], user_unlock: ['🔓', 'var(--ok)'], tab_create: ['🧩', 'var(--ok)'], tab_update: ['🧩', 'var(--accent)'], brand_update: ['🎨', 'var(--accent)']
};
const AUD_SEC = ['login_fail', 'login_blocked', 'lockout', 'security_alert'];
const AUD_QUICK = [['', '🗂️'], ['create', '✨'], ['update', '✏️'], ['delete', '🗑️'], ['upload', '📎'], ['login', '🔑'], ['login_fail', '⛔'], ['lockout', '🔒']];
const audLbl = a => { const k = 'a_' + a; return (I18N[S.lang] || {})[k] ?? I18N.en[k] ?? a; };
const audParse = s => { try { const j = JSON.parse(s); return j && typeof j === 'object' ? j : null; } catch (e) { return null; } };
const audDev = s => { s = String(s || ''); if (!s) return ''; const b = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : '', o = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : ''; return [b, o].filter(Boolean).join(' · '); };
function audVal(f, v) {
  if (v === '' || v == null || (Array.isArray(v) && !v.length)) return `<i class="aud-empty">${esc(t('audEmpty'))}</i>`;
  try {
    if (f) return esc(displayVal(f, v));
    if (Array.isArray(v)) return esc(v.map(x => x && typeof x === 'object' ? (x.name || JSON.stringify(x)) : x).join(', '));
    return esc(typeof v === 'object' ? JSON.stringify(v) : String(v));
  } catch (e) { return esc(String(v)); }
}
function audDay(ms) {
  if (!ms) return '—';
  const d = new Date(ms), n = new Date(), s = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((s(n) - s(d)) / 86400000);
  if (diff === 0) return t('audToday'); if (diff === 1) return t('audYesterday');
  return d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function audRecTitle(a, d) {
  const sc = schemaOf(a.tab); if (!sc) return '';
  const f0 = vf(sc)[0]; if (!f0) return '';
  const src = d && (d.data || d.before); let v = src ? src[f0.key] : undefined;
  if ((v === undefined || v === '') && a.rowId) { const rec = dataOf(a.tab).get(String(a.rowId)); if (rec) v = rec[f0.key]; }
  return isEmpty(v) ? '' : displayVal(f0, v);
}
function audBody(a, d, sc) {
  if (!d) return '';
  const A = String(a.action), kv = (k, v, cls) => `<span class="aud-kv ${cls || ''}"><small>${esc(k)}</small><b>${v}</b></span>`;
  const fld = k => sc && sc.fields.find(x => x.key === k), flab = k => { const f = fld(k); return f ? fl(f) : k; };
  const chips = (obj, cls, max) => {
    const ks = Object.keys(obj || {}).filter(k => !isEmpty(obj[k]) && obj[k] !== false);
    return ks.slice(0, max).map(k => kv(flab(k), audVal(fld(k), obj[k]), cls)).join('') + (ks.length > max ? `<span class="aud-more">+${ks.length - max}</span>` : '');
  };
  let h = '';
  if (A === 'create') h = `<div class="aud-kvs">${chips(d.data, 'n', 5)}</div>`;
  else if (A === 'delete') h = `<div class="aud-kvs">${chips(d.before, 'o', 5)}</div>`;
  else if (A === 'update' && d.changes) {
    const ks = Object.keys(d.changes);
    h = `<div class="aud-df">${ks.slice(0, 5).map(k => { const c = d.changes[k] || []; return `<div class="aud-dr"><span class="aud-fk">${esc(flab(k))}</span><span class="aud-old">${audVal(fld(k), c[0])}</span><span class="aud-arr">→</span><span class="aud-new">${audVal(fld(k), c[1])}</span></div>`; }).join('')}${ks.length > 5 ? `<span class="aud-more">+${ks.length - 5}</span>` : ''}</div>`;
  }
  else if (A === 'conflict') h = `<div class="aud-kvs">${(d.fields || []).map(k => kv(t('conflictTitle'), esc(flab(k)), 'w')).join('')}</div>`;
  else if (A === 'upload') h = `<div class="aud-kvs">${kv(t('audFile'), esc(d.name || ''))}${d.field ? kv(t('fields'), esc(flab(d.field))) : ''}${d.size ? kv(t('audSize'), esc(Math.max(1, Math.round(d.size / 1024)) + ' KB')) : ''}</div>`;
  else if (A === 'download') h = `<div class="aud-kvs">${kv(t('audFile'), esc(d.name || ''))}</div>`;
  else if (A === 'login_fail') h = `<div class="aud-kvs">${d.attempt != null ? kv(t('audAttempt'), esc(d.attempt)) : ''}${d.reason ? kv(t('status'), esc(d.reason)) : ''}</div>`;
  else if (A === 'lockout' || A === 'security_alert') h = `<div class="aud-kvs">${d.lockCount != null ? kv(t('audLocks'), esc(d.lockCount)) : ''}${d.totalFails != null ? kv(t('audFailsTotal'), esc(d.totalFails)) : ''}</div>`;
  else if (A === 'user_create' || A === 'user_update') h = `<div class="aud-kvs">${d.role ? kv(t('role'), esc(d.role)) : ''}${kv(t('permissions'), esc(d.role === 'admin' ? '*' : (d.perms || '—')))}${d.active === false ? kv(t('active'), 'off', 'o') : ''}${d.passwordChanged ? kv('🔑', esc(t('audPwChanged')), 'n') : ''}</div>`;
  else if (A === 'tab_create') h = `<div class="aud-kvs">${kv(t('fields'), esc((d.fields || []).length))}</div>`;
  else if (A === 'tab_update') h = `<div class="aud-kvs">${(d.renames || []).map(p => kv(t('audRenamed'), `${esc(p[0])} → ${esc(p[1])}`)).join('')}${(d.headers || []).length ? kv(t('fields'), esc(d.headers.length)) : ''}</div>`;
  return h.replace(/<div class="aud-kvs"><\/div>/, '') ? `<div class="aud-body">${h}</div>` : '';
}
function audLink(a) {
  const A = String(a.action), rid = String(a.rowId || ''), sc = a.tab ? schemaOf(a.tab) : null, out = [];
  const go = (attrs, icon, label, ghost) => `<button type="button" class="aud-go${ghost ? ' ghost' : ''}" ${attrs}>${ic(icon)}<span>${esc(label)}</span></button>`;
  const tabBtn = () => go(`data-act="nav" data-id="tab:${esc(a.tab)}"`, 'grid', t('audOpenTab'), true);
  if (sc && ['create', 'update', 'conflict'].includes(A)) {
    if (rid && dataOf(a.tab).has(rid)) out.push(go(`data-act="wopen" data-t="${esc(a.tab)}" data-id="${esc(rid)}"`, 'edit', t('audOpenRec')));
    else if (rid) out.push(`<span class="aud-gone">🗑️ ${esc(t('audMissing'))}</span>`);
    out.push(tabBtn());
  } else if (sc && ['delete', 'upload', 'download'].includes(A)) out.push(tabBtn());
  else if (A === 'user_create' || A === 'user_update' || A === 'user_unlock') { if (rid) out.push(go(`data-aud="user" data-id="${esc(rid)}"`, 'shield', t('audOpenUser'))); }
  else if (AUD_SEC.includes(A) && a.user) out.push(go(`data-aud="user" data-id="${esc(a.user)}"`, 'shield', t('audOpenUser'), true));
  else if ((A === 'tab_create' || A === 'tab_update') && sc) out.push(go(`data-aud="tab" data-id="${esc(a.tab)}"`, 'sliders', t('audOpenTabs')), tabBtn());
  return out.length ? `<div class="aud-foot">${out.join('')}</div>` : '';
}
function audEvent(a, i) {
  const A = String(a.action), m = AUD[A] || ['•', 'var(--muted)'], d = audParse(a.details), sc = a.tab ? schemaOf(a.tab) : null;
  const rec = audRecTitle(a, d), dev = audDev(a.device), raw = String(a.details || '');
  const tabChip = a.tab ? `<span class="aud-tab">${sc ? esc((sc.icon || '') + ' ' + tl(sc)) : esc(a.tab)}</span>` : '';
  const det = raw && raw !== '{}' ? `<details class="aud-det"><summary>${ic('list')} ${esc(t('details'))}</summary><div class="aud-meta"><span>${esc(t('time'))}: <b>${esc(fullTime(a.ts))}</b></span>${a.rowId ? `<span>ID: <b dir="ltr">${esc(String(a.rowId))}</b></span>` : ''}${a.device ? `<span>${esc(t('audDevice'))}: <b dir="ltr">${esc(String(a.device).slice(0, 120))}</b></span>` : ''}</div><pre>${esc(prettyJson(raw))}</pre></details>` : '';
  return `<div class="aud-ev" style="--c:${m[1]};animation-delay:${Math.min(i, 10) * 30}ms"><div class="aud-dot">${m[0]}</div><div class="aud-card">
    <div class="aud-top"><b class="aud-act">${esc(audLbl(A))}</b>${tabChip}<span class="aud-time" title="${esc(fullTime(a.ts))}">${esc(hhmm(a.ts))} · ${esc(relTime(a.ts))}</span></div>
    <div class="aud-who"><span class="aud-av">${esc(String(a.user || '?')[0].toUpperCase())}</span><b>${esc(a.user || '—')}</b>${rec ? `<span class="aud-rec">· <b>${esc(rec)}</b></span>` : ''}${dev ? `<span class="aud-dev">${esc(dev)}</span>` : ''}</div>
    ${audBody(a, d, sc)}${det}${audLink(a)}</div></div>`;
}
function audCss() {
  if (document.getElementById('audcss')) return;
  const s = document.createElement('style'); s.id = 'audcss';
  s.textContent = `
.aud-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px;margin-bottom:14px;border:1px solid var(--border);background:linear-gradient(135deg,rgba(56,189,248,.18),rgba(167,139,250,.18)),var(--surface);box-shadow:var(--shadow);animation:rise .4s both}
.aud-hero::after{content:"";position:absolute;inset-inline-end:-50px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,var(--accent),transparent 65%);opacity:.22;pointer-events:none}
.aud-ht{display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:relative;z-index:1}
.aud-hi{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:23px;flex:none;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 0 28px -6px var(--accent)}
.aud-hi+div{flex:1 1 180px;min-width:0}.aud-hi+div b{display:block;font-size:20px;font-weight:800}.aud-hi+div span{font-size:13px;color:var(--muted)}
.aud-total{margin-inline-start:auto;text-align:end}
.aud-total b{display:block;font-size:30px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.aud-total small{color:var(--muted);font-weight:700;font-size:11px}
.aud-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px;position:relative;z-index:1}
@media(max-width:560px){.aud-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
.aud-stat{border-radius:14px;padding:9px 12px;background:var(--surface);border:1px solid var(--border);min-width:0}
.aud-stat small{display:block;color:var(--muted);font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aud-stat b{font-size:20px;font-variant-numeric:tabular-nums}
.aud-bar{display:flex;gap:8px;margin-bottom:10px}
.aud-search{position:relative;flex:1;min-width:0}
.aud-search .ic{position:absolute;top:11px;inset-inline-start:12px;color:var(--muted)}
.aud-search .inp{padding-inline-start:40px}
.aud-chips{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}
.aud-chips::-webkit-scrollbar{display:none}
.aud-chips .chip{flex:none;white-space:nowrap}
.aud-flt{margin-bottom:12px;border-radius:18px;padding:12px 14px}
.aud-flt summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px}
.aud-flt summary::-webkit-details-marker{display:none}
.aud-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px}
.aud-grid .afbtn{grid-column:1/-1}
.aud-day{position:sticky;top:62px;z-index:5;margin:14px 0 10px;display:flex}
.aud-day span{padding:5px 14px;border-radius:999px;font-size:12px;font-weight:800;color:var(--accent);background:var(--bg2);border:1px solid rgba(56,189,248,.3);box-shadow:var(--shadow)}
.aud-ev{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding-bottom:12px;animation:rise .35s both}
.aud-ev::before{content:"";position:absolute;inset-inline-start:21px;top:44px;bottom:-2px;width:2px;background:linear-gradient(var(--border),transparent)}
.aud-ev:last-child::before{display:none}
.aud-dot{width:44px;height:44px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:20px;background:color-mix(in srgb,var(--c) 16%,var(--bg2));border:1px solid color-mix(in srgb,var(--c) 45%,transparent);box-shadow:0 0 22px -8px var(--c);position:relative;z-index:1}
.aud-card{min-width:0;border-radius:16px;padding:11px 14px;background:var(--surface);border:1px solid var(--border);border-inline-start:3px solid var(--c);transition:transform .18s,box-shadow .18s}
.aud-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px -16px var(--c)}
.aud-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.aud-act{color:var(--c);font-size:15px}
.aud-tab{padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(56,189,248,.12);color:var(--accent);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aud-time{margin-inline-start:auto;font-size:12px;color:var(--muted);white-space:nowrap}
.aud-who{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;min-width:0;flex-wrap:wrap}
.aud-av{width:22px;height:22px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));flex:none}
.aud-rec{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.aud-rec b{color:var(--text)}
.aud-dev{font-size:11px;color:var(--muted);padding:1px 8px;border-radius:8px;background:var(--surface2)}
.aud-body{margin-top:9px}
.aud-kvs{display:flex;flex-wrap:wrap;gap:6px}
.aud-kv{display:inline-flex;align-items:baseline;gap:6px;padding:4px 10px;border-radius:10px;font-size:12.5px;background:var(--surface2);border:1px solid var(--border);max-width:100%;min-width:0}
.aud-kv small{color:var(--muted);font-weight:700;font-size:11px;flex:none}
.aud-kv b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.aud-kv.n{background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.3)}
.aud-kv.o{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.28)}
.aud-kv.o b{text-decoration:line-through;text-decoration-color:rgba(248,113,113,.7)}
.aud-kv.w{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.3)}
.aud-df{display:flex;flex-direction:column;gap:6px}
.aud-dr{display:grid;grid-template-columns:minmax(70px,26%) minmax(0,1fr) auto minmax(0,1fr);gap:8px;align-items:center;font-size:12.5px}
@media(max-width:560px){.aud-dr{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}.aud-dr .aud-fk{grid-column:1/-1}}
.aud-fk{color:var(--muted);font-weight:700;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aud-old,.aud-new{padding:4px 9px;border-radius:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.aud-old{background:rgba(248,113,113,.11);color:var(--err);text-decoration:line-through;text-decoration-color:rgba(248,113,113,.5)}
.aud-new{background:rgba(52,211,153,.13);color:var(--ok);font-weight:700}
.aud-arr{color:var(--muted)}[dir=rtl] .aud-arr{display:inline-block;transform:scaleX(-1)}
.aud-empty{opacity:.6;font-style:normal}
.aud-more{align-self:center;font-size:12px;font-weight:700;color:var(--muted);padding:2px 8px}
.aud-det{margin-top:9px}
.aud-det summary{cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:700}
.aud-det summary::-webkit-details-marker{display:none}
.aud-det summary .ic{width:14px;height:14px}
.aud-det[open] summary{color:var(--accent)}
.aud-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12px;color:var(--muted);word-break:break-all}.aud-meta b{color:var(--text)}
.aud-det pre{white-space:pre-wrap;word-break:break-all;font-size:11px;margin:8px 0 0;padding:10px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);max-height:220px;overflow:auto;direction:ltr;text-align:left}
.aud-foot{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
.aud-go{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:11px;border:0;cursor:pointer;font-weight:700;font-size:12.5px;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:var(--glow);transition:transform .12s}
.aud-go:active{transform:scale(.95)}.aud-go .ic{width:15px;height:15px}
.aud-go.ghost{background:var(--surface2);color:var(--text);box-shadow:none;border:1px solid var(--border)}
.aud-gone{font-size:12px;color:var(--err);font-weight:700}
.aud-pg{display:flex;gap:10px;justify-content:center;align-items:center;margin-top:8px}
.aud-none{text-align:center;padding:50px 16px;color:var(--muted)}.aud-none div{font-size:46px;margin-bottom:6px}
@media(max-width:480px){.aud-ev{grid-template-columns:36px minmax(0,1fr);gap:8px}.aud-dot{width:36px;height:36px;font-size:17px;border-radius:12px}.aud-ev::before{inset-inline-start:17px;top:36px}.aud-time{margin-inline-start:0;width:100%}}
@media(prefers-reduced-motion:reduce){.aud-ev,.aud-hero{animation:none}}`;
  document.head.appendChild(s);
}
async function admAudit() {
  audCss();
  const box = $('#adm'), q = S.auditQ, pay = { filters: q.filters, page: q.page }, cu = adminCached('admin_users'), cr = adminCached('admin_audit', pay);
  const paint = (u, r) => {
    const F = q.filters;
    const nf = ['user', 'tab', 'action', 'text', 'from', 'to'].filter(k => F[k]).length, g = { c: 0, u: 0, d: 0, s: 0 };
    r.rows.forEach(a => { if (a.action === 'create') g.c++; else if (a.action === 'update') g.u++; else if (a.action === 'delete') g.d++; else if (AUD_SEC.includes(a.action)) g.s++; });
    let lastDay = null, idx = 0;
    const events = r.rows.map(a => { const day = audDay(a.ts); let head = ''; if (day !== lastDay) { lastDay = day; head = `<div class="aud-day"><span>${esc(day)}</span></div>`; } return head + audEvent(a, idx++); }).join('');
    const stat = (l, v, c) => `<div class="aud-stat"><small>${esc(l)} · ${esc(t('audThisPage'))}</small><b style="color:${c}">${v}</b></div>`;
    box.innerHTML = `<div class="aud-hero"><div class="aud-ht"><div class="aud-hi">🛡️</div><div><b>${esc(t('audit'))}</b><span>${esc(t('audSub'))}</span></div><div class="aud-total"><b>${r.total.toLocaleString(loc())}</b><small>${esc(t('audEvents'))}</small></div></div>
      <div class="aud-stats">${stat(t('audAdded'), g.c, 'var(--ok)')}${stat(t('audEdited'), g.u, 'var(--accent)')}${stat(t('audDeleted'), g.d, 'var(--err)')}${stat(t('audSecurity'), g.s, g.s ? 'var(--err)' : 'var(--muted)')}</div></div>
      <div class="aud-bar"><div class="aud-search">${ic('search')}<input class="inp" id="aq_text" placeholder="${esc(t('search'))}" value="${esc(F.text || '')}" autocomplete="off"></div><button class="btn primary" data-act="aq_apply">${ic('search')}<span class="hidden sm:inline">${esc(t('apply'))}</span></button></div>
      <div class="aud-chips">${AUD_QUICK.map(([v, em]) => `<button type="button" class="chip ${(F.action || '') === v ? 'on' : ''}" data-aq-act="${v}">${em} ${esc(v ? audLbl(v) : t('all'))}</button>`).join('')}${nf ? `<button type="button" class="chip" data-aq-clear="1">✕ ${esc(t('audClear'))}</button>` : ''}</div>
      <details class="aud-flt card glass" ${nf ? 'open' : ''}><summary>🎛️ ${esc(t('audFilters'))}${nf ? ` <span class="badge">${nf}</span>` : ''}</summary><div class="aud-grid">
        <select class="inp" id="aq_user"><option value="">${esc(t('user'))}: ${esc(t('allUsers'))}</option>${u.users.map(x => `<option ${F.user === x.username ? 'selected' : ''}>${esc(x.username)}</option>`).join('')}</select>
        <select class="inp" id="aq_tab"><option value="">${esc(t('allTabs'))}</option>${u.tabs.map(x => `<option ${F.tab === x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select class="inp" id="aq_action"><option value="">${esc(t('allActions'))}</option>${ACTIONS.map(x => `<option value="${x}" ${F.action === x ? 'selected' : ''}>${esc(audLbl(x))}</option>`).join('')}</select>
        <input class="inp" id="aq_from" type="date" value="${esc(F.from || '')}" title="${esc(t('from'))}"><input class="inp" id="aq_to" type="date" value="${esc(F.to || '')}" title="${esc(t('to'))}">
        <button class="btn primary afbtn" data-act="aq_apply">${ic('search')} ${esc(t('apply'))}</button></div></details>
      ${r.rows.length ? `<div class="aud-tl">${events}</div>` : `<div class="aud-none"><div>🔎</div><b style="color:var(--text)">${esc(t('audNoRows'))}</b></div>`}
      <div class="aud-pg"><button class="btn" data-act="apage" data-id="-1" ${q.page <= 0 ? 'disabled' : ''}>${esc(t('prev'))}</button><span class="muted">${q.page + 1} / ${Math.max(1, Math.ceil(r.total / r.size))}</span><button class="btn" data-act="apage" data-id="1" ${(q.page + 1) * r.size >= r.total ? 'disabled' : ''}>${esc(t('next'))}</button></div>`;
  };
  if (cu && cr) paint(cu, cr); else box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const [u, r] = await Promise.all([adminGet('admin_users'), adminGet('admin_audit', pay)]);
    if (S.view.kind !== 'admin' || S.view.admin !== 'audit') return;
    if (!cu || !cr || JSON.stringify(r) !== JSON.stringify(cr) || JSON.stringify(u) !== JSON.stringify(cu)) paint(u, r);
  } catch (e) { if (!(cu && cr)) adminErr(e); }
}
/* audit-only listeners: quick filter chips, search on Enter, jump links to user / page editors */
document.addEventListener('click', async e => {
  if (e.target.closest('[data-aq-clear]')) { S.auditQ = { page: 0, filters: {} }; admAudit(); return; }
  const qa = e.target.closest('[data-aq-act]');
  if (qa) {
    const rd = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    S.auditQ = { page: 0, filters: { user: rd('aq_user'), tab: rd('aq_tab'), action: qa.dataset.aqAct, text: rd('aq_text').trim(), from: rd('aq_from'), to: rd('aq_to') } }; admAudit(); return;
  }
  const go = e.target.closest('[data-aud]'); if (!go) return;
  const kind = go.dataset.aud, id = go.dataset.id;
  try {
    if (kind === 'user') {
      const r = await api('admin_users');
      if (!r.users.find(x => x.username === id)) { toast(t('audNoUser'), 'warn'); return; }
      S._adm = r; S.view = { ...S.view, kind: 'admin', admin: 'users' }; renderApp(); openUserForm(id);
    } else if (kind === 'tab') {
      const r = await api('admin_tabs'); S._admTabs = r.tabs;
      if (!r.tabs.find(x => x.name === id)) { toast(t('audMissing'), 'warn'); return; }
      S.view = { ...S.view, kind: 'admin', admin: 'tabs' }; renderApp(); openTabBuilder(id);
    }
  } catch (er) { adminErr(er); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'aq_text') { const b = document.querySelector('[data-act=aq_apply]'); if (b) b.click(); } });
const prettyJson = s => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return s; } };
async function admUsers() {
  const box = $('#adm'), c0 = adminCached('admin_users');
  const paint = r => { S._adm = r;
    box.innerHTML = `<button class="btn primary" data-act="user_new" style="margin-bottom:12px">${ic('plus')} ${esc(t('newUser'))}</button><div class="card glass">${r.users.map(u => `<div class="urow"><div class="av">${esc((u.name || u.username)[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b>${esc(u.name)}</b> <span class="badge">${esc(u.role)}</span>${u.active ? '' : ' <span class="badge">off</span>'}<div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">@${esc(u.username)} · ${esc(u.role === 'admin' ? '*' : u.perms || '—')}</div></div><button class="btn icon" data-act="user_edit" data-id="${esc(u.username)}">${ic('edit')}</button></div>`).join('')}</div>`; };
  if (c0) paint(c0); else box.innerHTML = '<div class="skeleton"></div>';
  try { const r = await adminGet('admin_users'); if (S.view.kind !== 'admin' || S.view.admin !== 'users') return; if (!c0 || JSON.stringify(r) !== JSON.stringify(c0)) paint(r); }
  catch (e) { if (!c0) adminErr(e); }
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
  const box = $('#adm'), c0 = adminCached('admin_tabs');
  const paint = r => { S._admTabs = r.tabs;
    box.innerHTML = (window.__erpBrandCard ? window.__erpBrandCard() : '') + `<button class="btn primary" data-act="tab_new" style="margin-bottom:12px">${ic('plus')} ${esc(t('createTab'))}</button>${r.tabs.map(tb => `<div class="card glass" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1;min-width:0">${esc(tb.icon)} ${esc(tb.label)} ${tb.ar ? `<span class="muted">· ${esc(tb.ar)}</span>` : ''}</b><button class="btn icon" data-act="tab_edit" data-id="${esc(tb.name)}" title="${esc(t('editTab'))}">${ic('edit')}</button></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${tb.fields.map((f, i) => `<span class="badge"><b>${colLetter(i)}</b> ${esc(f.label)} <span class="muted">· ${esc(typeName(f.type))}</span></span>`).join('')}</div></div>`).join('')}`; };
  if (c0) paint(c0); else box.innerHTML = '<div class="skeleton"></div>';
  try { const r = await adminGet('admin_tabs'); if (S.view.kind !== 'admin' || S.view.admin !== 'tabs') return; if (!c0 || JSON.stringify(r) !== JSON.stringify(c0)) paint(r); }
  catch (e) { if (!c0) adminErr(e); }
}
/* ----------------------------- Excel-style formula assistant (used by the page builder) ----------------------------- */
const fxTx = (en, ar) => (S.lang === 'ar' ? ar : en);
const colLetter = i => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const FX_OPS = [['+', '+'], ['\u2212', '-'], ['\u00d7', '*'], ['\u00f7', '/'], ['^', '^'], ['&', '&'], ['(', '('], [')', ')']];
const fxFuncs = () => [
  [fxTx('Math', 'حساب'), [['SUM', 'مجموع'], ['AVG', 'متوسط'], ['MIN', 'أقل قيمة'], ['MAX', 'أكبر قيمة'], ['ROUND', 'تقريب'], ['ROUNDUP', 'تقريب لأعلى'], ['ROUNDDOWN', 'تقريب لأسفل'], ['ABS', 'قيمة مطلقة'], ['INT', 'جزء صحيح'], ['MOD', 'باقي القسمة'], ['POWER', 'أُس'], ['SQRT', 'جذر تربيعي']]],
  [fxTx('Logic', 'منطق'), [['IF', 'لو (شرط)'], ['AND', 'و'], ['OR', 'أو'], ['NOT', 'ليس'], ['IFERROR', 'لو حدث خطأ'], ['ISBLANK', 'هل فارغ؟']]],
  [fxTx('Dates', 'تواريخ'), [['TODAY', 'تاريخ اليوم'], ['DAYS', 'الأيام بين تاريخين'], ['MONTHS', 'الشهور بين تاريخين'], ['YEARS', 'السنوات بين تاريخين'], ['ADDDAYS', 'إضافة أيام'], ['ADDMONTHS', 'إضافة شهور'], ['EDATE', 'تاريخ بعد شهور'], ['EOMONTH', 'آخر يوم في الشهر'], ['DATEDIF', 'فرق تواريخ'], ['YEAR', 'السنة'], ['MONTH', 'الشهر'], ['DAY', 'اليوم']]],
  [fxTx('Text', 'نص'), [['CONCAT', 'دمج نصوص'], ['LEN', 'عدد الحروف'], ['LEFT', 'أول حروف'], ['RIGHT', 'آخر حروف'], ['UPPER', 'حروف كبيرة'], ['LOWER', 'حروف صغيرة'], ['TRIM', 'حذف المسافات']]]
];
const fxTemplates = () => [
  { t: fxTx('Date + N days', 'تاريخ + عدد أيام'), a: [['col', fxTx('Date', 'التاريخ'), 'date'], ['num', fxTx('Days', 'عدد الأيام'), 7]], f: v => `ADDDAYS(${v[0]},${v[1]})` },
  { t: fxTx('Date + N months', 'تاريخ + عدد شهور'), a: [['col', fxTx('Date', 'التاريخ'), 'date'], ['num', fxTx('Months', 'عدد الشهور'), 1]], f: v => `ADDMONTHS(${v[0]},${v[1]})` },
  { t: fxTx('Days between two dates', 'عدد الأيام بين تاريخين'), a: [['col', fxTx('End date', 'تاريخ النهاية'), 'date'], ['col', fxTx('Start date', 'تاريخ البداية'), 'date']], f: v => `DAYS(${v[0]},${v[1]})` },
  { t: fxTx('Years since a date', 'السنوات منذ تاريخ (عمر / خدمة)'), a: [['col', fxTx('Date', 'التاريخ'), 'date']], f: v => `YEARS(TODAY(),${v[0]})` },
  { t: fxTx('Difference of two numbers', 'الفرق بين رقمين'), a: [['col', fxTx('First number', 'الرقم الأول'), 'number'], ['col', fxTx('Minus', 'ناقص'), 'number']], f: v => `${v[0]}-${v[1]}` },
  { t: fxTx('Sum of two columns', 'جمع عمودين'), a: [['col', fxTx('First', 'الأول'), 'number'], ['col', fxTx('Second', 'الثاني'), 'number']], f: v => `SUM(${v[0]},${v[1]})` },
  { t: fxTx('Multiply two columns', 'ضرب عمودين'), a: [['col', fxTx('First', 'الأول'), 'number'], ['col', fxTx('Second', 'الثاني'), 'number']], f: v => `${v[0]}*${v[1]}` },
  { t: fxTx('Percentage (A of B)', 'نسبة مئوية (أ من ب)'), a: [['col', fxTx('Part', 'الجزء'), 'number'], ['col', fxTx('Total', 'الإجمالي'), 'number']], f: v => `ROUND(${v[0]}/${v[1]}*100,2)` }
];
function fxStyle() {
  if (document.getElementById('fx-css')) return;
  const s = document.createElement('style'); s.id = 'fx-css';
  s.textContent = `.fxbox{border:1.5px dashed var(--border);border-radius:14px;padding:10px;margin-top:10px}
.fxin{font-family:ui-monospace,Menlo,Consolas,monospace;direction:ltr;text-align:left}
.fxprev{font-size:11.5px;margin:6px 2px 8px;color:var(--ok)}.fxprev.bad{color:var(--err)}.fxprev.hint{color:var(--muted)}
.fxbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.fxb,.fxsel{height:38px;min-width:38px;padding:0 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font:inherit;font-weight:700;font-size:13px;cursor:pointer;transition:border-color .15s,transform .1s}
.fxsel{appearance:none;-webkit-appearance:none;text-align:center;text-align-last:center;max-width:180px}
.fxb:hover,.fxsel:hover{border-color:var(--accent)}.fxb:active{transform:scale(.94)}
.fxguide{margin-top:10px}.fxguide summary{cursor:pointer;font-size:12.5px;font-weight:600;list-style-position:inside}.fxguide[open] summary{margin-bottom:8px}`;
  document.head.appendChild(s);
}
function fxBoxHtml(r) {
  return `<div class="fxbox"><input class="inp fxin" data-p="calc" dir="ltr" placeholder="=D2-E2" value="${esc(r.calc || '')}" autocomplete="off" spellcheck="false">
      <div class="fxprev"></div>
      <div class="fxbar"><select class="fxsel" data-fx="col" data-ph="+ ${esc(fxTx('Insert column…', 'أدخل عمود…'))}"></select>${FX_OPS.map(([s, v]) => `<button type="button" class="fxb" data-fx="ins" data-t="${esc(v)}">${s}</button>`).join('')}
        <select class="fxsel" data-fx="fn"><option value="">+ ${esc(fxTx('Function…', 'دالة…'))}</option>${fxFuncs().map(([g, fs]) => `<optgroup label="${esc(g)}">${fs.map(([n, ar]) => `<option value="${n}">${n} — ${esc(S.lang === 'ar' ? ar : n)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <details class="fxguide"><summary>⚡ ${esc(fxTx('Quick assistant — no typing', 'مساعد سريع — من غير كتابة'))}</summary><div class="fxg"><select class="inp" data-fxt style="margin-bottom:8px">${fxTemplates().map((x, k) => `<option value="${k}">${esc(x.t)}</option>`).join('')}</select><div class="fxargs"></div><button type="button" class="btn primary" data-fx="use" style="width:100%">${ic('check')} ${esc(fxTx('Use this formula', 'استخدم المعادلة'))}</button></div></details></div>`;
}
function fxAfterDraw(o) { if (o._fx) { $$('select[data-ph]', o).forEach(o._fx.fill); o._fx.preview(); } }
function fxAttach(o, rows) {
  fxStyle();
  const lbl = x => String(x.label || '').trim();
  const sample = () => {
    const d = {}, today = new Date().toISOString().slice(0, 10);
    rows.forEach((r, i) => { if (!lbl(r) || r.type === 'calc') return; const op = String(r.options || '').split(',')[0].trim();
      d[lbl(r)] = r.type === 'number' ? 10 + i : r.type === 'date' ? today : r.type === 'datetime' ? today + 'T09:00' : r.type === 'checkbox' ? true : r.type === 'multiselect' ? [op || 'a'] : r.type === 'phone' ? '0100000000' : r.type === 'select' ? (op || 'a') : 'abc'; });
    const cols = rows.map(lbl);
    rows.forEach(r => { if (r.type === 'calc' && lbl(r)) d[lbl(r)] = calcVal(r.calc, d, cols); });
    return { d, cols };
  };
  const preview = () => {
    const { d, cols } = sample();
    $$('.fxprev', o).forEach(el => {
      const r = rows[+el.closest('[data-i]').dataset.i], f = String(r.calc || '').trim();
      if (!f) { el.className = 'fxprev hint'; el.textContent = fxTx('Type a formula, or use the buttons below', 'اكتب معادلة أو استخدم الأزرار بالأسفل'); return; }
      const v = calcVal(f, d, cols);
      el.className = 'fxprev' + (v === '' ? ' bad' : ''); el.textContent = v === '' ? '✗ ' + fxTx('Formula is not valid', 'المعادلة غير صحيحة') : `✓ ${fxTx('Example result', 'مثال للنتيجة')}: ${v}`;
    });
  };
  const colOpts = (i, ph) => (ph ? `<option value="">${esc(ph)}</option>` : '') + rows.map((x, j) => j !== i && lbl(x) ? `<option value="${colLetter(j)}2">${colLetter(j)} — ${esc(x.label)}</option>` : '').join('');
  const fill = sel => { const h = colOpts(+sel.closest('[data-i]').dataset.i, sel.dataset.ph); if (sel._h !== h) { sel.innerHTML = h; sel._h = h; } };
  o._fx = { fill, preview };
  const insert = (rowEl, text, back = 0) => {
    const inp = $('.fxin', rowEl); if (!inp) return;
    let v = inp.value, s = inp.selectionStart, e = inp.selectionEnd; if (s == null) s = e = v.length;
    if (!v.trim()) { v = '='; s = e = 1; } else if (!/^\s*=/.test(v)) { v = '=' + v; s++; e++; }
    inp.value = v.slice(0, s) + text + v.slice(e); const c = s + text.length - back;
    inp.focus(); inp.setSelectionRange(c, c); inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const kindOk = (x, k) => k === 'date' ? ['date', 'datetime'].includes(x.type) : k === 'number' ? ['number', 'calc'].includes(x.type) : true;
  const renderArgs = rowEl => {
    const i = +rowEl.dataset.i, tp = fxTemplates()[+$('[data-fxt]', rowEl).value || 0], used = new Set();
    const all = rows.map((x, j) => ({ x, j })).filter(({ x, j }) => j !== i && lbl(x));
    $('.fxargs', rowEl).innerHTML = tp.a.map(a => {
      if (a[0] === 'num') return `<div style="margin-bottom:8px"><label class="lab">${esc(a[1])}</label><input class="inp" type="number" value="${a[2]}" dir="ltr" data-arg></div>`;
      const pick = (all.find(({ x, j }) => kindOk(x, a[2]) && !used.has(j)) || all.find(({ j }) => !used.has(j)) || all[0] || {}).j; used.add(pick);
      return `<div style="margin-bottom:8px"><label class="lab">${esc(a[1])}</label><select class="inp" data-arg>${all.map(({ x, j }) => `<option value="${colLetter(j)}2" ${j === pick ? 'selected' : ''}>${colLetter(j)} — ${esc(x.label)}</option>`).join('')}</select></div>`;
    }).join('');
  };
  o.addEventListener('input', e => { if (e.target.dataset.p) setTimeout(preview, 0); });
  o.addEventListener('change', e => {
    const fx = e.target.dataset.fx, row = e.target.closest('[data-i]');
    if (fx === 'col' && e.target.value) { insert(row, e.target.value); e.target.selectedIndex = 0; }
    else if (fx === 'fn' && e.target.value) { insert(row, e.target.value === 'TODAY' ? 'TODAY()' : e.target.value + '()', e.target.value === 'TODAY' ? 0 : 1); e.target.selectedIndex = 0; }
    else if ('fxt' in e.target.dataset) renderArgs(row);
  });
  o.addEventListener('pointerdown', e => { if (e.target.matches && e.target.matches('select[data-ph]')) fill(e.target); }, true);
  o.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('select[data-ph]')) fill(e.target); });
  o.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('fxguide') && d.open) renderArgs(d.closest('[data-i]')); }, true);
  o.addEventListener('click', e => {
    const fx = e.target.closest('[data-fx]'); if (!fx || fx.tagName !== 'BUTTON') return;
    const row = fx.closest('[data-i]');
    if (fx.dataset.fx === 'ins') return insert(row, fx.dataset.t);
    if (fx.dataset.fx === 'use') {
      const tp = fxTemplates()[+$('[data-fxt]', row).value || 0], vals = $$('[data-arg]', row).map(x => x.value);
      if (vals.some(v => v === '')) return toast(fxTx('Add the other columns first', 'أضف الأعمدة الأخرى أولاً'), 'err');
      const inp = $('.fxin', row); inp.value = '=' + tp.f(vals); rows[+row.dataset.i].calc = inp.value; preview();
    }
  });
}

/* create a new page (tab) or edit an existing one — editing renames/changes fields in place, new fields are added, existing columns are never deleted (hide them instead) */
function openTabBuilder(tabName) {
  const ex = tabName ? (S._admTabs || []).find(x => x.name === tabName) : null;
  const newRow = () => ({ label: '', ar: '', type: 'text', req: false, readonly: false, hidden: false, options: '', calc: '', maxMB: '', maxFiles: '', min: '', max: '', showIf: '', reqIf: '', lookup: '' });
  const rows = ex ? ex.fields.map(f => ({ orig: f.key, label: f.label, ar: f.ar || '', type: f.type, req: !!f.req, readonly: !!f.readonly, hidden: !!f.hidden, options: f.lookup ? '' : (f.options || []).join(', '), calc: f.calc || '', maxMB: f.maxMB ?? '', maxFiles: f.maxFiles ?? '', min: f.min ?? '', max: f.max ?? '', showIf: f.showIf || '', reqIf: f.reqIf || '', lookup: f.lookup || '' })) : [newRow()];
  const TYPES = Object.keys(T_TYPES.en), grid = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px';
  const o = openSheet(`<div class="hd"><h3>${esc(ex ? t('editTab') : t('createTab'))}</h3><button class="btn icon ghost" data-b="x">${ic('x')}</button></div>
    <div style="${grid}"><div class="fld"><label class="lab">${esc(t('tabName'))}</label><input class="inp" id="b_name" value="${esc(ex ? ex.name : '')}" ${ex ? 'disabled' : ''}></div>${ex ? `<div class="fld"><label class="lab">${esc(t('displayName'))}</label><input class="inp" id="b_label" value="${esc(ex.label)}"></div>` : ''}<div class="fld"><label class="lab">${esc(t('labelAr'))}</label><input class="inp" id="b_ar" value="${esc(ex ? ex.ar : '')}"></div><div class="fld"><label class="lab">${esc(t('icon'))}</label><input class="inp" id="b_icon" value="${esc(ex ? ex.icon : '📄')}" style="text-align:center"></div></div>
    <label class="lab">${esc(t('fields'))}</label><div id="b_rows"></div><button class="btn" data-b="add" style="width:100%;margin:6px 0 14px">${ic('plus')} ${esc(t('addField'))}</button><button class="btn primary" data-b="save" style="width:100%">${ic('check')} ${esc(t('save'))}</button>`, { wide: true });
  const chip = (r, p, label) => `<label class="chip ${r[p] ? 'on' : ''}" style="flex:1;text-align:center;padding:8px 10px;font-size:13px"><input type="checkbox" hidden data-p="${p}" ${r[p] ? 'checked' : ''}>${esc(label)}</label>`;
  const draw = () => { $('#b_rows', o).innerHTML = rows.map((r, i) => `<div class="card" style="margin-bottom:8px;padding:10px" data-i="${i}"><div style="margin-bottom:8px"><span class="badge" title="${esc(fxTx('Column letter in the Sheet', 'حرف العمود في الشيت'))}">${colLetter(i)}</span></div><div style="${grid}"><input class="inp" data-p="label" placeholder="${esc(t('label'))}" value="${esc(r.label)}"><input class="inp" data-p="ar" placeholder="${esc(t('labelAr'))}" value="${esc(r.ar)}"><select class="inp" data-p="type">${TYPES.map(x => `<option value="${x}" ${r.type === x ? 'selected' : ''}>${esc(typeName(x))}</option>`).join('')}</select>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${chip(r, 'req', t('required'))}${chip(r, 'readonly', t('readonlyL'))}${chip(r, 'hidden', t('hiddenL'))}${r.orig ? '' : `<button class="btn icon danger" data-rm="${i}">${ic('trash')}</button>`}</div></div>
    ${['select', 'multiselect'].includes(r.type) && !r.lookup ? `<input class="inp" style="margin-top:8px" data-p="options" placeholder="${esc(t('options'))}" value="${esc(r.options)}">` : ''}${r.type === 'calc' ? fxBoxHtml(r) : ''}${r.type === 'file' ? `<div style="${grid};margin-top:8px"><input class="inp" type="number" data-p="maxMB" placeholder="max MB" value="${esc(r.maxMB)}"><input class="inp" type="number" data-p="maxFiles" placeholder="max files" value="${esc(r.maxFiles)}"></div>` : ''}${r.type === 'number' ? `<div style="${grid};margin-top:8px"><input class="inp" type="number" data-p="min" placeholder="min" value="${esc(r.min)}"><input class="inp" type="number" data-p="max" placeholder="max" value="${esc(r.max)}"></div>` : ''}
    <details style="margin-top:8px" ${r.showIf || r.reqIf || r.lookup ? 'open' : ''}><summary class="muted" style="cursor:pointer;font-size:12px">${esc(t('advanced'))}</summary><div style="${grid};margin-top:8px"><input class="inp" data-p="showIf" dir="ltr" placeholder="showIf: Status=Hired" value="${esc(r.showIf || '')}"><input class="inp" data-p="reqIf" dir="ltr" placeholder="reqIf: Status=Hired" value="${esc(r.reqIf || '')}"><input class="inp" data-p="lookup" dir="ltr" placeholder="lookup: Clients.Company" value="${esc(r.lookup || '')}"></div></details></div>`).join(''); fxAfterDraw(o); };
  fxAttach(o, rows);
  draw();
  o.addEventListener('input', e => { const p = e.target.dataset.p; if (!p) return; const i = +e.target.closest('[data-i]').dataset.i; rows[i][p] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
  o.addEventListener('change', e => { const p = e.target.dataset.p; if (['type', 'req', 'readonly', 'hidden'].includes(p)) draw(); });
  o.addEventListener('click', async e => {
    const b = e.target.closest('[data-b]'), rm = e.target.closest('[data-rm]');
    if (rm) { rows.splice(+rm.dataset.rm, 1); if (!rows.length) rows.push(newRow()); return draw(); }
    if (!b) return; if (b.dataset.b === 'x') return closeSheet(); if (b.dataset.b === 'add') { rows.push(newRow()); draw(); return; }
    b.disabled = true;
    const name = ex ? ex.name : $('#b_name', o).value.trim();
    try {
      await api(ex ? 'admin_updateTab' : 'admin_createTab', { name, label: ex ? ($('#b_label', o).value.trim() || name) : name, ar: $('#b_ar', o).value.trim(), icon: $('#b_icon', o).value.trim() || '📄', fields: rows.map(r => ({ ...r, calc: r.type === 'calc' ? String(r.calc || '').trim().replace(/^\s*=/, '') : '', options: r.options ? String(r.options).split(',').map(s => s.trim()).filter(Boolean) : [] })) });
      toast(t(ex ? 'tabUpdated' : 'tabCreated')); closeSheet(true); await refresh(); S.view = { ...S.view, kind: 'admin', admin: 'tabs' }; renderApp();
    } catch (er) { b.disabled = false; adminErr(er); }
  });
}

/* ----------------------------- personal dashboard (per-user, customizable) ----------------------------- */
const PALETTE = ['var(--accent)', 'var(--accent2)', 'var(--ok)', 'var(--warn)', 'var(--err)', '#f472b6', '#2dd4bf', '#fb923c'];
const WTYPES = { kpi: '🔢', bar: '📊', hbar: '📶', donut: '🍩', line: '📈', list: '🧾' };
const WT_KEYS = { kpi: 'wKpi', bar: 'wBar', hbar: 'wHbar', donut: 'wDonut', line: 'wLine', list: 'wList' };
const DEF_SIZE = { kpi: 's', bar: 'm', hbar: 'm', donut: 'm', line: 'm', list: 'm' };
const AGG_K = { count: 'aggCount', sum: 'aggSum', avg: 'aggAvg', min: 'aggMin', max: 'aggMax' };
const RANGE_K = { 7: 'r7', 30: 'r30', 90: 'r90', 365: 'r365' };
const GROUPED = ['bar', 'hbar', 'donut'];
const DASH = { cfg: null, u: null, edit: false };
const dashKey = () => 'hr_dash_' + (S.user?.username || '');
const loc = () => S.lang === 'ar' ? 'ar-EG' : undefined;
const fmtN = v => { const n = Math.round((Number(v) || 0) * 100) / 100; return n.toLocaleString(loc()); };

const numFields = sc => sc.fields.filter(f => f.type === 'number' || f.type === 'calc');
const groupFields = sc => sc.fields.filter(f => !f.hidden && !['file', 'longtext', 'calc', 'number'].includes(f.type));
const dateFields = sc => sc.fields.filter(f => f.type === 'date' || f.type === 'datetime');
const mkW = (type, tab, over) => ({ id: uid(), type, tab, title: '', agg: 'count', vKey: '', gKey: '', dKey: '', fKey: '', fVal: '', range: '0', gran: 'month', size: DEF_SIZE[type], color: 0, ...(over || {}) });

function defaultDash() {
  const ws = [], tabs = S.tabs;
  tabs.slice(0, 4).forEach((tb, i) => ws.push(mkW('kpi', tb.name, { color: i % PALETTE.length })));
  let k = 0;
  tabs.slice(0, 3).forEach(tb => {
    const g = groupFields(tb).find(f => f.type === 'select' && (f.options || []).length);
    if (g && k < 2) { ws.push(mkW(k ? 'bar' : 'donut', tb.name, { gKey: g.key })); k++; }
  });
  if (tabs[0]) { ws.push(mkW('line', tabs[0].name, { color: 1 })); ws.push(mkW('list', tabs[0].name)); }
  return { v: 1, updated: 0, widgets: ws };
}
function loadDashLocal() { try { const j = JSON.parse(localStorage.getItem(dashKey()) || 'null'); if (j && Array.isArray(j.widgets)) return j; } catch (e) {} return null; }
function ensureDash() {
  const u = S.user?.username; if (!u) return;
  if (!DASH.cfg || DASH.u !== u) { DASH.u = u; DASH.cfg = loadDashLocal() || defaultDash(); }
}
async function pushDash() {
  if (!S.token || !navigator.onLine || !DASH.cfg) return;
  try { await api('dash_save', { cfg: DASH.cfg }); localStorage.removeItem(dashKey() + '_d'); } catch (e) {}
}
function saveDash() {
  DASH.cfg.updated = Date.now();
  try { localStorage.setItem(dashKey(), JSON.stringify(DASH.cfg)); localStorage.setItem(dashKey() + '_d', '1'); } catch (e) {}
  pushDash();
}
async function pullDash() {
  if (!S.token || !navigator.onLine) return false;
  try {
    const r = await api('dash_get');
    if (localStorage.getItem(dashKey() + '_d')) { await pushDash(); return false; }
    if (r.cfg && Array.isArray(r.cfg.widgets) && (!DASH.cfg || (r.cfg.updated || 0) > (DASH.cfg.updated || 0))) {
      DASH.cfg = r.cfg; try { localStorage.setItem(dashKey(), JSON.stringify(r.cfg)); } catch (e) {} return true;
    }
  } catch (e) {}
  return false;
}

/* ---- data helpers ---- */
const dateMs = (r, k) => { if (!k) return r._updated || 0; const v = r[k]; if (!v) return 0; const d = new Date(String(v).length <= 10 ? v + 'T00:00' : v); return isNaN(d) ? 0 : d.getTime(); };
function wRows(w, sc) {
  let rows = [...dataOf(sc.name).values()];
  if (w.fKey && w.fVal !== undefined && w.fVal !== '') rows = rows.filter(r => { const v = r[w.fKey]; return Array.isArray(v) ? v.map(String).includes(String(w.fVal)) : String(v ?? '') === String(w.fVal); });
  const days = Number(w.range) || 0;
  if (days) { const lim = Date.now() - days * 86400000; rows = rows.filter(r => dateMs(r, w.dKey) >= lim); }
  return rows;
}
function aggRows(rows, agg, key) {
  if (agg === 'count' || !key) return rows.length;
  const xs = rows.filter(r => !isEmpty(r[key])).map(r => Number(r[key])).filter(x => isFinite(x));
  if (!xs.length) return 0;
  const sum = xs.reduce((a, b) => a + b, 0);
  return agg === 'sum' ? sum : agg === 'avg' ? sum / xs.length : agg === 'min' ? Math.min(...xs) : agg === 'max' ? Math.max(...xs) : rows.length;
}
function groupRows(w, sc, rows) {
  const f = sc.fields.find(x => x.key === w.gKey); if (!f) return [];
  const isD = f.type === 'date' || f.type === 'datetime', m = new Map();
  rows.forEach(r => {
    const v = r[f.key]; let keys;
    if (Array.isArray(v)) keys = v.length ? v.map(String) : [''];
    else if (f.type === 'checkbox') keys = [v ? '✓' : '—'];
    else if (isD) keys = [v ? String(v).slice(0, 7) : ''];
    else keys = [String(v ?? '').trim()];
    keys.forEach(k => { if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  });
  const out = [...m.entries()].map(([k, rs]) => ({ k, label: k === '' ? '—' : k, v: aggRows(rs, w.agg, w.vKey) }));
  out.sort(isD ? (a, b) => a.k.localeCompare(b.k) : (a, b) => b.v - a.v);
  return out;
}
function seriesRows(w, rows) {
  const day = w.gran === 'day', n = day ? 30 : 12, now = new Date(), bs = [];
  for (let i = n - 1; i >= 0; i--) bs.push({ d: day ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i) : new Date(now.getFullYear(), now.getMonth() - i, 1), rs: [] });
  rows.forEach(r => {
    const ms = dateMs(r, w.dKey); if (!ms) return; const d = new Date(ms);
    const b = bs.find(x => x.d.getFullYear() === d.getFullYear() && x.d.getMonth() === d.getMonth() && (!day || x.d.getDate() === d.getDate()));
    if (b) b.rs.push(r);
  });
  return bs.map(b => ({ label: b.d.toLocaleDateString(loc(), day ? { day: 'numeric', month: 'short' } : { month: 'short' }), v: aggRows(b.rs, w.agg, w.vKey) }));
}
function fixW(w) {
  if (!schemaOf(w.tab)) w.tab = S.tabs[0]?.name;
  const sc = schemaOf(w.tab); if (!sc) return;
  const nums = numFields(sc), grp = groupFields(sc), dts = dateFields(sc);
  if (!nums.length || w.type === 'list') { w.agg = 'count'; }
  if (w.agg !== 'count' && !nums.find(f => f.key === w.vKey)) w.vKey = nums[0]?.key || '';
  if (w.agg === 'count') w.vKey = '';
  if (GROUPED.includes(w.type) && !grp.find(f => f.key === w.gKey)) w.gKey = (grp.find(f => f.type === 'select') || grp[0])?.key || '';
  if (w.dKey && !dts.find(f => f.key === w.dKey)) w.dKey = '';
  if (w.fKey && !grp.find(f => f.key === w.fKey)) { w.fKey = ''; w.fVal = ''; }
  if (!w.fKey) w.fVal = '';
}
const fvLabel = (f, v) => f.type === 'checkbox' ? (String(v) === 'true' ? '✓' : '—') : String(v);
function wSub(w, sc) {
  const nf = sc.fields.find(f => f.key === w.vKey);
  let s = w.agg === 'count' || !nf ? t('records') : `${t(AGG_K[w.agg])} · ${fl(nf)}`;
  const ff = w.fKey && sc.fields.find(f => f.key === w.fKey);
  if (ff && w.fVal !== '') s += ` · ${fl(ff)}: ${fvLabel(ff, w.fVal)}`;
  if (Number(w.range) && RANGE_K[w.range]) s += ` · ${t(RANGE_K[w.range])}`;
  return s;
}
function autoTitle(w, sc) {
  if (!sc) return '';
  if (w.type === 'kpi') { const nf = sc.fields.find(f => f.key === w.vKey); return `${tl(sc)} · ${w.agg === 'count' || !nf ? t('records') : t(AGG_K[w.agg]) + ' ' + fl(nf)}`; }
  if (GROUPED.includes(w.type)) { const g = sc.fields.find(f => f.key === w.gKey); return `${tl(sc)} — ${g ? fl(g) : ''}`; }
  if (w.type === 'line') return `${tl(sc)} · ${t(w.gran === 'day' ? 'gDay' : 'gMonth')}`;
  return `${tl(sc)} · ${t('latest')}`;
}

/* ---- widget renderers ---- */
function renderW(w, sc) {
  const rows = wRows(w, sc), col = PALETTE[(Number(w.color) || 0) % PALETTE.length], ty = w.type;
  const nodata = `<div class="dsub" style="padding:18px 0;text-align:center">${esc(t('noWidgetData'))}</div>`;
  const wid = esc(w.id);
  if (ty === 'kpi') return `<div class="dclick" data-act="wdrill" data-w="${wid}"><div class="dbig" style="color:${col}">${esc(fmtN(aggRows(rows, w.agg, w.vKey)))}</div><div class="dsub">${esc(wSub(w, sc))}</div></div>`;
  if (ty === 'list') {
    const f0 = vf(sc)[0], sel = vf(sc).find(f => f.type === 'select');
    const items = rows.sort((a, b) => (b._updated || 0) - (a._updated || 0)).slice(0, w.size === 'l' ? 8 : 5);
    if (!items.length || !f0) return nodata;
    return `<div class="dlist">${items.map(r => `<div class="it" data-act="wopen" data-t="${esc(sc.name)}" data-id="${esc(r._id)}"><b>${esc(displayVal(f0, r[f0.key]) || '—')}</b>${sel && r[sel.key] ? `<span class="tag">${esc(r[sel.key])}</span>` : ''}<span class="dsub" style="flex:none">${esc(relTime(r._updated))}</span></div>`).join('')}</div>`;
  }
  if (ty === 'line') {
    const ser = seriesRows(w, rows); if (ser.every(s => !s.v)) return nodata;
    const max = Math.max(1, ...ser.map(s => s.v)), nn = ser.length, W = 300;
    const line = ser.map((s, i) => (i * W / (nn - 1)).toFixed(1) + ',' + (92 - Math.max(0, s.v) / max * 80).toFixed(1)).join(' ');
    const gid = 'lg' + String(w.id).replace(/\W/g, ''), sum = ser.reduce((a, s) => a + s.v, 0);
    return `<div class="linew"><svg viewBox="0 0 300 100" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col};stop-opacity:.35"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></linearGradient></defs><polygon points="0,100 ${line} ${W},100" fill="url(#${gid})"/><polyline points="${line}" fill="none" style="stroke:${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg><div class="ax"><span>${esc(ser[0].label)}</span><span>${esc(ser[Math.floor(nn / 2)].label)}</span><span>${esc(ser[nn - 1].label)}</span></div>${['count', 'sum'].includes(w.agg) ? `<div class="dsub" style="margin-top:4px">${esc(t('total'))}: <b style="color:var(--text)">${esc(fmtN(sum))}</b></div>` : `<div class="dsub" style="margin-top:4px">${esc(wSub(w, sc))}</div>`}</div>`;
  }
  const gf = sc.fields.find(f => f.key === w.gKey); if (!gf) return nodata;
  const isD = gf.type === 'date' || gf.type === 'datetime', lim = ty === 'bar' ? 12 : ty === 'hbar' ? 8 : 6;
  let d = groupRows(w, sc, rows); if (!d.length) return nodata;
  if (d.length > lim) {
    if (ty === 'donut' && ['count', 'sum'].includes(w.agg)) d = d.slice(0, lim - 1).concat([{ k: '', label: t('other'), v: d.slice(lim - 1).reduce((a, x) => a + x.v, 0) }]);
    else d = isD ? d.slice(-lim) : d.slice(0, lim);
  }
  const attr = x => `data-act="wdrill" data-w="${wid}" data-v="${esc(x.k)}" title="${esc(x.label)}: ${esc(fmtN(x.v))}"`;
  const solid = Number(w.color) ? `background:${col}` : '';
  if (ty === 'bar') {
    const max = Math.max(1, ...d.map(x => x.v));
    return `<div class="dcols">${d.map(x => `<div class="dcol" ${attr(x)}><em>${esc(fmtN(x.v))}</em><div class="bw"><i style="height:${Math.max(2, Math.max(0, x.v) / max * 100)}%;${solid}"></i></div><span>${esc(x.label)}</span></div>`).join('')}</div>`;
  }
  if (ty === 'hbar') {
    const max = Math.max(1, ...d.map(x => x.v));
    return d.map(x => `<div class="hb" ${attr(x)}><span>${esc(x.label)}</span><div class="tr"><i style="width:${Math.max(2, Math.max(0, x.v) / max * 100)}%;${solid}"></i></div><b>${esc(fmtN(x.v))}</b></div>`).join('');
  }
  const total = d.reduce((a, x) => a + Math.max(0, x.v), 0); if (!total) return nodata;
  const C = 2 * Math.PI * 38; let off = 0;
  const segs = d.map((x, i) => { const len = Math.max(0, x.v) / total * C, s = `<circle r="38" cx="50" cy="50" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" style="cursor:pointer" ${attr(x)}></circle>`; off += len; return s; }).join('');
  return `<div class="donutw"><svg viewBox="0 0 100 100"><circle r="38" cx="50" cy="50" fill="none" stroke="var(--surface2)" stroke-width="16"/>${segs}</svg><div class="leg">${d.map((x, i) => `<div ${attr(x)}><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${esc(x.label)}</span><b>${esc(fmtN(x.v))}</b></div>`).join('')}</div></div>`;
}
function widgetHtml(w, i, n) {
  const sc = schemaOf(w.tab);
  let body; try { body = sc ? renderW(w, sc) : `<div class="dsub">${esc(t('wUnavail'))}</div>`; } catch (e) { body = '<div class="dsub">—</div>'; }
  const id = esc(w.id);
  const tools = DASH.edit ? `<div class="dw-tools"><button class="btn icon ghost" data-act="wmove" data-w="${id}" data-d="-1" title="${esc(t('moveEarlier'))}" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="btn icon ghost" data-act="wmove" data-w="${id}" data-d="1" title="${esc(t('moveLater'))}" ${i === n - 1 ? 'disabled' : ''}>${ic('down')}</button><button class="btn icon ghost" data-act="wcfg" data-w="${id}" title="${esc(t('edit'))}">${ic('edit')}</button><button class="btn icon danger" data-act="wdel" data-w="${id}" title="${esc(t('del'))}">${ic('trash')}</button></div>` : '';
  return `<div class="dw glass ${DASH.edit ? 'edit' : ''}" data-s="${esc(w.size || 'm')}"><div class="dw-h"><span class="dw-t">${esc(w.title || autoTitle(w, sc))}</span>${tools}</div>${body}</div>`;
}
function renderDash() {
  const main = $('#main'); if (!main) return; ensureDash();
  const ws = DASH.cfg.widgets;
  main.innerHTML = `<div class="dhead"><div class="muted" style="font-size:13px;flex:1 1 200px;min-width:0">${esc(t('dashHint'))}</div><div class="acts">${DASH.edit ? `<button class="btn" data-act="wadd">${ic('plus')} ${esc(t('addWidget'))}</button><button class="btn icon danger" data-act="wreset" title="${esc(t('resetDash'))}">${ic('sync')}</button>` : ''}<button class="btn ${DASH.edit ? 'primary' : ''}" data-act="wedit">${ic(DASH.edit ? 'check' : 'sliders')} ${esc(DASH.edit ? t('doneEdit') : t('customize'))}</button></div></div>
  ${ws.length ? `<div class="dgrid">${ws.map((w, i) => widgetHtml(w, i, ws.length)).join('')}</div>` : `<div class="card" style="text-align:center;padding:40px"><div style="font-size:46px">📊</div><b>${esc(t('emptyDash'))}</b><div style="margin-top:14px"><button class="btn primary" data-act="wadd">${ic('plus')} ${esc(t('addWidget'))}</button></div></div>`}`;
}
const dashSoft = debounce(() => { if (S.view.kind === 'dash' && !$('#overlay') && !$('#dlg')) renderDash(); }, 150);

function drill(tab, key, val) {
  const sc = schemaOf(tab); if (!sc) return;
  S.view = { ...S.view, kind: 'tab', tab }; S.limit = CONFIG.PAGE; S.search = ''; S.filter[tab] = null; DASH.edit = false;
  if (key && val !== undefined && val !== '' && val !== '—') {
    const f = sc.fields.find(x => x.key === key), sel = vf(sc).find(x => x.type === 'select' && x.options?.length);
    if (sel && sel.key === key) S.filter[tab] = String(val);
    else if (f && ['text', 'select', 'phone', 'email', 'multiselect'].includes(f.type)) S.search = String(val);
  }
  renderApp();
}
function drillW(w, v) {
  if (GROUPED.includes(w.type)) drill(w.tab, w.gKey, v);
  else if (w.fKey) drill(w.tab, w.fKey, w.fVal);
  else drill(w.tab);
}
function dashMove(id, d) {
  const a = DASH.cfg.widgets, i = a.findIndex(x => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; saveDash(); renderDash();
}
async function dashDel(id) {
  if (!await confirmDlg(t('wDelConfirm'))) return;
  DASH.cfg.widgets = DASH.cfg.widgets.filter(x => x.id !== id); saveDash(); renderDash();
}

/* ---- widget editor ---- */
function openWidgetEditor(wid) {
  if (!S.tabs.length) { toast(t('noTabs'), 'warn'); return; }
  const ex = wid ? DASH.cfg.widgets.find(x => x.id === wid) : null;
  const w = ex ? clone(ex) : mkW('kpi', S.tabs[0].name);
  fixW(w);
  const o = openSheet(`<div class="hd"><h3>${ic('chart')} ${esc(ex ? t('editWidget') : t('addWidget'))}</h3><button class="btn icon ghost" data-e="x">${ic('x')}</button></div><div id="wed"></div>`, { wide: true });
  const box = $('#wed', o);
  const sel = (k, opts, val) => `<select class="inp" data-w="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const row = (label, inner) => `<div class="fld"><label class="lab">${esc(label)}</label>${inner}</div>`;
  const prev = () => { const p = $('#wprevb', box), sc = schemaOf(w.tab); if (p && sc) p.innerHTML = renderW(w, sc); };
  const draw = () => {
    fixW(w);
    const sc = schemaOf(w.tab), nums = numFields(sc), grp = groupFields(sc), dts = dateFields(sc), ty = w.type;
    const ff = w.fKey && sc.fields.find(f => f.key === w.fKey);
    const dOpts = [['', t('byUpdated')]].concat(dts.map(f => [f.key, fl(f)]));
    let fv = '';
    if (ff) {
      const opts = ff.type === 'checkbox' ? [['true', '✓'], ['false', '—']] : (ff.options || []).map(x => [x, x]);
      fv = opts.length ? sel('fVal', [['', t('all')]].concat(opts), w.fVal) : `<input class="inp" data-w="fVal" data-txt="1" value="${esc(w.fVal)}" placeholder="${esc(t('filterVal'))}">`;
    }
    const rangeOpts = [['0', t('rAll')]].concat(Object.keys(RANGE_K).map(k => [k, t(RANGE_K[k])]));
    const useColor = ['kpi', 'bar', 'hbar', 'line'].includes(ty);
    box.innerHTML = `<div class="typeg">${Object.keys(WTYPES).map(k => `<button type="button" data-type="${k}" class="${ty === k ? 'on' : ''}"><span>${WTYPES[k]}</span>${esc(t(WT_KEYS[k]))}</button>`).join('')}</div>
      ${row(t('wTitle'), `<input class="inp" data-w="title" data-txt="1" value="${esc(w.title)}" placeholder="${esc(autoTitle(w, sc))}">`)}
      ${row(t('source'), sel('tab', S.tabs.map(tb => [tb.name, tl(tb)]), w.tab))}
      ${GROUPED.includes(ty) ? row(t('groupBy'), sel('gKey', grp.map(f => [f.key, fl(f)]), w.gKey)) : ''}
      ${ty === 'line' ? row(t('dateBy'), sel('dKey', dOpts, w.dKey)) + row(t('gran'), sel('gran', [['month', t('gMonth')], ['day', t('gDay')]], w.gran)) : ''}
      ${ty !== 'list' ? row(t('aggregate'), sel('agg', nums.length ? Object.keys(AGG_K).map(k => [k, t(AGG_K[k])]) : [['count', t('aggCount')]], w.agg)) : ''}
      ${ty !== 'list' && w.agg !== 'count' ? row(t('valueField'), sel('vKey', nums.map(f => [f.key, fl(f)]), w.vKey)) : ''}
      <div class="g2">${row(t('filterBy'), sel('fKey', [['', t('none')]].concat(grp.map(f => [f.key, fl(f)])), w.fKey))}${ff ? row(t('filterVal'), fv) : ''}</div>
      ${ty !== 'line' ? `<div class="g2">${row(t('range'), sel('range', rangeOpts, w.range))}${Number(w.range) ? row(t('dateBy'), sel('dKey', dOpts, w.dKey)) : ''}</div>` : ''}
      ${row(t('size'), sel('size', [['s', t('sSmall')], ['m', t('sMed')], ['l', t('sLarge')]], w.size))}
      ${useColor ? row(t('color'), `<div style="display:flex;gap:8px;flex-wrap:wrap">${PALETTE.map((c, i) => `<button type="button" data-col="${i}" aria-label="color ${i + 1}" style="width:32px;height:32px;border-radius:50%;cursor:pointer;background:${c};border:3px solid ${Number(w.color) === i ? 'var(--text)' : 'transparent'}"></button>`).join('')}</div>`) : ''}
      <label class="lab">${esc(t('preview'))}</label><div class="wprev"><div class="dw-t" style="margin-bottom:8px">${esc(w.title || autoTitle(w, sc))}</div><div id="wprevb" style="pointer-events:none">${renderW(w, sc)}</div></div>
      <button class="btn primary" data-e="save" style="width:100%">${ic('check')} ${esc(t('save'))}</button>`;
  };
  draw();
  o.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.txt) { w[el.dataset.w] = el.value; prev(); } });
  o.addEventListener('change', e => {
    const el = e.target.closest('[data-w]'); if (!el || el.dataset.txt) return;
    const k = el.dataset.w; w[k] = el.value;
    if (k === 'tab') { w.vKey = w.gKey = w.dKey = w.fKey = w.fVal = ''; }
    if (k === 'fKey') w.fVal = '';
    draw();
  });
  o.addEventListener('click', e => {
    const ty = e.target.closest('[data-type]'); if (ty) { w.type = ty.dataset.type; if (!ex) w.size = DEF_SIZE[w.type]; draw(); return; }
    const c = e.target.closest('[data-col]'); if (c) { w.color = +c.dataset.col; draw(); return; }
    const b = e.target.closest('[data-e]'); if (!b) return;
    if (b.dataset.e === 'x') return closeSheet();
    fixW(w);
    if (GROUPED.includes(w.type) && !w.gKey) return toast(t('wNeedGroup'), 'err');
    w.title = String(w.title || '').trim();
    const arr = DASH.cfg.widgets, i = arr.findIndex(x => x.id === w.id);
    if (i >= 0) arr[i] = w; else arr.push(w);
    saveDash(); closeSheet(true); renderDash();
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
    case 'nav': DASH.edit = false; S.view = id === 'admin' ? { ...S.view, kind: 'admin' } : id === 'dash' ? { ...S.view, kind: 'dash' } : { ...S.view, kind: 'tab', tab: id.slice(4) }; S.search = ''; S.limit = CONFIG.PAGE; renderApp(); break;
    case 'add': { const sc = schemaOf(S.view.tab); if (!sc) break; if (innerWidth < 768) openChat(sc.name); else openNewFormWith(sc.name, blankDraft(sc), uid()); break; }
    case 'open': { const sg = $('#sugg'); if (sg) sg.style.display = 'none'; openRecord(id); break; }
    case 'more': S.limit += CONFIG.PAGE; renderList(); break;
    case 'layout': S.layout = (S.layout || (innerWidth >= 1024 ? 'table' : 'cards')) === 'table' ? 'cards' : 'table'; renderTabShell(); break;
    case 'alerts': S.view = { ...S.view, kind: 'admin', admin: 'overview' }; renderApp(); break;
    case 'adm': S.view.admin = id; renderMain(); break;
    case 'ack': try { await api('admin_ackAlert', { id }); admOverview(); } catch (er) { adminErr(er); } break;
    case 'unlock': try { await api('admin_userAction', { username: id, op: 'unlock' }); toast(t('unlock') + ' ✓'); admOverview(); } catch (er) { adminErr(er); } break;
    case 'user_new': openUserForm(null); break; case 'user_edit': openUserForm(id); break; case 'tab_new': openTabBuilder(); break; case 'tab_edit': openTabBuilder(id); break;
    case 'wedit': DASH.edit = !DASH.edit; renderDash(); break;
    case 'wadd': openWidgetEditor(null); break;
    case 'wcfg': openWidgetEditor(el.dataset.w); break;
    case 'wdel': dashDel(el.dataset.w); break;
    case 'wmove': dashMove(el.dataset.w, +el.dataset.d); break;
    case 'wreset': if (await confirmDlg(t('resetConfirm'), true, t('reset'))) { DASH.cfg = defaultDash(); saveDash(); renderDash(); } break;
    case 'wdrill': { const w = DASH.cfg.widgets.find(x => x.id === el.dataset.w); if (w && !DASH.edit) drillW(w, el.dataset.v); break; }
    case 'wopen': S.view = { ...S.view, kind: 'tab', tab: el.dataset.t }; S.search = ''; S.filter[el.dataset.t] = null; renderApp(); openRecord(id); break;
    case 'aq_apply': S.auditQ = { page: 0, filters: { user: $('#aq_user').value, tab: $('#aq_tab').value, action: $('#aq_action').value, text: $('#aq_text').value.trim(), from: $('#aq_from').value, to: $('#aq_to').value } }; admAudit(); break;
    case 'apage': S.auditQ.page = Math.max(0, S.auditQ.page + Number(id)); admAudit(); break;
  }
});
window.addEventListener('online', () => { S.online = true; renderStatus(); flush(); if (S.token) refresh().then(() => renderMain()).catch(() => {}); });
window.addEventListener('offline', () => { S.online = false; renderStatus(); });
window.addEventListener('resize', debounce(() => { if (!S.user || $('#overlay')) return; if (S.view.kind === 'tab' && !S.layout) renderList(); }, 200));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) { flush(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* ----------------------------- boot ----------------------------- */
function hideSplash() {
  const sp = document.getElementById('splash'); if (!sp || sp.dataset.h) return; sp.dataset.h = '1';
  try { window.__spDone && window.__spDone(); } catch (e) {}
  const wait = Math.max(0, 900 - (Date.now() - (window.__t0 || 0)));
  setTimeout(() => { sp.classList.add('hide'); setTimeout(() => sp.remove(), 1000); }, wait + 250);
}
async function boot() {
  S.lang = localStorage.getItem('hr_lang') || (navigator.language || '').startsWith('ar') ? (localStorage.getItem('hr_lang') || 'ar') : 'en';
  S.theme = localStorage.getItem('hr_theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); applyTheme(); applyLang();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await DB.open(); } catch (e) { $('#app').innerHTML = '<p style="padding:30px">IndexedDB unavailable in this browser mode.</p>'; return; }
  S.token = localStorage.getItem('hr_token');
  if (!S.token) return renderLogin();
  await loadLocal(); S.user = await meta.get('user'); S.tabs = (await meta.get('schema')) || []; await refreshPending();
  if (!S.user || !S.tabs.length && !navigator.onLine) { return S.user ? renderApp() : renderLogin(); }
  S.view.tab = S.tabs[0]?.name || null; renderApp(); startTimers(); hideSplash();
  if (navigator.onLine) { try { await refresh(); renderApp(); flush(); } catch (e) { if (e.code === 'network') setOnline(false); } }
}
boot().catch(e => console.error(e)).finally(hideSplash);
setTimeout(hideSplash, 8000);
window.addEventListener('error', () => setTimeout(hideSplash, 1500));

/* ----------------------------- logo + name branding, Excel download ----------------------------- */
(function () {
'use strict';
const tx = fxTx;

/* ============================== brand (logo + name) ============================== */
const BR_KEY = 'hr_brand';
const BR_DEF = { en: { n: I18N.en.appName, tg: I18N.en.tagline }, ar: { n: I18N.ar.appName, tg: I18N.ar.tagline } };
const brandRead = () => { try { return JSON.parse(localStorage.getItem(BR_KEY) || '{}') || {}; } catch (e) { return {}; } };
const brandLogoHtml = b => b.img ? `<img src="${esc(b.img)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">` : esc(b.logo || '\u{1F9ED}');
function paintLogos() {
  const b = brandRead(), sig = (b.img || b.logo || '') + '|';
  $$('.logo, #spLogo').forEach(el => { if (el._bsig !== sig) { el.innerHTML = brandLogoHtml(b); el._bsig = sig; } });
}
function applyBrand(b) {
  try { localStorage.setItem(BR_KEY, JSON.stringify(b || {})); } catch (e) {}
  ['en', 'ar'].forEach(l => { I18N[l].appName = (b.name && b.name[l]) || BR_DEF[l].n; I18N[l].tagline = (b.tag && b.tag[l]) || BR_DEF[l].tg; });
  document.title = (S.lang === 'ar' ? I18N.ar.appName : I18N.en.appName) + ' ERP'; paintLogos();
}
applyBrand(brandRead());
let brandFor = null;
async function brandFetch() {
  if (!S.token || brandFor === S.token) return; brandFor = S.token;
  try {
    const r = await api('brand_get'), b = r.brand || {}, old = JSON.stringify(brandRead());
    applyBrand(b); if (JSON.stringify(b) !== old && S.user) { try { renderApp(); } catch (e) {} }
  } catch (e) { /* backend without brand support yet: ignore */ }
}
function resizeImg(file, n) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onerror = () => rej(new Error('img')); im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), k = Math.min(n / im.width, n / im.height), w = im.width * k, h = im.height * k;
      x.drawImage(im, (n - w) / 2, (n - h) / 2, w, h); URL.revokeObjectURL(u); res(c.toDataURL('image/png'));
    }; im.src = u;
  });
}
function openBrandForm() {
  const b = brandRead(); let img = b.img || '';
  const o = openSheet(`<div class="hd"><h3>${esc(tx('Logo & name', 'الشعار واسم النظام'))}</h3><button class="btn icon ghost" data-br="x">${ic('x')}</button></div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="logo" id="br_prev" style="flex:none"></div><div style="flex:1"><label class="lab">${esc(tx('Logo (emoji or 1–3 letters)', 'الشعار (إيموجي أو 1–3 حروف)'))}</label><input class="inp" id="br_logo" maxlength="6" value="${esc(b.logo || '\u{1F9ED}')}" style="text-align:center"></div></div>
    <div style="display:flex;gap:8px;margin-bottom:14px"><label class="btn" style="flex:1;cursor:pointer">${ic('upload')} ${esc(tx('Upload image', 'رفع صورة'))}<input type="file" id="br_file" accept="image/*" hidden></label><button class="btn danger" id="br_rm" type="button">${ic('trash')}</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="fld"><label class="lab">${esc(tx('Name (English)', 'الاسم (إنجليزي)'))}</label><input class="inp" id="br_ne" dir="ltr" maxlength="40" value="${esc((b.name && b.name.en) || BR_DEF.en.n)}"></div><div class="fld"><label class="lab">${esc(tx('Name (Arabic)', 'الاسم (عربي)'))}</label><input class="inp" id="br_na" maxlength="40" value="${esc((b.name && b.name.ar) || BR_DEF.ar.n)}"></div>
    <div class="fld"><label class="lab">${esc(tx('Tagline (English)', 'الوصف (إنجليزي)'))}</label><input class="inp" id="br_te" dir="ltr" maxlength="80" value="${esc((b.tag && b.tag.en) || BR_DEF.en.tg)}"></div><div class="fld"><label class="lab">${esc(tx('Tagline (Arabic)', 'الوصف (عربي)'))}</label><input class="inp" id="br_ta" maxlength="80" value="${esc((b.tag && b.tag.ar) || BR_DEF.ar.tg)}"></div></div>
    <button class="btn primary" id="br_save" style="width:100%">${ic('check')} ${esc(t('save'))}</button>`);
  const prev = () => { const p = $('#br_prev', o); p.innerHTML = img ? brandLogoHtml({ img }) : esc($('#br_logo', o).value || '\u{1F9ED}'); };
  prev(); $('#br_logo', o).addEventListener('input', () => { img = ''; prev(); });
  $('#br_rm', o).onclick = () => { img = ''; prev(); };
  $('#br_file', o).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { let d = await resizeImg(f, 128); if (d.length > 40000) d = await resizeImg(f, 96); if (d.length > 40000) return toast(tx('Image too detailed, use a simpler one', 'الصورة كبيرة، استخدم صورة أبسط'), 'err'); img = d; prev(); } catch (er) { toast(tx('Could not read image', 'تعذّر قراءة الصورة'), 'err'); } };
  o.addEventListener('click', async e => {
    if (e.target.closest('[data-br="x"]')) return closeSheet();
    const sv = e.target.closest('#br_save'); if (!sv) return; sv.disabled = true;
    const v = id => $(id, o).value.trim(), nb = { logo: v('#br_logo') || '\u{1F9ED}', img, name: { en: v('#br_ne'), ar: v('#br_na') }, tag: { en: v('#br_te'), ar: v('#br_ta') } };
    try { const r = await api('admin_saveBrand', nb); applyBrand(r.brand || nb); toast(tx('Saved', 'تم الحفظ')); closeSheet(true); renderApp(); S.view = { kind: 'admin', tab: S.view.tab, admin: 'tabs' }; renderApp(); }
    catch (er) { sv.disabled = false; adminErr(er); }
  });
}

/* ============================== Excel export ============================== */
const xlDate = (y, m, d, hh, mm) => Date.UTC(+y, +m - 1, +d) / 864e5 + 25569 + ((+hh || 0) * 60 + (+mm || 0)) / 1440;
function xlCell(f, v) {
  if (isEmpty(v)) return null;
  const dm = typeof v === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
  if (f.type === 'date' || f.type === 'datetime' || (f.type === 'calc' && dm)) {
    if (dm) return { t: 'n', v: xlDate(dm[1], dm[2], dm[3], dm[4], dm[5]), z: dm[4] ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd' };
    return { t: 's', v: String(v) };
  }
  if (f.type === 'number' || f.type === 'calc') { const n = Number(v); return v === '' || isNaN(n) ? { t: 's', v: String(v) } : { t: 'n', v: n }; }
  if (f.type === 'checkbox') return { t: 's', v: v ? tx('Yes', 'نعم') : tx('No', 'لا') };
  if (f.type === 'multiselect') return { t: 's', v: (v || []).join(S.lang === 'ar' ? '، ' : ', ') };
  if (f.type === 'file') return { t: 's', v: (v || []).map(x => (x && x.name) || '').filter(Boolean).join(', ') };
  return { t: 's', v: String(v) };
}
function xlSheet(sc) {
  const fs = vf(sc), recs = [...dataOf(sc.name).values()].filter(r => !r._deleted).sort((a, b) => (a._updated || 0) - (b._updated || 0));
  const ws = {}, wch = fs.map(f => Math.max(8, String(fl(f)).length + 2));
  fs.forEach((f, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: fl(f) }; });
  recs.forEach((r, i) => fs.forEach((f, c) => { const cell = xlCell(f, r[f.key]); if (!cell) return; ws[XLSX.utils.encode_cell({ r: i + 1, c })] = cell; wch[c] = Math.min(45, Math.max(wch[c], String(cell.t === 'n' && cell.z ? 'yyyy-mm-dd hh:mm' : cell.v).length + 2)); }));
  const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(recs.length, 0), c: Math.max(fs.length - 1, 0) } });
  ws['!ref'] = ref; ws['!cols'] = wch.map(w => ({ wch: w })); ws['!autofilter'] = { ref };
  return { ws, n: recs.length };
}
function xlExport(list) {
  if (typeof XLSX === 'undefined') return toast(tx('Excel library not loaded (needs internet once)', 'مكتبة الإكسل لم تُحمَّل (تحتاج إنترنت مرة واحدة)'), 'err');
  try {
    const wb = XLSX.utils.book_new(), used = new Set(); let total = 0;
    list.forEach(sc => { const { ws, n } = xlSheet(sc); total += n; let nm = String(tl(sc)).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 28) || 'Sheet', k = nm, i = 2; while (used.has(k.toLowerCase())) k = nm + ' ' + i++; used.add(k.toLowerCase()); XLSX.utils.book_append_sheet(wb, ws, k); });
    wb.Workbook = { Views: [{ RTL: S.lang === 'ar' }] };
    const day = new Date().toISOString().slice(0, 10), base = list.length === 1 ? String(tl(list[0])).replace(/[\\\/:*?"<>|]/g, ' ').trim() : String(I18N[S.lang].appName);
    XLSX.writeFile(wb, `${base}_${day}.xlsx`);
    toast(tx(`Excel ready · ${total} rows`, `تم تجهيز ملف Excel · ${total} صف`));
  } catch (e) { toast(tx('Export failed', 'فشل التصدير'), 'err'); }
}
function openXlMenu() {
  const cur = schemaOf(S.view.tab); if (!cur) return;
  if (S.tabs.length < 2) return xlExport([cur]);
  const o = openSheet(`<div class="hd"><h3>${esc(tx('Download Excel', 'تحميل Excel'))}</h3><button class="btn icon ghost" data-xl2="x">${ic('x')}</button></div>
    <button class="btn primary" data-xl2="one" style="width:100%;margin-bottom:10px">${esc(tl(cur))}</button><button class="btn" data-xl2="all" style="width:100%">${esc(tx('All my pages (one sheet each)', 'كل صفحاتي (شيت لكل صفحة)'))}</button>`);
  o.addEventListener('click', e => { const b = e.target.closest('[data-xl2]'); if (!b) return; const k = b.dataset.xl2; closeSheet(); if (k === 'one') xlExport([cur]); else if (k === 'all') xlExport(S.tabs); });
}
function ensureXlButton() {
  if (!S.view || S.view.kind !== 'tab') return; const lay = $('#main [data-act="layout"]'); if (!lay || $('#main [data-xl]')) return;
  const b = document.createElement('button'); b.className = 'btn'; b.dataset.xl = '1'; b.style.cssText = 'padding:0 12px;white-space:nowrap'; b.title = tx('Download Excel', 'تحميل Excel'); b.textContent = '\u2B07 Excel'; lay.before(b);
}


window.__erpBrandCard = () => { const bb = brandRead(); return `<div class="card glass" style="margin-bottom:12px;display:flex;align-items:center;gap:12px"><div class="logo sm" style="flex:none">${brandLogoHtml(bb)}</div><div style="flex:1;min-width:0"><b>${esc(tx('Logo & name', 'الشعار واسم النظام'))}</b><div class="muted" style="font-size:12px">${esc(I18N[S.lang].appName)}</div></div><button class="btn" data-brand="1">${ic('edit')}</button></div>`; };

let pend = false;
const tick = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; paintLogos(); ensureXlButton(); brandFetch(); }); };
new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); tick();
document.addEventListener('click', e => {
  if (e.target.closest('[data-xl]')) { e.preventDefault(); openXlMenu(); }
  const br = e.target.closest('[data-brand]'); if (br) { e.preventDefault(); openBrandForm(); }
});
})();
