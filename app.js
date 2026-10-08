/* HR ERP SPA — set API to your GAS /exec URL */
const API = 'https://script.google.com/macros/s/AKfycbxAtDN_JRN3EywU0XUuSZNyWbFDGhpCvIwXSewOZmEjn4ZYKofPFhDear2KFMG0lVM/exec';
const L = {
  en: {user:'Username',pass:'Password',login:'Sign in',search:'Search…',save:'Save',cancel:'Cancel',del:'Delete',saved:'Saved',queued:'Offline — queued',synced:'Synced',off:'Offline',on:'Online',admin:'Admin',users:'Users',audit:'Audit',live:'Live',invalid:'Invalid credentials',locked:'Locked, retry in (s): ',drop:'Drop file or tap to upload',empty:'No records',out:'Sign out',filter:'Filter'},
  ar: {user:'اسم المستخدم',pass:'كلمة المرور',login:'دخول',search:'بحث…',save:'حفظ',cancel:'إلغاء',del:'حذف',saved:'تم الحفظ',queued:'بدون إنترنت — في الانتظار',synced:'تمت المزامنة',off:'غير متصل',on:'متصل',admin:'الإدارة',users:'المستخدمون',audit:'السجل',live:'المتصلون',invalid:'بيانات غير صحيحة',locked:'محظور، أعد المحاولة بعد (ث): ',drop:'اسحب الملف أو اضغط للرفع',empty:'لا توجد سجلات',out:'خروج',filter:'تصفية'}
};
const S = {lang: localStorage.lang || 'ar', dark: localStorage.dark !== '0', tok: localStorage.tok, role: localStorage.role, tabs: [], tab: null, rows: [], q: ''};
const t = k => L[S.lang][k] || k, $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const html = (el, h) => (el.innerHTML = h, el);

/* ---------- theme / lang ---------- */
function applyLook() {
  document.documentElement.classList.toggle('dark', S.dark);
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  localStorage.lang = S.lang; localStorage.dark = S.dark ? 1 : 0;
}
function toast(m, err) {
  const d = document.createElement('div');
  d.className = 'pop pointer-events-auto card px-4 py-2 shadow-xl text-sm ' + (err ? 'border-red-500' : 'border-emerald-500');
  d.textContent = m; $('#toasts').append(d); setTimeout(() => d.remove(), 2800);
}

/* ---------- IndexedDB (cache + queue) ---------- */
const db = new Promise(res => {
  const r = indexedDB.open('erp', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('q', {autoIncrement: true}); };
  r.onsuccess = () => res(r.result);
});
const tx = async (st, mode, fn) => { const d = await db; return new Promise(res => { const q = fn(d.transaction(st, mode).objectStore(st)); q.onsuccess = () => res(q.result); }); };
const kv = {get: k => tx('kv', 'readonly', s => s.get(k)), set: (k, v) => tx('kv', 'readwrite', s => s.put(v, k))};
const queue = {add: o => tx('q', 'readwrite', s => s.add(o)), all: () => tx('q', 'readonly', s => s.getAll()), clear: () => tx('q', 'readwrite', s => s.clear())};

/* ---------- API ---------- */
async function api(action, data = {}) { // text/plain avoids CORS preflight on GAS
  const r = await fetch(API, {method: 'POST', body: JSON.stringify({action, token: S.tok, ...data})});
  const j = await r.json();
  if (j.error === 'session') return logout();
  return j;
}
function logout() { localStorage.removeItem('tok'); S.tok = null; renderLogin(); }
async function syncQueue() {
  const ops = await queue.all(); if (!ops.length || !navigator.onLine) return;
  const j = await api('sync', {ops}).catch(() => null);
  if (j?.ok) { await queue.clear(); toast(t('synced')); loadRows(); }
}
function status() {
  const d = $('#net'); if (!d) return;
  d.className = 'w-2.5 h-2.5 rounded-full ' + (navigator.onLine ? 'bg-emerald-400' : 'bg-red-500 animate-pulse');
  d.title = navigator.onLine ? t('on') : t('off');
}
addEventListener('online', () => { status(); syncQueue(); }); addEventListener('offline', status);
setInterval(() => S.tok && navigator.onLine && api('ping'), 45000); // heartbeat

/* ---------- login ---------- */
function renderLogin() {
  html(app, `<form id="lf" class="card m-4 mt-24 p-6 space-y-3 pop">
    <h1 class="text-2xl font-bold">HR ERP</h1>
    <input class="inp" id="u" placeholder="${t('user')}" autocomplete="username">
    <input class="inp" id="p" type="password" placeholder="${t('pass')}" autocomplete="current-password">
    <button class="btn w-full">${t('login')}</button>
    <div class="flex gap-3 text-sm text-[var(--mu)]"><a href="#" id="lg">${S.lang === 'ar' ? 'English' : 'عربي'}</a><a href="#" id="th">◐</a></div></form>`);
  $('#lg').onclick = e => (e.preventDefault(), S.lang = S.lang === 'ar' ? 'en' : 'ar', applyLook(), renderLogin());
  $('#th').onclick = e => (e.preventDefault(), S.dark = !S.dark, applyLook());
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const j = await api('login', {user: $('#u').value.trim(), pass: $('#p').value}).catch(() => ({error: 'net'}));
    if (j.ok) { Object.assign(S, {tok: j.token, role: j.role}); localStorage.tok = j.token; localStorage.role = j.role; boot(); }
    else toast(j.error === 'locked' ? t('locked') + j.wait : j.error === 'net' ? t('off') : t('invalid'), true);
  };
}

/* ---------- shell ---------- */
async function boot() {
  let sc = await api('schema').catch(() => null);
  if (sc?.ok) kv.set('schema', sc.tabs); else sc = {tabs: await kv.get('schema') || []}; // offline cache
  S.tabs = sc.tabs; S.tab = S.tabs[0]; renderShell(); loadRows(); syncQueue();
}
function renderShell() {
  html(app, `<header class="sticky top-0 z-30 glass px-4 py-3 flex items-center gap-3 text-white" style="background:#0f172acc">
      <b class="flex-1">HR ERP</b><span id="net"></span>
      <button id="lg">🌐</button><button id="th">◐</button>
      ${S.role === 'admin' ? `<button id="ad">⚙️</button>` : ''}<button id="lo">⎋</button></header>
    <div class="px-4 pt-3 sticky top-[52px] z-20" style="background:var(--bg)">
      <input id="q" class="inp" placeholder="${t('search')}" value="${esc(S.q)}">
      <div class="flex gap-2 overflow-x-auto py-3" id="chips">${S.tabs.map((x, i) => `<button class="chip ${x === S.tab ? 'on' : ''}" data-i="${i}">${x.icon} ${esc(x.title)}</button>`).join('')}</div></div>
    <main id="feed" class="px-4 pb-28 space-y-3"></main>
    <button id="fab" class="fixed bottom-6 end-6 w-14 h-14 rounded-full btn text-2xl shadow-2xl z-30">＋</button>`);
  status();
  $('#chips').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { S.tab = S.tabs[b.dataset.i]; S.q = ''; renderShell(); loadRows(); } };
  $('#q').oninput = e => { S.q = e.target.value; renderFeed(); }; // instant typeahead
  $('#lg').onclick = () => (S.lang = S.lang === 'ar' ? 'en' : 'ar', applyLook(), renderShell(), renderFeed());
  $('#th').onclick = () => (S.dark = !S.dark, applyLook());
  $('#lo').onclick = logout; $('#fab').onclick = () => S.tab ? openForm({}) : toast('Add a row in _Registry first', true);
  if ($('#ad')) $('#ad').onclick = openAdmin;
}
async function loadRows() {
  if (!S.tab) return;
  const key = 'rows_' + S.tab.tab;
  S.rows = await kv.get(key) || []; renderFeed(); // cache first
  if (!navigator.onLine) return;
  const j = await api('list', {tab: S.tab.tab}).catch(() => null);
  if (j?.ok) { S.rows = j.rows; kv.set(key, j.rows); renderFeed(); }
}
function renderFeed() {
  const f = S.tab?.fields || [], q = S.q.toLowerCase(), id = f[0]?.key;
  const rows = S.rows.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
  html($('#feed'), rows.length ? rows.map(r => `<div class="card p-4 pop relative overflow-hidden" data-id="${esc(r[id])}">
    <div class="font-semibold mb-1">${esc(r[f[1]?.key] ?? r[id])}</div>
    ${f.slice(2).map(x => `<div class="text-sm flex justify-between gap-3"><span class="text-[var(--mu)]">${esc(x.label)}</span>${x.type === 'file' && r[x.key] ? `<a class="underline" target="_blank" href="${esc(r[x.key])}">📎</a>` : `<span>${esc(r[x.key])}</span>`}</div>`).join('')}</div>`).join('')
    : `<p class="text-center text-[var(--mu)] mt-16">${t('empty')}</p>`);
  document.querySelectorAll('#feed .card').forEach(c => { // tap = edit, swipe = delete
    let x0 = 0, dx = 0;
    c.ontouchstart = e => (x0 = e.touches[0].clientX, dx = 0);
    c.ontouchmove = e => { dx = e.touches[0].clientX - x0; c.style.transform = `translateX(${dx}px)`; };
    c.ontouchend = () => { c.style.transform = ''; if (Math.abs(dx) > 110 && confirm(t('del') + '?')) remove(c.dataset.id); };
    c.onclick = () => !dx && openForm(S.rows.find(r => String(r[id]) === c.dataset.id));
  });
}

/* ---------- bottom sheet form ---------- */
function sheet(inner) {
  const w = document.createElement('div');
  w.className = 'fixed inset-0 z-50 glass flex items-end justify-center';
  w.innerHTML = `<div class="sheet card w-full max-w-xl max-h-[88vh] overflow-y-auto p-5 rounded-b-none translate-y-full">${inner}</div>`;
  document.body.append(w);
  const s = w.firstChild; requestAnimationFrame(() => s.classList.remove('translate-y-full'));
  w.close = () => { s.classList.add('translate-y-full'); setTimeout(() => w.remove(), 300); };
  w.onclick = e => e.target === w && w.close(); return w;
}
function openForm(rec) {
  const f = S.tab.fields, w = sheet(`<form class="space-y-3">${f.map((x, i) => i === 0 && !rec[x.key] ? '' : `<label class="block text-sm"><span class="text-[var(--mu)]">${esc(x.label)}</span>${
    x.type === 'select' ? `<select class="inp" name="${esc(x.key)}">${x.opts.map(o => `<option ${rec[x.key] == o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` :
    x.type === 'file' ? `<div class="drop inp text-center cursor-pointer" data-k="${esc(x.key)}">${rec[x.key] ? '📎 ✓' : t('drop')}<div class="h-1 mt-2 rounded bg-[var(--ac)] w-0 transition-all"></div><input type="hidden" name="${esc(x.key)}" value="${esc(rec[x.key])}"></div>` :
    `<input class="inp" name="${esc(x.key)}" type="${['number', 'date'].includes(x.type) ? x.type : 'text'}" value="${esc(rec[x.key])}" ${i === 0 ? 'readonly' : ''}>`}</label>`).join('')}
    <div class="flex gap-2 pt-2"><button class="btn flex-1">${t('save')}</button><button type="button" class="chip" id="cx">${t('cancel')}</button></div></form>`);
  w.querySelectorAll('.drop').forEach(setupDrop); $('#cx').onclick = w.close;
  w.querySelector('form').onsubmit = async e => {
    e.preventDefault(); const r = {...rec}; new FormData(e.target).forEach((v, k) => r[k] = v);
    w.close(); await save(r);
  };
}
function setupDrop(z) { // drag&drop + tap upload with live progress
  const inp = Object.assign(document.createElement('input'), {type: 'file'}), bar = z.querySelector('div');
  const up = file => {
    if (!navigator.onLine) return toast(t('off'), true);
    const rd = new FileReader();
    rd.onload = () => {
      const x = new XMLHttpRequest(); x.open('POST', API);
      x.upload.onprogress = e => bar.style.width = (e.loaded / e.total * 100) + '%';
      x.onload = () => { const j = JSON.parse(x.responseText); if (j.ok) { z.querySelector('input').value = j.url; z.firstChild.textContent = '📎 ✓'; toast(t('saved')); } else toast(j.error, true); };
      x.send(JSON.stringify({action: 'upload', token: S.tok, tab: S.tab.tab, name: file.name, mime: file.type || 'application/octet-stream', b64: rd.result.split(',')[1]}));
    };
    rd.readAsDataURL(file);
  };
  inp.onchange = () => inp.files[0] && up(inp.files[0]); z.onclick = () => inp.click();
  z.ondragover = e => (e.preventDefault(), z.style.borderColor = 'var(--ac)');
  z.ondragleave = () => z.style.borderColor = '';
  z.ondrop = e => { e.preventDefault(); e.dataTransfer.files[0] && up(e.dataTransfer.files[0]); };
}

/* ---------- save / delete (offline-aware) ---------- */
async function mutate(op) {
  const idK = S.tab.fields[0].key, key = 'rows_' + S.tab.tab;
  if (op.op === 'delete') S.rows = S.rows.filter(r => String(r[idK]) !== String(op.id));
  else { op.rec[idK] = op.rec[idK] || 'L' + Date.now().toString(36); const i = S.rows.findIndex(r => r[idK] === op.rec[idK]); i < 0 ? S.rows.unshift(op.rec) : S.rows[i] = op.rec; }
  kv.set(key, S.rows); renderFeed(); // optimistic
  if (navigator.onLine) { const j = await api('sync', {ops: [op]}).catch(() => null); if (j?.ok) return toast(t('saved')); }
  await queue.add(op); toast(t('queued'));
}
const save = rec => mutate({op: 'upsert', tab: S.tab.tab, rec});
const remove = id => mutate({op: 'delete', tab: S.tab.tab, id});

/* ---------- admin dashboard ---------- */
function openAdmin() {
  const w = sheet(`<div class="flex gap-2 mb-3" id="at"><button class="chip on" data-v="live">${t('live')}</button><button class="chip" data-v="users">${t('users')}</button><button class="chip" data-v="audit">${t('audit')}</button></div><div id="av"></div>`);
  const view = async v => {
    w.querySelectorAll('#at .chip').forEach(c => c.classList.toggle('on', c.dataset.v === v));
    const el = w.querySelector('#av');
    if (v === 'live') {
      const j = await api('online'); html(el, j.users.map(u => `<div class="flex justify-between py-2 border-b border-[var(--bd)]"><span>${u.online ? '🟢' : '⚪'} ${esc(u.user)}</span><span class="text-xs text-[var(--mu)]">${u.lastSeen ? new Date(+u.lastSeen).toLocaleString() : '-'}</span></div>`).join(''));
    } else if (v === 'users') {
      const j = await api('users');
      html(el, j.users.map(u => `<div class="py-2 border-b border-[var(--bd)] cursor-pointer" data-u='${esc(JSON.stringify(u))}'>${esc(u.user)} · ${esc(u.role)} · <span class="text-xs">${esc(u.tabs)}</span></div>`).join('') + `<button class="btn w-full mt-3" id="nu">＋</button>`);
      el.onclick = e => { const d = e.target.closest('[data-u]'); d && userForm(JSON.parse(d.dataset.u)); };
      $('#nu').onclick = () => userForm({});
    } else {
      html(el, `<div class="grid grid-cols-2 gap-2 mb-3"><input class="inp" id="fu" placeholder="user"><input class="inp" id="ft" placeholder="tab"><input class="inp" id="ff" type="date"><input class="inp" id="fq" placeholder="${t('filter')}"></div><button class="btn w-full mb-3" id="fg">${t('filter')}</button><div id="ar" class="text-xs space-y-1"></div>`);
      const go = async () => {
        const j = await api('audit', {user: $('#fu').value, tab: $('#ft').value, from: $('#ff').value, q: $('#fq').value});
        html($('#ar'), j.rows.map(r => `<div class="card p-2"><b>${esc(r.action)}</b> · ${esc(r.user)} · ${esc(r.tab)} <span class="text-[var(--mu)]">${esc(r.ts)}</span><div>${esc(r.detail)}</div></div>`).join(''));
      };
      $('#fg').onclick = go; go();
    }
  };
  $('#at').onclick = e => e.target.dataset.v && view(e.target.dataset.v); view('live');
  w.live = setInterval(() => w.isConnected && w.querySelector('.chip.on')?.dataset.v === 'live' && view('live'), 15000);
}
function userForm(u) { // tabs: "*" or comma list of tab names
  const w = sheet(`<form class="space-y-3">${['user', 'pass', 'role', 'tabs'].map(k => `<input class="inp" name="${k}" placeholder="${k}${k === 'tabs' ? ' (* | tab1,tab2)' : k === 'role' ? ' (admin|user)' : ''}" value="${k === 'pass' ? '' : esc(u[k])}" ${k === 'user' && u.user ? 'readonly' : ''}>`).join('')}
    <label class="flex gap-2"><input type="checkbox" name="active" ${u.active !== false ? 'checked' : ''}> active</label><button class="btn w-full">${t('save')}</button></form>`);
  w.querySelector('form').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), rec = Object.fromEntries(f); rec.active = f.has('active');
    if (!rec.pass) delete rec.pass; const j = await api('saveUser', {rec}); j.ok ? (toast(t('saved')), w.close()) : toast(j.error, true);
  };
}

/* ---------- init ---------- */
applyLook();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); // optional
S.tok ? boot() : renderLogin();
