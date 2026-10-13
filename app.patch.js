'use strict';
/* =============================================================================
   app.patch.js — append-only feature layer for the HR Ops ERP SPA.
   Load AFTER app.js. Nothing in app.js / Code.gs / index.html CSS is rewritten.
   1) Smart Excel import + dedup (Merge / Skip / Overwrite)
   2) Global command palette (Ctrl/Cmd+K)
   3) Client details + ERP Code binding / mirror sync
   4) Haptics, pull-to-refresh, rich chart tooltips
   5) Deterministic color avatars + TopBar profile menu
   ============================================================================= */
/* Backend endpoint (overrides CONFIG.API_URL from app.js) */
CONFIG.API_URL = 'https://script.google.com/macros/s/AKfycbyShXLeeVnCCEk9hBzLyDD9o6JioW9xlOTin_nLexf-uZNhWdaWIvoT9s7j_c9j0HOAhA/exec';
(function () {
const X = (en, ar) => S.lang === 'ar' ? ar : en;
const E = esc;
const ad = s => String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const norm = s => String(s ?? '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const stem = s => norm(s).replace(/^ال/, '').replace(/(ون|ين|ات|es|s)$/, '');
const live = () => !!(S.user && S.token);

/* ------------------------------------------------------------------ CSS */
const st = document.createElement('style'); st.id = 'patchcss';
st.textContent = `
.uav{display:inline-flex;align-items:center;justify-content:center;border-radius:30%;color:#fff;font-weight:800;flex:none}
#umbtn{padding:3px!important;border-radius:14px}
#umenu{position:fixed;z-index:90;min-width:230px;border-radius:18px;padding:8px;box-shadow:var(--shadow);background:var(--bg2);animation:rise .18s both}
#umenu .um-h{display:flex;align-items:center;gap:10px;padding:8px 8px 12px;border-bottom:1px solid var(--border);margin-bottom:6px}
#umenu button{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:12px;background:none;cursor:pointer;font-weight:600;text-align:start}
#umenu button:hover{background:var(--surface2)}#umenu button.d{color:var(--err)}
#cmdk{position:fixed;inset:0;z-index:90;background:rgba(2,6,23,.55);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;padding:10vh 12px 0;opacity:0;transition:opacity .15s}
#cmdk.open{opacity:1}
.cmk{width:100%;max-width:640px;border-radius:20px;overflow:hidden;background:var(--bg2);box-shadow:var(--shadow),var(--glow);display:flex;flex-direction:column;max-height:70dvh}
.cmk-in{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
.cmk-in input{flex:1;min-width:0;background:none;border:0;outline:none;font-size:16px}
.cmk-in kbd,.cmk-f span{font-size:11px;color:var(--muted)}
.cmk-in kbd{border:1px solid var(--border);border-radius:6px;padding:1px 6px}
.cmk-l{overflow:auto;padding:6px}
.cmk-g{padding:8px 10px 4px;font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.04em}
.cmk-it{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:12px;background:none;cursor:pointer;text-align:start;min-width:0}
.cmk-it.on{background:rgba(56,189,248,.14);box-shadow:inset 0 0 0 1px rgba(56,189,248,.35)}
.cmk-it .em{width:30px;height:30px;border-radius:10px;background:var(--surface2);display:flex;align-items:center;justify-content:center;flex:none}
.cmk-it b,.cmk-it small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmk-it small{color:var(--muted);font-size:12px}.cmk-it>div{min-width:0;flex:1}
.cmk-f{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--border)}
.cmk-none{padding:26px;text-align:center;color:var(--muted)}
#ptr{position:fixed;z-index:70;left:50%;top:calc(58px + env(safe-area-inset-top));width:40px;height:40px;margin-left:-20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--border);box-shadow:var(--shadow);color:var(--accent);opacity:0;transform:translateY(-60px);pointer-events:none}
#ptr.go{opacity:1}
#ptr.busy .ic{animation:spin .8s linear infinite}
#ctip{position:fixed;z-index:120;pointer-events:none;padding:9px 12px;border-radius:14px;box-shadow:var(--shadow);background:var(--bg2);min-width:120px;max-width:240px;font-size:12px;opacity:0;transition:opacity .12s}
#ctip.on{opacity:1}
#ctip .tl{display:flex;align-items:center;gap:7px;font-weight:700}
#ctip .tl i{width:9px;height:9px;border-radius:3px;flex:none}
#ctip .tv{font-size:20px;font-weight:800;margin:2px 0;font-variant-numeric:tabular-nums}
#ctip small{color:var(--muted)}
.cd-sec{margin-top:16px}.cd-sec h4{margin:0 0 6px;font-size:14px;display:flex;justify-content:space-between;gap:8px}
`;
document.head.appendChild(st);

/* ====================================================================
   5) AVATARS + TOPBAR PROFILE MENU
   Color is hashed from the lowercase USERNAME, so the same person gets
   the same color in the TopBar, user lists and audit trail.
   ==================================================================== */
const avHue = key => { let h = 0; for (const ch of norm(key) || '?') h = (h * 31 + ch.codePointAt(0)) >>> 0; return h % 360; };
const avGrad = key => { const h = avHue(key); return `linear-gradient(135deg,hsl(${h} 72% 48%),hsl(${(h + 38) % 360} 70% 42%))`; };
window.UserAvatar = (u, size = 36) => {
  const name = typeof u === 'string' ? u : (u.name || u.username), key = typeof u === 'string' ? u : (u.username || u.name);
  const ch = (String(name || '?').trim()[0] || '?').toUpperCase();
  return `<span class="uav" data-ac="1" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px;background:${avGrad(key)}">${E(ch)}</span>`;
};
function setAv(el, key) { el.dataset.ac = '1'; el.style.background = avGrad(key); }
function paintAvatars() {
  $$('.av:not([data-ac])').forEach(el => {
    const row = el.closest('.urow'), mu = row && $('.muted', row), m = mu && /@([^\s·]+)/.exec(mu.textContent || '');
    setAv(el, m ? m[1] : (row && $('b', row) ? $('b', row).textContent : el.textContent));
  });
  $$('.aud-av:not([data-ac])').forEach(el => { const b = el.nextElementSibling; setAv(el, b ? b.textContent : el.textContent); });
}
function injectTopbar() {
  const tb = $('.topbar'); if (!tb || !live() || $('#umbtn', tb)) return;
  const s = document.createElement('button'); s.className = 'btn icon ghost'; s.dataset.cmdk = '1'; s.title = 'Ctrl+K'; s.innerHTML = ic('search');
  const a = document.createElement('button'); a.id = 'umbtn'; a.className = 'btn icon ghost'; a.dataset.um = 'toggle'; a.innerHTML = window.UserAvatar(S.user, 34);
  tb.appendChild(s); tb.appendChild(a);
}
function closeUM() { const m = $('#umenu'); if (m) m.remove(); }
function toggleUM() {
  if ($('#umenu')) return closeUM();
  const b = $('#umbtn'); if (!b) return; const r = b.getBoundingClientRect(), rtl = document.dir === 'rtl';
  const m = document.createElement('div'); m.id = 'umenu'; m.className = 'glass';
  m.style.top = (r.bottom + 6) + 'px'; m.style[rtl ? 'left' : 'right'] = Math.max(8, rtl ? r.left : innerWidth - r.right) + 'px';
  m.innerHTML = `<div class="um-h">${window.UserAvatar(S.user, 42)}<div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">${E(S.user.name || S.user.username)}</b><span class="muted" style="font-size:12px">@${E(S.user.username)} · ${E(S.user.role)}</span></div></div>
    <button data-um="profile">${ic('shield')} ${E(X('Profile settings', 'إعدادات الملف الشخصي'))}</button>
    <button data-um="lang">${ic('globe')} ${E(X('Language: العربية', 'اللغة: English'))}</button>
    <button data-um="logout" class="d">${ic('logout')} ${E(t('logout'))}</button>`;
  document.body.appendChild(m);
}
function openProfile() {
  const u = S.user, o = openSheet(`<div class="hd"><h3>${E(X('Profile settings', 'إعدادات الملف الشخصي'))}</h3><button class="btn icon ghost" data-pf="x">${ic('x')}</button></div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">${window.UserAvatar(u, 64)}<div><b style="font-size:18px">${E(u.name || u.username)}</b><div class="muted">@${E(u.username)} · <span class="badge">${E(u.role)}</span></div></div></div>
    <div class="fld"><label class="lab">${E(t('language'))}</label><div class="chips"><button class="chip ${S.lang === 'en' ? 'on' : ''}" data-pf="en">English</button><button class="chip ${S.lang === 'ar' ? 'on' : ''}" data-pf="ar">العربية</button></div></div>
    <div class="fld"><label class="lab">${E(t('theme'))}</label><div class="chips"><button class="chip ${S.theme === 'dark' ? 'on' : ''}" data-pf="dark">🌙 Dark</button><button class="chip ${S.theme === 'light' ? 'on' : ''}" data-pf="light">☀️ Light</button></div></div>
    ${u.role === 'admin' ? `<button class="btn" data-aud="user" data-id="${E(u.username)}" style="width:100%">${ic('edit')} ${E(X('Edit my account (Users page)', 'تعديل حسابي (صفحة المستخدمين)'))}</button>` : `<div class="muted" style="font-size:12px">${E(X('To change your name or password ask an administrator.', 'لتغيير الاسم أو كلمة المرور تواصل مع المسؤول.'))}</div>`}`);
  o.addEventListener('click', e => {
    const b = e.target.closest('[data-pf]'); if (!b) return; const k = b.dataset.pf;
    if (k === 'x') closeSheet();
    else if (k === 'en' || k === 'ar') { if (S.lang !== k) toggleLang(); else closeSheet(); }
    else if (k === 'dark' || k === 'light') { if (S.theme !== k) toggleTheme(); closeSheet(true); }
  });
}
document.addEventListener('click', e => {
  const um = e.target.closest('[data-um]');
  if (!um) { if (!e.target.closest('#umenu')) closeUM(); }
  else {
    const k = um.dataset.um; if (k === 'toggle') { e.stopPropagation(); toggleUM(); return; }
    closeUM(); if (k === 'profile') openProfile(); else if (k === 'lang') toggleLang(); else if (k === 'logout') logout();
  }
  if (e.target.closest('[data-cmdk]')) cmOpen();
}, true);

/* ====================================================================
   4) HAPTICS · PULL-TO-REFRESH · RICH CHART TOOLTIPS
   ==================================================================== */
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  if (e.target.closest('[data-go="save"],[data-go="del"],[data-c="save"],[data-act="nav"],[data-act="logout"],[data-act="add"],#fab,.btn.primary,#dlg [data-r],[data-um],[data-impgo]')) buzz();
}, true);

(function () {
  let y0 = null, x0 = 0, dy = 0, busy = false, ind;
  const el = () => { if (!ind) { ind = document.createElement('div'); ind.id = 'ptr'; ind.innerHTML = ic('sync'); } if (!ind.isConnected) document.body.appendChild(ind); return ind; };
  const reset = () => { const i = el(); i.classList.remove('go', 'busy'); i.style.transform = 'translateY(-60px)'; };
  document.addEventListener('touchstart', e => {
    if (busy || !live() || window.scrollY !== 0 || e.touches.length !== 1 || $('#overlay') || $('#dlg') || $('#cmdk') || e.target.closest('input,textarea,select')) { y0 = null; return; }
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (y0 == null) return; const d = e.touches[0].clientY - y0;
    if (Math.abs(e.touches[0].clientX - x0) > Math.abs(d) || window.scrollY !== 0 || d <= 0) { if (d <= 0) { y0 = null; reset(); } return; }
    dy = d; const i = el(); i.classList.add('go'); i.style.transform = `translateY(${Math.min(d * .5, 70)}px) rotate(${d * 3}deg)`;
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (y0 == null) return; const go = dy > 120; y0 = null; dy = 0;
    if (!go) return reset();
    busy = true; const i = el(); i.classList.add('busy'); i.style.transform = 'translateY(60px)'; buzz();
    try { ADC.clear(); await Promise.all([flush(), refresh()]); renderMain(); toast(t('synced'), 'ok', { ms: 1500 }); }
    catch (er) { toast(er.code === 'network' ? t('networkErr') : er.message, 'warn'); }
    finally { busy = false; reset(); }
  });
})();

(function () {
  let tip, hideT; const T = () => tip || (tip = Object.assign(document.createElement('div'), { id: 'ctip', className: 'glass' }), document.body.appendChild(tip), tip);
  const num = s => parseFloat(ad(s).replace(/[٬,\s]/g, '').replace(/٫/g, '.').replace(/[^\d.\-]/g, '')) || 0;
  const target = e => e.target.closest && e.target.closest('[data-w][data-v],[data-tipx]');
  function info(el) {
    if (el.dataset.tipx) { const [l, v] = el.dataset.tipx.split('|'); return { l, v, sub: X('Admin activity', 'نشاط الإدارة'), c: 'var(--accent)' }; }
    let txt = el.getAttribute('title') || el.dataset.tip || ''; if (el.hasAttribute('title')) { el.dataset.tip = txt; el.removeAttribute('title'); }
    const i = txt.lastIndexOf(': '), l = i > 0 ? txt.slice(0, i) : txt, v = i > 0 ? txt.slice(i + 2) : '';
    const dw = el.closest('.dw'), wt = dw ? ($('.dw-t', dw) || {}).textContent || '' : '';
    let sub = wt;
    if (dw) {
      const sibs = $$('[data-w][data-v]', dw).filter((x, k, a) => a.findIndex(y => y.dataset.v === x.dataset.v) === k);
      const vals = sibs.map(x => num((x.dataset.tip || x.getAttribute('title') || '').split(': ').pop())), me = num(v), tot = vals.reduce((a, b) => a + Math.max(0, b), 0);
      const rank = [...vals].sort((a, b) => b - a).indexOf(me) + 1;
      const parts = [wt]; if (sibs.length > 1) parts.push('#' + rank + ' / ' + sibs.length); if (tot && dw.querySelector('.donutw')) parts.push(Math.round(me / tot * 100) + '%');
      sub = parts.filter(Boolean).join(' · ');
    }
    let c = 'var(--accent)'; if (el.tagName === 'circle') c = el.getAttribute('stroke') || c; else { const k = el.querySelector && el.querySelector('i'); if (k && getComputedStyle(k).backgroundColor !== 'rgba(0, 0, 0, 0)' && !k.closest('.dcol') && !k.closest('.hb')) c = getComputedStyle(k).backgroundColor; }
    return { l, v, sub, c };
  }
  function show(el, x, y) {
    const d = info(el); if (!d.l && !d.v) return; const b = T();
    b.innerHTML = `<div class="tl"><i style="background:${d.c}"></i><span>${E(d.l)}</span></div><div class="tv">${E(d.v)}</div><small>${E(d.sub || '')}</small>`;
    b.classList.add('on'); const w = b.offsetWidth, h = b.offsetHeight;
    b.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 14)) + 'px'; b.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 16)) + 'px';
  }
  const hide = () => { if (tip) tip.classList.remove('on'); };
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const el = target(e); if (el) show(el, e.clientX, e.clientY); }, true);
  document.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || !tip || !tip.classList.contains('on')) return; const el = target(e); if (!el) return hide(); show(el, e.clientX, e.clientY); }, true);
  document.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && target(e)) hide(); }, true);
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; const el = target(e); if (!el) return hide(); show(el, e.clientX, e.clientY); clearTimeout(hideT); hideT = setTimeout(hide, 1800); }, true);
  window.__tipTag = () => {   // admin 24h bars have no native titles: derive them from the cached overview
    const svg = $('svg[viewBox="0 0 240 70"]'), c = typeof adminCached === 'function' && adminCached('admin_overview'); if (!svg || !c || !c.hourly) return;
    const nowH = new Date().getHours(); $$('rect', svg).forEach((r, i) => { if (r.dataset.tipx) return; const hh = (nowH - (23 - i) + 48) % 24; r.dataset.tipx = String(hh).padStart(2, '0') + ':00|' + c.hourly[i] + ' ' + X('actions', 'إجراء'); });
  };
})();

/* ====================================================================
   2) COMMAND PALETTE (Ctrl/Cmd + K)
   ==================================================================== */
let cm = null, cmSel = 0, cmList = [];
const findTab = term => { const nt = stem(term); if (nt.length < 2) return null; return S.tabs.find(tb => [tb.name, tb.label, tb.ar].some(x => { const s = stem(x || ''); return s && (s.includes(nt) || nt.includes(s)); })) || null; };
function parseCmd(q) {
  const s = q.trim(); let m = /^\/?\s*(?:new|add|create|جديد|جديده|اضافه|إضافة|اضافة|انشاء|إنشاء)\s+(.+)$/i.exec(s), term = m && m[1];
  if (!m) { m = /^\/?\s*(.+?)\s+(?:جديد|جديده|new)$/i.exec(s); term = m && m[1]; }
  const tb = term && findTab(term); return tb && canR(tb, 'w') ? tb : null;
}
const goTab = (tab) => { DASH.edit = false; S.view = { ...S.view, kind: 'tab', tab }; S.search = ''; S.limit = CONFIG.PAGE; S.filter[tab] = null; renderApp(); };
const newIn = tab => { goTab(tab); const sc = schemaOf(tab); if (!sc || !canR(sc, 'w')) return; if (innerWidth < 768) openChat(tab); else openNewFormWith(tab, blankDraft(sc), uid()); };
const recIn = (tab, id) => { goTab(tab); openRecord(id); };
function cmItems(q) {
  const out = [], nq = norm(q), toks = nq.split(' ').filter(Boolean), nav = [];
  const c = parseCmd(q);
  if (c) out.push({ g: X('Quick actions', 'إجراءات سريعة'), em: '➕', title: X('New ', 'جديد: ') + tl(c), sub: '/new', run: () => newIn(c.name) });
  if (!toks.length) S.tabs.filter(tb => canR(tb, 'w')).forEach(tb => out.push({ g: X('Quick actions', 'إجراءات سريعة'), em: '➕', title: X('New ', 'جديد: ') + tl(tb), sub: '/new ' + tb.name.toLowerCase(), run: () => newIn(tb.name) }));
  if (toks.length) S.tabs.forEach(tb => {
    let n = 0; const rows = [...dataOf(tb.name).values()].sort((a, b) => (b._updated || 0) - (a._updated || 0)), f = vf(tb), f0 = f[0];
    for (const r of rows) {
      if (n >= 6) break; const hay = norm(f.map(x => displayVal(x, r[x.key])).join(' '));
      if (toks.every(k => hay.includes(k))) { n++; out.push({ g: (tb.icon || '') + ' ' + tl(tb), em: tb.icon || '📄', title: displayVal(f0, r[f0.key]) || '—', sub: f.slice(1).map(x => displayVal(x, r[x.key])).filter(Boolean).slice(0, 3).join(' · '), run: () => recIn(tb.name, r._id) }); }
    }
  });
  const goItems = [{ id: 'dash', em: '📊', label: t('dashboard') }].concat(S.tabs.map(tb => ({ id: 'tab:' + tb.name, em: tb.icon || '📄', label: tl(tb) })));
  if (S.user.role === 'admin') goItems.push({ id: 'admin', em: '🛡️', label: t('admin') });
  goItems.filter(i => !toks.length || norm(i.label).includes(nq)).forEach(i => out.push({ g: X('Go to', 'انتقال إلى'), em: i.em, title: i.label, run: () => { const b = document.createElement('button'); b.dataset.act = 'nav'; b.dataset.id = i.id; document.body.appendChild(b); b.click(); b.remove(); } }));
  if (toks.length && S.user.role === 'admin') { const u = adminCached('admin_users'); (u ? u.users : []).filter(x => norm(x.username + ' ' + x.name).includes(nq)).slice(0, 5).forEach(x => out.push({ g: X('Users', 'المستخدمون'), em: window.UserAvatar(x, 30), raw: 1, title: x.name || x.username, sub: '@' + x.username + ' · ' + x.role, run: () => { const b = document.createElement('button'); b.dataset.aud = 'user'; b.dataset.id = x.username; document.body.appendChild(b); b.click(); b.remove(); } })); }
  return out.slice(0, 40);
}
function cmRender(q) {
  cmList = cmItems(q); const box = $('#cml', cm); let g = null, h = '';
  cmList.forEach((it, i) => { if (it.g !== g) { g = it.g; h += `<div class="cmk-g">${E(g)}</div>`; } h += `<button class="cmk-it ${i === cmSel ? 'on' : ''}" data-ci="${i}"><span class="em">${it.raw ? it.em : E(it.em)}</span><div><b>${E(it.title)}</b>${it.sub ? `<small>${E(it.sub)}</small>` : ''}</div></button>`; });
  box.innerHTML = h || `<div class="cmk-none">${E(X('No results', 'لا توجد نتائج'))}</div>`;
}
const cmMark = () => { $$('.cmk-it', cm).forEach(b => { const on = +b.dataset.ci === cmSel; b.classList.toggle('on', on); if (on) b.scrollIntoView({ block: 'nearest' }); }); };
function cmClose() { if (!cm) return; const c = cm; cm = null; c.classList.remove('open'); setTimeout(() => c.remove(), 160); }
function cmRun(i) { const it = cmList[i]; if (!it) return; cmClose(); it.run(); }
function cmOpen() {
  if (!live() || cm) return; cm = document.createElement('div'); cm.id = 'cmdk'; cmSel = 0;
  cm.innerHTML = `<div class="cmk glass" role="dialog"><div class="cmk-in">${ic('search')}<input id="cmq" autocomplete="off" placeholder="${E(X('Search everything… or type /new candidate', 'ابحث في كل شيء… أو اكتب /new candidate أو مرشح جديد'))}"><kbd>Esc</kbd></div><div id="cml" class="cmk-l"></div><div class="cmk-f"><span>↑↓ ${E(X('navigate', 'تنقل'))}</span><span>↵ ${E(X('open', 'فتح'))}</span><span>Esc ${E(X('close', 'إغلاق'))}</span></div></div>`;
  document.body.appendChild(cm); requestAnimationFrame(() => cm && cm.classList.add('open'));
  const inp = $('#cmq', cm);
  cm.addEventListener('mousedown', e => { if (e.target === cm) cmClose(); });
  inp.addEventListener('input', () => { cmSel = 0; cmRender(inp.value); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmSel = Math.min(cmList.length - 1, cmSel + 1); cmMark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmSel = Math.max(0, cmSel - 1); cmMark(); }
    else if (e.key === 'Enter') { e.preventDefault(); cmRun(cmSel); }
    else if (e.key === 'Escape') { e.stopPropagation(); cmClose(); }
  });
  cm.addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (b) cmRun(+b.dataset.ci); });
  cm.addEventListener('mousemove', e => { const b = e.target.closest('[data-ci]'); if (b && +b.dataset.ci !== cmSel) { cmSel = +b.dataset.ci; cmMark(); } });
  cmRender(''); inp.focus();
  if (S.user.role === 'admin' && typeof adminGet === 'function') adminGet('admin_users').then(() => { if (cm) cmRender(inp.value); }).catch(() => {});
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'k') { e.preventDefault(); if (cm) cmClose(); else cmOpen(); }
}, true);

/* ====================================================================
   3) CLIENT DETAILS + ERP CODE BINDING
   Setup in the Sheet (no backend change):
     Candidates:  Client::type=text;lookup=Clients.Company     (links to a client)
     Any tab:     ERP Code::type=text                          (same header everywhere)
   ==================================================================== */
window.ERP_SYNC = Object.assign({
  codeLabel: /erp[\s_-]*code|كود.*erp/i,
  hiredValues: ['Hired', 'تم التعيين'],
  prefix: 'ERP-', pad: 5,
  mirror: ['Full Name', 'Name', 'Phone', 'Position', 'Resignation Date', 'Resigned', 'Last Working Day', 'الاسم', 'الهاتف']   // labels copied to every tab sharing the same ERP Code
}, window.ERP_SYNC || {});
const erpField = sc => sc && sc.fields.find(f => ERP_SYNC.codeLabel.test(f.label) || ERP_SYNC.codeLabel.test(f.key));
const statusField = sc => sc.fields.find(f => f.type === 'select' && (f.options || []).some(o => ERP_SYNC.hiredValues.includes(o)));
function nextErp() {
  let max = 0;
  S.tabs.forEach(tb => { const f = erpField(tb); if (!f) return; dataOf(tb.name).forEach(r => { const m = /(\d+)\s*$/.exec(String(r[f.key] || '')); if (m) max = Math.max(max, +m[1]); }); });
  return ERP_SYNC.prefix + String(max + 1).padStart(ERP_SYNC.pad, '0');
}
const _save = saveRecord;
window.saveRecord = async function (tab, id, data, isNew) {
  const sc = schemaOf(tab), ex = dataOf(tab).get(id), snap = ex ? clone(ex) : {};
  try {
    const ef = erpField(sc), sf = sc && statusField(sc);
    if (ef && sf) {
      const code = data[ef.key] !== undefined ? data[ef.key] : ex && ex[ef.key], stv = data[sf.key] !== undefined ? data[sf.key] : ex && ex[sf.key];
      if (isEmpty(code) && ERP_SYNC.hiredValues.includes(stv)) { data = Object.assign({}, data, { [ef.key]: nextErp() }); toast('ERP: ' + data[ef.key], 'ok', { ms: 2500 }); }
    }
  } catch (e) { console.warn(e); }
  const r = await _save(tab, id, data, isNew);
  try { await mirror(tab, id, snap); } catch (e) { console.warn(e); }
  return r;
};
async function mirror(tab, id, snap) {
  const sc = schemaOf(tab), ef = erpField(sc), rec = dataOf(tab).get(id); if (!ef || !rec) return;
  const code = String(rec[ef.key] || '').trim(); if (!code) return;
  const set = new Set(ERP_SYNC.mirror.map(norm));
  const changed = sc.fields.filter(f => set.has(norm(f.label)) && f.type !== 'calc' && JSON.stringify(rec[f.key] ?? '') !== JSON.stringify(snap[f.key] ?? ''));
  if (!changed.length) return; let n = 0;
  for (const tb of S.tabs) {
    if (tb.name === tab || !canR(tb, 'w')) continue; const e2 = erpField(tb); if (!e2) continue; const patch = {};
    changed.forEach(f => { const g = tb.fields.find(x => norm(x.label) === norm(f.label) && x.type === f.type && !x.readonly && x.type !== 'calc'); if (g) patch[g.key] = rec[f.key]; });
    if (!Object.keys(patch).length) continue;
    for (const r of [...dataOf(tb.name).values()]) if (String(r[e2.key] || '').trim() === code) { await _save(tb.name, r._id, patch, false); n++; }
  }
  if (n) toast(X(`Synced ${n} linked record(s) by ERP Code`, `تمت مزامنة ${n} سجل مرتبط بكود ERP`), 'ok', { ms: 2500 });
}
const isClientTab = sc => /client|عميل|عملاء/i.test(sc.name + ' ' + (sc.label || '') + ' ' + (sc.ar || ''));
const MONEY = /fee|commission|revenue|amount|total|salary|price|cost|payroll|عمولة|إيراد|ايراد|رسوم|مبلغ|إجمالي|اجمالي|راتب|سعر|تكلفة/i;
function clientLinks(cs) {
  const first = vf(cs)[0], out = [];
  S.tabs.forEach(tb => {
    if (tb.name === cs.name) return; const ls = [];
    tb.fields.forEach(f => {
      if (f.lookup && f.lookup.split('.')[0] === cs.name) ls.push({ f, col: f.lookup.split('.').slice(1).join('.') });
      else if (!f.lookup && ['text', 'select'].includes(f.type) && /client|company|customer|عميل|شركة/i.test(f.label + ' ' + f.key + ' ' + (f.ar || ''))) ls.push({ f, col: first.key });
    });
    if (ls.length) out.push({ tb, ls });
  });
  return out;
}
function openClientDetails(id) {
  const cs = schemaOf(S.view.tab), rec = cs && dataOf(cs.name).get(id); if (!rec) return;
  const secs = clientLinks(cs).map(({ tb, ls }) => ({ tb, rows: [...dataOf(tb.name).values()].filter(r => ls.some(l => { const a = norm(r[l.f.key]), b = norm(rec[l.col]); return a && a === b; })).sort((a, b) => (b._updated || 0) - (a._updated || 0)) }));
  const stats = [], money = [];
  secs.forEach(s => { stats.push([tl(s.tb), s.rows.length]); s.tb.fields.filter(f => ['number', 'calc'].includes(f.type) && MONEY.test(f.label + ' ' + (f.ar || ''))).forEach(f => { const v = s.rows.reduce((a, r) => a + (Number(r[f.key]) || 0), 0); money.push({ l: tl(s.tb) + ' · ' + fl(f), v }); }); });
  cs.fields.filter(f => ['number', 'calc'].includes(f.type) && MONEY.test(f.label + ' ' + (f.ar || '')) && !isEmpty(rec[f.key])).forEach(f => money.push({ l: tl(cs) + ' · ' + fl(f), v: Number(rec[f.key]) || 0 }));
  money.sort((a, b) => b.v - a.v); const mx = Math.max(1, ...money.map(m => m.v));
  const f0 = vf(cs)[0], title = displayVal(f0, rec[f0.key]) || tl(cs);
  const tbl = s => { const cols = vf(s.tb).filter(f => !['longtext', 'file'].includes(f.type)).slice(0, 5); return `<div class="cd-sec"><h4><span>${s.tb.icon || ''} ${E(tl(s.tb))}</span><span class="tag">${s.rows.length}</span></h4>${s.rows.length ? `<div class="tscroll"><table class="t"><thead><tr>${cols.map(c => `<th>${E(fl(c))}</th>`).join('')}</tr></thead><tbody>${s.rows.slice(0, 50).map(r => `<tr class="row" data-act="wopen" data-t="${E(s.tb.name)}" data-id="${E(r._id)}">${cols.map(c => `<td>${E(displayVal(c, r[c.key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="muted" style="font-size:13px">${E(t('noData'))}</div>`}</div>`; };
  openSheet(`<div class="hd"><h3>📊 ${E(title)}</h3><button class="btn icon ghost" onclick="closeSheet()">${ic('x')}</button></div>
    ${secs.length ? `<div class="statgrid">${stats.map(([l, v]) => `<div class="stat"><small>${E(l)}</small><b>${E(fmtN(v))}</b></div>`).join('')}${money.slice(0, 4).map(m => `<div class="stat"><small>${E(m.l)}</small><b style="color:var(--ok)">${E(fmtN(m.v))}</b></div>`).join('')}</div>
    ${money.length ? `<div class="cd-sec card"><h4><span>${E(X('Revenue analytics', 'تحليل الإيرادات'))}</span></h4>${money.slice(0, 8).map(m => `<div class="hb"><span>${E(m.l)}</span><div class="tr"><i style="width:${Math.max(2, m.v / mx * 100)}%"></i></div><b>${E(fmtN(m.v))}</b></div>`).join('')}</div>` : ''}
    ${secs.map(tbl).join('')}` : `<div class="card muted">${E(X('No page is linked to this client yet. In the Sheet add a column such as', 'لا توجد صفحة مرتبطة بهذا العميل بعد. أضف في الشيت عموداً مثل'))} <code dir="ltr">Client::type=text;lookup=${E(cs.name)}.${E(f0.key)}</code></div>`}`, { wide: true });
}
function openLinked(code, tab, id) {
  const code2 = norm(code), secs = [];
  S.tabs.forEach(tb => { const ef = erpField(tb); if (!ef) return; const rows = [...dataOf(tb.name).values()].filter(r => norm(r[ef.key]) === code2 && !(tb.name === tab && r._id === id)); if (rows.length) secs.push({ tb, rows }); });
  openSheet(`<div class="hd"><h3>🔗 ${E(code)}</h3><button class="btn icon ghost" onclick="closeSheet()">${ic('x')}</button></div>
    ${secs.length ? secs.map(s => `<div class="cd-sec"><h4><span>${s.tb.icon || ''} ${E(tl(s.tb))}</span><span class="tag">${s.rows.length}</span></h4>${s.rows.map(r => { const fs = vf(s.tb); return `<div class="card" style="margin-bottom:8px;cursor:pointer" data-act="wopen" data-t="${E(s.tb.name)}" data-id="${E(r._id)}"><b>${E(displayVal(fs[0], r[fs[0].key]) || '—')}</b><div class="muted" style="font-size:12px">${E(fs.slice(1, 4).map(x => displayVal(x, r[x.key])).filter(Boolean).join(' · '))}</div></div>`; }).join('')}</div>`).join('') : `<div class="card muted">${E(X('No other records share this ERP Code.', 'لا توجد سجلات أخرى بنفس كود ERP.'))}</div>`}`);
}
const _open = openRecord;
window.openRecord = function (id) {
  _open(id);
  try {
    const tab = S.view.tab, sc = schemaOf(tab), rec = dataOf(tab).get(id), o = $('#overlay'); if (!sc || !rec || !o) return;
    const box = $('.hd > div', o); if (!box) return; const add = h => box.insertAdjacentHTML('afterbegin', h);
    const ef = erpField(sc); if (ef && !isEmpty(rec[ef.key])) add(`<button class="btn icon ghost" data-lk="${E(id)}" title="ERP ${E(rec[ef.key])}">🔗</button>`);
    if (isClientTab(sc)) add(`<button class="btn icon ghost" data-cd="${E(id)}" title="${E(X('Client details', 'تفاصيل العميل'))}">📊</button>`);
  } catch (e) { console.warn(e); }
};
document.addEventListener('click', e => {
  const cd = e.target.closest('[data-cd]'); if (cd) { e.preventDefault(); return openClientDetails(cd.dataset.cd); }
  const lk = e.target.closest('[data-lk]'); if (lk) { e.preventDefault(); const tab = S.view.tab, sc = schemaOf(tab), rec = dataOf(tab).get(lk.dataset.lk), ef = erpField(sc); if (rec && ef) openLinked(rec[ef.key], tab, rec._id); }
});

/* ====================================================================
   1) SMART EXCEL IMPORT + DEDUP
   Merge     = incoming NON-empty values win; empty incoming cells keep existing data (multi-selects are unioned)
   Overwrite = every mapped column is replaced by the file's value (even empty)
   Skip      = row ignored
   Duplicate trigger: same phone (last 9 digits) OR same full name. Duplicates inside the file are caught too.
   ==================================================================== */
function ensureImpBtn() {
  if (!S.view || S.view.kind !== 'tab') return; const lay = $('#main [data-act="layout"]'); if (!lay || $('#main [data-imp]')) return;
  const sc = schemaOf(S.view.tab); if (!sc || !canR(sc, 'w')) return;
  const b = document.createElement('button'); b.className = 'btn'; b.dataset.imp = '1'; b.style.cssText = 'padding:0 12px;white-space:nowrap'; b.title = X('Import from Excel', 'استيراد من Excel'); b.textContent = '\u2B06 ' + X('Import', 'استيراد'); lay.before(b);
}
document.addEventListener('click', e => {
  if (!e.target.closest('[data-imp]')) return; e.preventDefault(); const sc = schemaOf(S.view.tab); if (!sc) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv'; inp.onchange = () => inp.files[0] && impStart(sc, inp.files[0]); inp.click();
});
const matchOpt = (f, x) => { const o = (f.options || []).find(v => norm(v) === norm(x)); return o !== undefined ? o : String(x).trim(); };
function normDate(s, type) {
  s = ad(s).trim(); let y, m, d, hh = '00', mm = '00', r;
  if ((r = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3]; if (r[4]) { hh = r[4]; mm = r[5]; } }
  else if ((r = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:[T\s]+(\d{1,2}):(\d{2}))?/.exec(s))) { d = +r[1]; m = +r[2]; y = +r[3]; if (r[4]) { hh = r[4]; mm = r[5]; } }   // dd/mm/yyyy
  else return '';
  if (m < 1 || m > 12 || d < 1 || d > 31) return ''; const z = n => String(n).padStart(2, '0'), ds = `${y}-${z(m)}-${z(d)}`;
  return type === 'datetime' ? `${ds}T${z(hh)}:${mm}` : ds;
}
function conv(f, v) {
  const z = n => String(n).padStart(2, '0');
  if (v instanceof Date) {
    if (isNaN(v)) return blank(f); const d = new Date(v.getTime() + 30000), ds = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
    return f.type === 'datetime' ? `${ds}T${z(d.getHours())}:${z(d.getMinutes())}` : f.type === 'date' ? ds : ds;
  }
  if (v === '' || v == null) return blank(f);
  if ((f.type === 'date' || f.type === 'datetime') && typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`; }
  const s = typeof v === 'number' ? v : String(v).trim(); if (s === '') return blank(f);
  switch (f.type) {
    case 'number': { const n = Number(ad(s).replace(/[,٬\s]/g, '').replace(/٫/g, '.')); return isNaN(n) ? '' : n; }
    case 'checkbox': return /^(1|true|yes|y|نعم|✓|صح)$/i.test(String(s));
    case 'multiselect': return String(s).split(/[,،;|]/).map(x => x.trim()).filter(Boolean).map(x => matchOpt(f, x));
    case 'select': return matchOpt(f, s);
    case 'phone': { let p = ad(s).trim(); if (typeof s === 'number' && /^1\d{9}$/.test(p)) p = '0' + p; return p.replace(/[^\d+]/g, ''); }
    case 'date': case 'datetime': return normDate(String(s), f.type);
    case 'email': return String(s).toLowerCase();
    default: return String(s).slice(0, 5000);
  }
}
function impValidate(sc, draft) {
  const errs = validateDraft(sc, draft);
  sc.fields.forEach(f => { const v = draft[f.key]; if (isEmpty(v) || f.lookup || !(f.options || []).length) return; if (f.type === 'select' && !f.options.includes(v)) errs[f.key] = 'x'; if (f.type === 'multiselect' && v.some(x => !f.options.includes(x))) errs[f.key] = 'x'; });
  return errs;
}
async function impStart(sc, file) {
  if (typeof XLSX === 'undefined') return toast(X('Excel library not loaded (needs internet once)', 'مكتبة الإكسل لم تُحمَّل (تحتاج إنترنت مرة واحدة)'), 'err');
  let rows; try { const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '', blankrows: false }); }
  catch (e) { return toast(X('Could not read the file', 'تعذّر قراءة الملف'), 'err'); }
  rows = rows.filter(r => r.some(c => String(c).trim() !== '')); if (rows.length < 2) return toast(X('The file has no data rows', 'الملف لا يحتوي على صفوف بيانات'), 'warn');
  const heads = rows[0].map((h, i) => String(h).trim() || X('Column ', 'عمود ') + colLetter(i)), body = rows.slice(1);
  const fs = vf(sc).filter(f => !['calc', 'file'].includes(f.type) && !f.readonly), map = {};
  fs.forEach(f => { const keys = [f.label, f.ar, f.key].filter(Boolean).map(norm); let i = heads.findIndex(h => keys.includes(norm(h))); if (i < 0) i = heads.findIndex(h => keys.some(k => k.length > 2 && (norm(h).includes(k) || k.includes(norm(h))))); map[f.key] = i; });
  const o = openSheet(`<div class="hd"><h3>⬆ ${E(X('Import from Excel', 'استيراد من Excel'))}</h3><button class="btn icon ghost" data-ii="x">${ic('x')}</button></div>
    <p class="muted" style="margin:0 0 12px">${E(file.name)} · ${body.length} ${E(t('rows'))}<br>${E(X('Match each system field to a column in your file.', 'اربط كل حقل في النظام بالعمود المناسب في ملفك.'))}</p>
    <div class="g2" id="imp_map">${fs.map(f => `<div class="fld"><label class="lab">${E(fl(f))}${f.req ? ' <b class="req">*</b>' : ''}</label><select class="inp" data-m="${E(f.key)}"><option value="-1">— ${E(t('skip'))} —</option>${heads.map((h, i) => `<option value="${i}" ${map[f.key] === i ? 'selected' : ''}>${colLetter(i)} — ${E(h)}</option>`).join('')}</select></div>`).join('')}</div>
    <button class="btn primary" data-ii="next" style="width:100%">${ic('check')} ${E(X('Check duplicates', 'فحص التكرار'))}</button>`, { wide: true });
  o.addEventListener('change', e => { const m = e.target.closest('[data-m]'); if (m) map[m.dataset.m] = +m.value; });
  o.addEventListener('click', e => { const b = e.target.closest('[data-ii]'); if (!b) return; if (b.dataset.ii === 'x') closeSheet(); else if (b.dataset.ii === 'next') impReview(sc, fs, map, body); });
}
function impReview(sc, fs, map, body) {
  const mapped = fs.filter(f => map[f.key] >= 0); if (!mapped.length) return toast(X('Map at least one column', 'اربط عموداً واحداً على الأقل'), 'err');
  const phoneF = sc.fields.find(f => f.type === 'phone' && !f.hidden), nameF = sc.fields.find(f => /name|اسم/i.test(f.label + ' ' + (f.ar || '')) && !f.hidden && ['text', 'longtext'].includes(f.type)) || vf(sc).find(f => f.type === 'text');
  const pk = r => { if (!phoneF) return ''; const d = ad(r[phoneF.key] || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : ''; }, nk = r => nameF ? norm(r[nameF.key]) : '';
  const idx = { p: new Map(), n: new Map() };
  const reg = (t0, r) => { const p = pk(r), n = nk(r); if (p && !idx.p.has(p)) idx.p.set(p, t0); if (n && !idx.n.has(n)) idx.n.set(n, t0); };
  dataOf(sc.name).forEach(rec => { const t0 = { id: rec._id, isNew: false, work: { ...rec }, touched: new Set(), label: '' }; reg(t0, rec); });
  const news = [], conf = [], f0 = vf(sc)[0];
  body.forEach((row, ri) => {
    const d = {}; mapped.forEach(f => { d[f.key] = conv(f, row[map[f.key]]); });
    if (mapped.every(f => isEmpty(d[f.key]))) return;
    const byP = pk(d) && idx.p.get(pk(d)), byN = nk(d) && idx.n.get(nk(d)), t0 = byP || byN;
    if (!t0) { const n = { id: uid(), isNew: true, work: { ...d }, touched: new Set() }; news.push(n); reg(n, d); }
    else conf.push({ line: ri + 2, d, t: t0, by: byP ? X('phone', 'الهاتف') : X('name', 'الاسم'), act: 'merge' });
  });
  const shown = x => displayVal(f0, x[f0.key]) || '—', fmtD = c => shown(c.d);
  const o = openSheet(`<div class="hd"><h3>⬆ ${E(X('Review import', 'مراجعة الاستيراد'))}</h3><button class="btn icon ghost" data-ii="x">${ic('x')}</button></div>
    <div class="statgrid" style="margin-bottom:12px"><div class="stat"><small>${E(X('New records', 'سجلات جديدة'))}</small><b style="color:var(--ok)">${news.length}</b></div><div class="stat"><small>${E(X('Duplicates', 'مكررة'))}</small><b style="color:var(--warn)">${conf.length}</b></div></div>
    ${conf.length ? `<div class="chips" style="margin-bottom:10px"><span class="muted" style="align-self:center;font-size:12px">${E(X('Apply to all:', 'تطبيق على الكل:'))}</span>${[['merge', X('Merge', 'دمج')], ['skip', X('Skip', 'تخطي')], ['overwrite', X('Overwrite', 'استبدال')]].map(([k, l]) => `<button class="chip" data-all="${k}">${E(l)}</button>`).join('')}</div>
    <div style="max-height:46dvh;overflow:auto">${conf.map((c, i) => `<div class="urow" style="flex-wrap:wrap"><div style="flex:1;min-width:150px"><b>${E(fmtD(c))}</b><div class="muted" style="font-size:12px">${E(X('Row', 'صف'))} ${c.line} · ${E(X('matches by', 'تطابق بـ'))} ${E(c.by)} → ${E(shown(c.t.work))}</div></div><select class="inp" style="width:auto" data-ci2="${i}"><option value="merge">${E(X('Merge', 'دمج'))}</option><option value="skip">${E(X('Skip', 'تخطي'))}</option><option value="overwrite">${E(X('Overwrite', 'استبدال'))}</option></select></div>`).join('')}</div>
    <div class="muted" style="font-size:12px;margin:8px 0">${E(X('Merge: filled cells in the file win, empty cells keep existing data. Overwrite: replaces every mapped field.', 'دمج: القيم غير الفارغة في الملف تغلب والخلايا الفارغة تحتفظ بالبيانات الحالية. استبدال: يستبدل كل الحقول المربوطة.'))}</div>` : ''}
    <div id="imp_prog" class="muted" style="margin:8px 0"></div>
    <button class="btn primary" data-ii="run" style="width:100%">${ic('check')} ${E(X('Import now', 'استيراد الآن'))}</button>`, { wide: true });
  o.addEventListener('change', e => { const s = e.target.closest('[data-ci2]'); if (s) conf[+s.dataset.ci2].act = s.value; });
  o.addEventListener('click', async e => {
    const all = e.target.closest('[data-all]'); if (all) { conf.forEach(c => { c.act = all.dataset.all; }); $$('[data-ci2]', o).forEach(s => { s.value = all.dataset.all; }); return; }
    const b = e.target.closest('[data-ii]'); if (!b) return; if (b.dataset.ii === 'x') return closeSheet();
    if (b.dataset.ii !== 'run') return; b.disabled = true; b.dataset.impgo = '1';
    const prog = $('#imp_prog', o), res = { created: 0, merged: 0, overwritten: 0, skipped: 0, invalid: 0 };
    conf.forEach(c => {
      if (c.act === 'skip') { res.skipped++; return; }
      mapped.forEach(f => { if (!(f.key in c.d)) return; const v = c.d[f.key];
        if (c.act === 'overwrite') { c.t.work[f.key] = v; c.t.touched.add(f.key); }
        else if (!isEmpty(v)) { c.t.work[f.key] = f.type === 'multiselect' ? [...new Set([...(c.t.work[f.key] || []), ...v])] : v; c.t.touched.add(f.key); } });
      if (c.act === 'overwrite') res.overwritten++; else res.merged++;
    });
    const jobs = [], touchedEx = new Map(); conf.forEach(c => { if (!c.t.isNew && c.act !== 'skip') touchedEx.set(c.t.id, c.t); });
    news.forEach(n => { const draft = { ...blankDraft(sc), ...n.work }; recalc(sc, draft); if (Object.keys(impValidate(sc, draft)).length) { res.invalid++; return; } jobs.push({ id: n.id, data: draft, isNew: true }); res.created++; });
    touchedEx.forEach(t0 => { const patch = {}; t0.touched.forEach(k => { patch[k] = t0.work[k]; }); if (!Object.keys(patch).length) return; const draft = { ...t0.work }; recalc(sc, draft); if (Object.keys(impValidate(sc, draft)).length) { res.invalid++; return; } jobs.push({ id: t0.id, data: patch, isNew: false }); });
    const flushWait = async () => { await flush(); while (flushing) await sleep(150); };
    let done = 0;
    try {
      for (const j of jobs) {
        await window.saveRecord(sc.name, j.id, j.data, j.isNew); done++;
        if (prog) prog.textContent = `${done} / ${jobs.length}`;
        if (done % 100 === 0) await flushWait(); else if (done % 10 === 0) await sleep(0);
      }
      await flushWait();
    } catch (er) { toast(er.message || t('saveFail'), 'err'); }
    closeSheet(true); renderList();
    toast(X(`Imported: ${res.created} new · ${res.merged} merged · ${res.overwritten} overwritten · ${res.skipped} skipped${res.invalid ? ' · ' + res.invalid + ' invalid' : ''}`, `تم الاستيراد: ${res.created} جديد · ${res.merged} دمج · ${res.overwritten} استبدال · ${res.skipped} تخطي${res.invalid ? ' · ' + res.invalid + ' غير صالح' : ''}`), res.invalid ? 'warn' : 'ok', { ms: 7000 });
  });
}

/* ------------------------------------------------------------------ observer glue */
let pend = false;
const tick = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; try { paintAvatars(); injectTopbar(); ensureImpBtn(); window.__tipTag(); } catch (e) { console.warn(e); } }); };
new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); tick();
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeUM(); });
})();
