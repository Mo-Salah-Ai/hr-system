'use strict';
/* ai.patch.js — floating AI assistant + usage limit + admin usage panel. Load AFTER app.patch.js. Backend action: "ai_ask" (key stays server-side). */
(function () {
const X = (en, ar) => S.lang === 'ar' ? ar : en;
const live = () => !!(S.user && S.token);
const isAdmin = () => !!(S.user && S.user.role === 'admin');
const hist = []; let busy = false;
const st = document.createElement('style');
st.textContent = `
#aifab{position:fixed;z-index:80;right:16px;left:auto;bottom:calc(86px + env(safe-area-inset-bottom));width:58px;height:58px;border-radius:20px;border:0;cursor:pointer;color:#fff;font-size:24px;background:linear-gradient(135deg,#5cc8ff,#6f8cff);box-shadow:0 14px 30px -8px rgba(80,150,255,.6),0 0 0 1px rgba(255,255,255,.22) inset,0 -6px 14px -6px rgba(255,255,255,.35) inset;transition:transform .15s,box-shadow .2s}
#aifab::after{content:"";position:absolute;inset:-5px;border-radius:24px;border:2px solid rgba(92,200,255,.45);animation:aipulse 2.4s ease-out infinite;pointer-events:none}
@keyframes aipulse{0%{transform:scale(.92);opacity:.9}100%{transform:scale(1.22);opacity:0}}
#aifab:hover{transform:translateY(-3px) scale(1.04)}#aifab:active{transform:scale(.92)}
html[dir=ltr] #aifab{bottom:calc(160px + env(safe-area-inset-bottom))}
@media(min-width:1024px){#aifab{bottom:28px}html[dir=ltr] #aifab{bottom:102px}}
#aip{position:fixed;z-index:95;right:0;left:auto;bottom:0;width:100%;max-width:440px;height:min(78dvh,640px);display:none;flex-direction:column;border-radius:24px 24px 0 0;background:var(--bg2);border:1px solid var(--border);box-shadow:var(--shadow)}
#aip.open{display:flex;animation:rise .2s both}
@media(min-width:640px){#aip{right:16px;bottom:16px;border-radius:24px}}
.ai-h{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border);font-weight:800}
.ai-h small{font-weight:600;font-size:11.5px;color:var(--muted)}
.ai-h .sp{margin-inline-start:auto;display:flex;gap:6px}
.ai-h button{border:0;background:none;color:var(--muted);cursor:pointer;font-size:18px}
.ai-b{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.ai-m{max-width:88%;padding:10px 13px;border-radius:16px;line-height:1.6;font-size:14px;white-space:pre-wrap;word-break:break-word}
.ai-m.u{align-self:flex-end;background:var(--accent);color:#06121f}.ai-m.a{align-self:flex-start;background:var(--surface2);color:var(--text)}
.ai-s{display:flex;flex-wrap:wrap;gap:6px}.ai-s button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;padding:6px 10px;font-size:12.5px;cursor:pointer}
.ai-f{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border)}
.ai-f input{flex:1;min-width:0;padding:11px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);outline:0;font:inherit}
.ai-f button,.ai-save{border:0;border-radius:14px;padding:0 16px;font-weight:800;cursor:pointer;background:var(--accent);color:#06121f}.ai-f button:disabled{opacity:.5}
.ai-a{display:none;flex:1;overflow:auto;padding:14px;font-size:13px}#aip.adm .ai-a{display:block}#aip.adm .ai-b,#aip.adm .ai-f{display:none}
.ai-a label{display:block;font-weight:700;margin-bottom:6px}
.ai-a input[type=number]{width:84px;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit}
.ai-tw{margin:12px 0;border:1px solid var(--border);border-radius:14px;overflow:auto;max-height:46dvh}
.ai-a table{width:100%;border-collapse:collapse;min-width:360px}.ai-a th,.ai-a td{padding:7px 9px;text-align:start;border-bottom:1px solid var(--border);white-space:nowrap}
.ai-a th{font-size:11.5px;color:var(--muted);position:sticky;top:0;background:var(--bg2)}
.ai-save{padding:10px 18px}
/* ---- fancier buttons (look only) ---- */
.topbar .btn.icon{width:42px;height:42px;padding:0;border-radius:14px;background:linear-gradient(145deg,var(--surface),var(--surface2));border:1px solid var(--border);box-shadow:0 6px 16px -8px rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.16) inset;backdrop-filter:blur(10px);transition:transform .15s,box-shadow .2s,border-color .2s}
.topbar .btn.icon .ic{color:var(--accent);transition:transform .25s}
.topbar .btn.icon:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 12px 24px -10px rgba(92,200,255,.55),0 1px 0 rgba(255,255,255,.2) inset}
.topbar .btn.icon:hover .ic{transform:scale(1.12) rotate(-6deg)}
.topbar .btn.icon:active{transform:scale(.9)}
[data-theme=light] .topbar .btn.icon{box-shadow:0 6px 14px -8px rgba(15,23,42,.3),0 1px 0 #fff inset}
@media(max-width:420px){.topbar .btn.icon{width:36px;height:36px;border-radius:12px}}
.btn.primary{box-shadow:0 10px 24px -8px rgba(80,150,255,.5),0 1px 0 rgba(255,255,255,.3) inset;transition:transform .15s,box-shadow .2s,filter .2s}
.btn.primary:hover{transform:translateY(-2px);filter:brightness(1.08)}
.btn:not(.icon):not(.primary):not(.danger):hover{transform:translateY(-1px);box-shadow:0 8px 18px -10px rgba(92,200,255,.5)}
#fab{border-radius:22px;background:linear-gradient(135deg,#5cc8ff,#6f8cff)!important;box-shadow:0 16px 32px -8px rgba(92,200,255,.5),0 0 0 1px rgba(255,255,255,.22) inset,0 -8px 16px -8px rgba(255,255,255,.35) inset!important;transition:transform .18s,box-shadow .2s}
#fab:hover{transform:translateY(-3px) scale(1.05)}
.pill{box-shadow:0 4px 12px -6px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.12) inset;backdrop-filter:blur(8px)}

.topbar [data-act=logout]{display:none!important}
.ai-mailb{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:5px 9px;cursor:pointer;font-size:15px}
.pf-row{display:flex;align-items:center;gap:14px}.pf-prev{width:64px;height:64px;border-radius:22px;overflow:hidden;display:grid;place-items:center;border:1px solid var(--border);background:var(--surface2);flex:none}
.pf-prev img{width:100%;height:100%;object-fit:cover}.pf-btns{display:flex;gap:8px;flex-wrap:wrap}
.ml-hero{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:linear-gradient(135deg,rgba(92,200,255,.2),rgba(141,168,255,.12));border:1px solid var(--border);margin-bottom:14px}
.ml-ic{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,#5cc8ff,#6f8cff);box-shadow:0 10px 22px -10px rgba(92,200,255,.7)}
.ml-hero h3{margin:0}.ml-hero small{color:var(--muted)}
.ml-to{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;border:1px solid var(--border);background:var(--surface);margin-bottom:12px}
.ml-to small{display:block;color:var(--muted);direction:ltr;text-align:start}
textarea.inp{min-height:130px;resize:vertical;line-height:1.7}
.ml-prev{margin:14px 0;border-radius:18px;overflow:hidden;border:1px solid var(--border);background:linear-gradient(180deg,rgba(15,26,51,.92),rgba(8,16,34,.95));color:#dbe8ff}
.ml-bar{height:5px;background:linear-gradient(90deg,#5cc8ff,#8da8ff,#a78bfa)}.ml-pb{padding:14px 16px}
.ml-pill{display:inline-block;padding:3px 11px;border-radius:999px;border:1px solid var(--pc,#5cc8ff);color:var(--pc,#5cc8ff);font-size:11.5px;font-weight:700}
.ml-pb h4{margin:10px 0 6px;font-size:17px;color:#f1f6ff}.ml-pb p{margin:0;white-space:pre-wrap;font-size:13.5px;line-height:1.8;color:#c9daf5;max-height:120px;overflow:auto}
.ml-cta{display:inline-block;margin-top:12px;padding:8px 16px;border-radius:12px;background:linear-gradient(135deg,#5cc8ff,#6f8cff);color:#04101f;font-weight:800;font-size:13px}
/* ---- ICY GLASS THEME (look only; delete this block to revert) ---- */
:root[data-theme=dark]{--bg:#060c1b;--bg2:#0a1329;--surface:rgba(20,34,62,.5);--surface2:rgba(40,64,104,.34);--border:rgba(165,210,255,.15);--accent:#5cc8ff;--accent2:#8da8ff;
 --glow:0 0 0 1px rgba(92,200,255,.22),0 10px 30px -10px rgba(92,200,255,.32);--shadow:0 14px 42px -14px rgba(0,6,20,.7);
 --bgimg:radial-gradient(1000px 560px at 88% -12%,rgba(92,200,255,.17),transparent 62%),radial-gradient(760px 520px at -8% 108%,rgba(141,168,255,.13),transparent 62%)}
:root[data-theme=light]{--bg:#eaf3ff;--bg2:#f6faff;--surface:rgba(255,255,255,.62);--surface2:rgba(218,234,255,.55);--border:rgba(60,120,200,.2);--accent:#0b8ee0;--accent2:#5b7bff;
 --glow:0 0 0 1px rgba(11,142,224,.25),0 10px 26px -10px rgba(11,142,224,.35);--shadow:0 12px 34px -14px rgba(30,70,140,.3);
 --bgimg:radial-gradient(1000px 560px at 88% -12%,rgba(92,200,255,.28),transparent 62%),radial-gradient(760px 520px at -8% 108%,rgba(141,168,255,.2),transparent 62%)}
.glass{backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%)}
.card{background-image:linear-gradient(160deg,rgba(255,255,255,.06),transparent 55%);box-shadow:0 1px 0 rgba(255,255,255,.07) inset,0 10px 26px -18px rgba(0,8,24,.55)}
:root[data-theme=light] .card{background-image:linear-gradient(160deg,rgba(255,255,255,.75),transparent 60%);box-shadow:0 1px 0 #fff inset,0 10px 24px -18px rgba(30,70,140,.35)}
.card:hover{border-color:rgba(92,200,255,.45)}
.sheet.glass{background:linear-gradient(180deg,rgba(16,30,58,.9),rgba(7,14,32,.95));border:1px solid var(--border);border-bottom:0;box-shadow:0 -20px 60px -20px rgba(0,8,28,.8),0 1px 0 rgba(255,255,255,.1) inset}
:root[data-theme=light] .sheet.glass{background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(238,246,255,.95));box-shadow:0 -20px 60px -24px rgba(30,70,140,.35),0 1px 0 #fff inset}
.topbar.glass{background:linear-gradient(180deg,rgba(14,26,50,.72),rgba(10,20,40,.5))}
:root[data-theme=light] .topbar.glass{background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(240,248,255,.55))}
.side.glass,.bottom-nav.glass{background:linear-gradient(180deg,rgba(16,30,58,.6),rgba(8,16,34,.48))}
:root[data-theme=light] .side.glass,:root[data-theme=light] .bottom-nav.glass{background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(240,248,255,.5))}
.login .box.glass{box-shadow:0 30px 70px -24px rgba(0,10,30,.7),0 1px 0 rgba(255,255,255,.12) inset}
.navi.on,.bnav.on{background:linear-gradient(135deg,rgba(92,200,255,.17),rgba(141,168,255,.1));border-color:rgba(92,200,255,.34)}
input:not([type=checkbox]):not([type=radio]):focus,select:focus,textarea:focus{outline:0;border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(92,200,255,.18)}
::selection{background:rgba(92,200,255,.3)}
*{scrollbar-width:thin;scrollbar-color:rgba(120,180,240,.35) transparent}`;
document.head.appendChild(st);

const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[\*\-] /gm, '• ');
function add(role, text) { const b = document.querySelector('#aip .ai-b'); const d = document.createElement('div'); d.className = 'ai-m ' + (role === 'u' ? 'u' : 'a'); d.innerHTML = md(text); b.appendChild(d); b.scrollTop = b.scrollHeight; return d; }
function setLeft(r) {
  const el = document.getElementById('aiq'); if (!el || !r) return;
  el.textContent = r.limit > 0 ? X(`Left today: ${r.left}/${r.limit}`, `المتبقي اليوم: ${r.left}/${r.limit}`) : X('Unlimited', 'بدون حد');
}
const errMsg = e => ({
  ai_not_configured: X('AI key is not configured on the server.', 'مفتاح الذكاء الاصطناعي غير مُعدّ في الخادم.'),
  unknown_action: X('Server not updated: deploy a NEW version of the script.', 'الخادم غير محدّث: انشر نسخة جديدة (New version) من السكربت.'),
  limit_reached: X(`Daily limit reached (${e.data?.limit || ''} questions). Try tomorrow or ask the admin to raise it.`, `وصلت للحد اليومي (${e.data?.limit || ''} سؤال). جرّب بكرة أو اطلب من الأدمن زيادته.`),
  rate_limited: X('Too many questions — wait a minute.', 'أسئلة كثيرة — انتظر دقيقة.'),
  network: X('You are offline.', 'أنت غير متصل.')
}[e.code] || e.message);

async function ask(q) {
  q = (q || '').trim(); if (!q || busy) return;
  const inp = document.querySelector('#aip input'), btn = document.querySelector('#aip .ai-f button');
  busy = true; btn.disabled = true; inp.value = ''; document.querySelector('#aip .ai-s')?.remove();
  add('u', q); const w = add('a', X('Thinking…', 'جارِ التفكير…'));
  try {
    const r = await api('ai_ask', { q, history: hist.slice(-4) });
    w.innerHTML = md(r.answer); hist.push({ role: 'user', text: q }, { role: 'ai', text: r.answer }); setLeft(r);
  } catch (e) { w.innerHTML = md('⚠️ ' + errMsg(e)); if (e.code === 'limit_reached') setLeft({ limit: e.data.limit, left: 0 }); }
  busy = false; btn.disabled = false; inp.focus(); document.querySelector('#aip .ai-b').scrollTop = 1e9;
}
async function refreshStatus() { try { setLeft(await api('ai_ask', { mode: 'status' })); } catch (e) {} }

async function openAdmin() {
  const p = document.getElementById('aip'), a = p.querySelector('.ai-a');
  if (p.classList.toggle('adm') === false) return;
  a.innerHTML = esc(X('Loading…', 'جارٍ التحميل…'));
  try {
    if (window.__hrLoadMeta) await window.__hrLoadMeta();
    const r = await api('ai_ask', { mode: 'admin_get' });
    const fmt = ms => ms ? new Date(ms).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—';
    a.innerHTML = `<label>${esc(X('Default daily limit per user (0 = unlimited)', 'الحد اليومي الافتراضي لكل مستخدم (0 = بدون حد)'))}</label><input type="number" min="0" id="aidef" value="${+r.def}">
      <div class="ai-tw"><table><thead><tr><th>${esc(X('User', 'المستخدم'))}</th><th>${esc(X('Today', 'اليوم'))}</th><th>${esc(X('Total', 'الإجمالي'))}</th><th>${esc(X('Last use', 'آخر استخدام'))}</th><th>${esc(X('Custom limit', 'حد خاص'))}</th><th></th></tr></thead><tbody>${
        r.users.map(u => `<tr><td><div style="display:flex;align-items:center;gap:8px">${window.UserAvatar(u.username, 28)}<div><b>${esc(u.name || u.username)}</b><br><small style="color:var(--muted)">${esc(u.username)}</small></div></div></td><td>${u.today}</td><td>${u.total}</td><td>${esc(fmt(u.last))}</td><td><input type="number" min="0" data-u="${esc(u.username)}" placeholder="${+r.def}" value="${u.limit == null ? '' : +u.limit}"></td><td><button type="button" class="ai-mailb" data-mail="${esc(u.username)}" data-nm="${esc(u.name || '')}" title="${esc(X('Send email', 'إرسال ميل'))}">✉️</button></td></tr>`).join('')
      }</tbody></table></div><button type="button" class="ai-save">${esc(X('Save', 'حفظ'))}</button>`;
    a.querySelectorAll('[data-mail]').forEach(b => b.onclick = () => window.__hrMail && window.__hrMail(b.dataset.mail, b.dataset.nm));
    a.querySelector('.ai-save').onclick = async () => {
      const per = {}; a.querySelectorAll('input[data-u]').forEach(i => { per[i.dataset.u] = i.value === '' ? null : Number(i.value); });
      try { await api('ai_ask', { mode: 'admin_set', def: Number(a.querySelector('#aidef').value), per }); toast(X('Saved', 'تم الحفظ'), 'ok'); refreshStatus(); }
      catch (e) { toast(errMsg(e), 'err'); }
    };
  } catch (e) { a.innerHTML = esc('⚠️ ' + errMsg(e)); }
}

function build() {
  const p = document.createElement('div'); p.id = 'aip';
  p.innerHTML = `<div class="ai-h">✨ ${esc(X('Smart assistant', 'المساعد الذكي'))} <small id="aiq"></small><span class="sp">${isAdmin() ? '<button type="button" class="adm" title="' + esc(X('Usage & limits', 'الاستخدام والحدود')) + '">⚙</button>' : ''}<button type="button" class="cls" aria-label="close">✕</button></span></div><div class="ai-b"></div><div class="ai-a"></div><div class="ai-f"><input placeholder="${esc(X('Ask about your data…', 'اسأل عن بيانات النظام…'))}"><button type="button">${esc(X('Send', 'إرسال'))}</button></div>`;
  document.body.appendChild(p);
  p.querySelector('.cls').onclick = () => p.classList.remove('open', 'adm');
  p.querySelector('button.adm')?.addEventListener('click', openAdmin);
  p.querySelector('.ai-f button').onclick = () => ask(p.querySelector('input').value);
  p.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') ask(e.target.value); });
  add('a', X('Hi! 👋 Ask me anything — data analysis, lookups by code or name, summaries, or ideas.', 'أهلاً بيك! 👋 اسألني أي حاجة: تحليل بيانات، بحث بكود أو اسم، ملخصات، أو أفكار.'));
  const s = document.createElement('div'); s.className = 'ai-s';
  [X('How many records per tab?', 'كم عدد السجلات في كل تبويب؟'), X('Summarize the latest activity', 'لخّص آخر النشاطات'), X('Top client by requests?', 'من العميل الأكثر طلباً؟')].forEach(q => { const b = document.createElement('button'); b.textContent = q; b.onclick = () => ask(q); s.appendChild(b); });
  p.querySelector('.ai-b').appendChild(s);
}
setInterval(() => {
  const fab = document.getElementById('aifab');
  if (!live()) { fab?.remove(); document.getElementById('aip')?.remove(); hist.length = 0; return; }
  if (!fab) { const b = document.createElement('button'); b.id = 'aifab'; b.type = 'button'; b.textContent = '✨'; b.title = X('Smart assistant', 'المساعد الذكي'); b.onclick = () => { if (!document.getElementById('aip')) build(); const p = document.getElementById('aip'); p.classList.toggle('open'); if (p.classList.contains('open')) refreshStatus(); }; document.body.appendChild(b); }
}, 700);
})();

/* IndexedDB self-heal: if the connection was closed (site data cleared, another tab upgraded/deleted the DB), reopen once and retry. */
(function () {
  if (typeof DB === 'undefined') return;
  ['get', 'put', 'del', 'all', 'clear'].forEach(k => {
    const orig = DB[k];
    DB[k] = async (...a) => {
      try { return await orig(...a); }
      catch (e) {
        if (!e || !/closing|closed|InvalidState/i.test(String(e.name) + String(e.message))) throw e;
        await DB.open(); return orig(...a);
      }
    };
  });
})();

/* Audit log: show AI events (labels, icon, filter chip, readable body). */
(function () {
  try {
    if (typeof ACTIONS !== 'undefined') ['ai_ask', 'ai_settings', 'mail_sent', 'user_meta'].forEach(a => { if (!ACTIONS.includes(a)) ACTIONS.push(a); });
    Object.assign(I18N.en, { a_ai_ask: 'AI question', a_ai_settings: 'AI limits changed', a_mail_sent: 'Email sent', a_user_meta: 'User photo / email updated' });
    Object.assign(I18N.ar, { a_ai_ask: 'سؤال للمساعد الذكي', a_ai_settings: 'تعديل حدود المساعد الذكي', a_mail_sent: 'إرسال ميل', a_user_meta: 'تحديث صورة / ميل مستخدم' });
    if (typeof AUD !== 'undefined') { AUD.ai_ask = ['✨', 'var(--accent2)']; AUD.ai_settings = ['⚙️', 'var(--accent)']; AUD.mail_sent = ['✉️', 'var(--accent)']; AUD.user_meta = ['🖼️', 'var(--accent2)']; }
    if (typeof AUD_QUICK !== 'undefined' && !AUD_QUICK.some(x => x[0] === 'ai_ask')) AUD_QUICK.push(['ai_ask', '✨']);
    if (typeof audBody === 'function') {
      const orig = audBody;
      audBody = function (a, d, sc) {
        const A = String(a.action), ar = S.lang === 'ar';
        if (A === 'ai_ask') return `<div class="aud-body"><div style="line-height:1.7;word-break:break-word">💬 ${esc((d && d.q) || '')}${d && d.blocked ? ` <b style="color:var(--err)">⛔ ${ar ? 'تجاوز الحد اليومي' : 'daily limit reached'}</b>` : (d && d.limit > 0 ? ` <small style="color:var(--muted)">(${d.used}/${d.limit})</small>` : '')}</div></div>`;
        if (A === 'mail_sent') return `<div class="aud-body"><div style="line-height:1.7;word-break:break-word">✉️ <b>${esc(((d && d.to) || []).join(', '))}</b> — ${esc((d && d.subject) || '')}</div></div>`;
        if (A === 'user_meta') return `<div class="aud-body"><div>${d && d.email ? '✉️ ' : ''}${d && d.photo === 'set' ? '🖼️ ' + (ar ? 'تم تعيين صورة' : 'photo set') : d && d.photo === 'removed' ? '🖼️ ' + (ar ? 'تمت إزالة الصورة' : 'photo removed') : ''}</div></div>`;
        if (A === 'ai_settings') return `<div class="aud-body"><div>⚙️ ${ar ? 'الحد الافتراضي' : 'Default limit'}: <b>${esc(d && d.def)}</b> · ${ar ? 'حدود خاصة' : 'custom limits'}: <b>${esc(d && d.custom)}</b></div></div>`;
        return orig(a, d, sc);
      };
    }
  } catch (e) { console.warn(e); }
})();

/* =====================  Employee photo + email + luxury mail composer  ===================== */
(function () {
  const X = (en, ar) => S.lang === 'ar' ? ar : en;
  const live = () => !!(S.user && S.token), isAdmin = () => !!(S.user && S.user.role === 'admin');
  const lc = v => String(v == null ? '' : v).toLowerCase();
  const LS = 'hr_ph'; let PH = {}, META = {}, loadedFor = '', loading = null, pendingMeta = null;
  try { PH = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
  const savePH = () => { try { localStorage.setItem(LS, JSON.stringify(PH)); } catch (e) {} };
  const getMeta = u => { const k = lc(u); const f = Object.keys(META).find(x => lc(x) === k); return f ? META[f] : null; };

  /* --- avatars: show the photo when there is one, otherwise the existing coloured letter --- */
  const _UA = window.UserAvatar;
  if (_UA) window.UserAvatar = (u, size = 36) => {
    const key = typeof u === 'string' ? u : (u.username || u.name), p = PH[lc(key)];
    if (p) return `<img class="uav" data-un="${esc(key)}" src="${p}" alt="" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:30%;flex:none">`;
    return _UA(u, size).replace('class="uav"', `class="uav" data-un="${esc(key)}"`);
  };
  function rescan() {
    document.querySelectorAll('span.uav[data-un]').forEach(el => {
      const p = PH[lc(el.dataset.un)]; if (!p) return;
      const img = document.createElement('img'); img.className = el.className; img.dataset.un = el.dataset.un; img.alt = ''; img.src = p;
      img.style.cssText = el.style.cssText + ';object-fit:cover;background:none'; el.replaceWith(img);
    });
  }
  async function loadMeta() {
    if (!live()) return; if (loading) return loading;
    loading = (async () => {
      try {
        const r = await api('user_meta', { mode: isAdmin() ? 'all' : 'mine' });
        META = r.meta || {}; PH = {};
        Object.keys(META).forEach(k => { if (META[k].photo) PH[lc(k)] = META[k].photo; });
        savePH(); loadedFor = S.user.username; rescan();
      } catch (e) {} finally { loading = null; }
    })();
    return loading;
  }
  window.__hrLoadMeta = loadMeta;
  setInterval(() => {
    if (!live()) { if (loadedFor) { loadedFor = ''; META = {}; PH = {}; try { localStorage.removeItem(LS); } catch (e) {} } return; }
    if (loadedFor !== S.user.username && !loading) loadMeta();
  }, 1000);

  /* --- photo → small square JPEG (fits comfortably in one sheet cell) --- */
  async function toSquareJpeg(file, px = 144) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = px;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, px, px); URL.revokeObjectURL(url);
    let q = .85, d = c.toDataURL('image/jpeg', q); while (d.length > 36000 && q > .4) { q -= .1; d = c.toDataURL('image/jpeg', q); }
    return d;
  }

  /* --- inject photo + email into the existing "edit user" sheet --- */
  function decorateUserForm(username) {
    const nameInp = document.querySelector('#u_name'), save = document.querySelector('[data-u="save"]');
    if (!nameInp || !save || document.getElementById('pf_file')) return;
    const m = getMeta(username) || {}; let photo;   // undefined = keep · '' = remove · data-URL = new
    save.insertAdjacentHTML('beforebegin', `<div class="fld"><label class="lab">🖼️ ${esc(X('Employee photo', 'صورة الموظف'))}</label>
      <div class="pf-row"><div class="pf-prev" id="pf_prev"></div><div class="pf-btns"><button type="button" class="btn" id="pf_pick">${esc(X('Choose photo', 'اختيار صورة'))}</button><button type="button" class="btn ghost" id="pf_del">${esc(X('Remove', 'إزالة'))}</button><input type="file" id="pf_file" accept="image/*" hidden></div></div></div>
      <div class="fld"><label class="lab">✉️ ${esc(X('Email', 'البريد الإلكتروني'))}</label><input class="inp" id="u_email" type="email" dir="ltr" placeholder="name@company.com" value="${esc(m.email || '')}"></div>
      <button type="button" class="btn" id="pf_mail" style="width:100%;margin-bottom:10px">✉️ ${esc(X('Send an email to this user', 'إرسال ميل لهذا المستخدم'))}</button>`);
    const prev = document.getElementById('pf_prev');
    const paint = () => { const src = photo === undefined ? PH[lc(username)] : photo; prev.innerHTML = src ? `<img src="${src}" alt="">` : (_UA ? _UA(nameInp.value || username || '?', 64) : ''); };
    paint(); nameInp.addEventListener('input', () => { if (!photo && !PH[lc(username)]) paint(); });
    document.getElementById('pf_pick').onclick = () => document.getElementById('pf_file').click();
    document.getElementById('pf_file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { photo = await toSquareJpeg(f); paint(); } catch (er) { toast(X('Could not read this image', 'تعذّر قراءة الصورة'), 'err'); } };
    document.getElementById('pf_del').onclick = () => { photo = ''; paint(); };
    document.getElementById('pf_mail').onclick = () => {
      if (!username) return toast(X('Save the user first', 'احفظ المستخدم أولاً'), 'err');
      if (lc(document.getElementById('u_email').value.trim()) !== lc(m.email || '')) return toast(X('Save the email first, then send', 'احفظ الميل أولاً ثم أرسل'), 'err');
      openMail(username);
    };
    save.addEventListener('click', () => { pendingMeta = { username: nameInp.value.trim(), email: document.getElementById('u_email').value.trim(), photo }; }, true);
  }
  if (typeof openUserForm === 'function') {
    const _ouf = openUserForm;
    openUserForm = function (u) { const r = _ouf.apply(this, arguments); try { decorateUserForm(u); } catch (e) { console.warn(e); } return r; };
  }
  /* after the user itself is saved successfully, store email/photo (kept separate so login/permissions are untouched) */
  const _api = api;
  api = async function (action, payload, opts) {
    const r = await _api(action, payload, opts);
    if (action === 'admin_saveUser' && pendingMeta && payload && lc(payload.username) === lc(pendingMeta.username)) {
      const pm = pendingMeta; pendingMeta = null;
      if (pm.photo !== undefined || lc(pm.email) !== lc((getMeta(pm.username) || {}).email || '')) {
        try {
          await _api('user_meta', { mode: 'save', username: pm.username, email: pm.email, photo: pm.photo });
          const cur = getMeta(pm.username) || {}; const key = Object.keys(META).find(x => lc(x) === lc(pm.username)) || pm.username;
          META[key] = { email: pm.email, photo: pm.photo === undefined ? (cur.photo || '') : pm.photo };
          if (META[key].photo) PH[lc(key)] = META[key].photo; else delete PH[lc(key)];
          savePH(); rescan();
        } catch (e) { toast(e.message || 'Error', 'err'); }
      }
    }
    return r;
  };

  /* --- the luxury composer --- */
  function openMail(username, nm) {
    const m = getMeta(username);
    if (!m || !m.email) return toast(X('Add an email for this user first (Users → Edit)', 'أضف ميل لهذا المستخدم أولاً من (المستخدمون ← تعديل)'), 'err');
    const us = ((S._adm && S._adm.users) || []).find(x => lc(x.username) === lc(username)), name = (us && us.name) || nm || username;
    const withMail = Object.keys(META).filter(k => META[k].email).length;
    const KS = [['info', '📢', X('Announcement', 'إعلان'), '#5cc8ff'], ['warn', '⚠️', X('Important', 'تنبيه مهم'), '#fbbf24'], ['action', '✅', X('Action required', 'مطلوب إجراء'), '#34d399'], ['cheer', '🎉', X('Congrats', 'تهنئة'), '#a78bfa']];
    let kind = 'info', toAll = false, cta = true;
    const o = openSheet(`<div class="hd"><h3>${esc(X('Send email', 'إرسال ميل'))}</h3><button class="btn icon ghost" data-ml="x">${ic('x')}</button></div>
      <div class="ml-hero"><div class="ml-ic">✉️</div><div><h3 style="font-size:16px">${esc(X('A premium message from the app', 'رسالة فاخرة من التطبيق'))}</h3><small>${esc(X('Delivered with a designed email template', 'تصلهم بقالب ميل مصمّم'))}</small></div></div>
      <div class="ml-to">${window.UserAvatar(username, 38)}<div style="min-width:0"><b>${esc(name)}</b><small>${esc(m.email)}</small></div></div>
      <div class="fld"><div class="chips" id="ml_to"><button type="button" class="chip on" data-ml="to" data-v="one">${esc(X('This user', 'هذا المستخدم'))}</button><button type="button" class="chip" data-ml="to" data-v="all">📣 ${esc(X(`Everyone with an email (${withMail})`, `كل من له ميل (${withMail})`))}</button></div></div>
      <div class="fld"><label class="lab">${esc(X('Type', 'النوع'))}</label><div class="chips" id="ml_k">${KS.map((k, i) => `<button type="button" class="chip ${i ? '' : 'on'}" data-ml="kind" data-v="${k[0]}">${k[1]} ${esc(k[2])}</button>`).join('')}</div></div>
      <div class="fld"><label class="lab">${esc(X('Subject', 'الموضوع'))}</label><input class="inp" id="ml_s" maxlength="150" placeholder="${esc(X('e.g. Please update your documents', 'مثال: برجاء تحديث مستنداتك'))}"></div>
      <div class="fld"><label class="lab">${esc(X('Message', 'الرسالة'))}</label><textarea class="inp" id="ml_b" maxlength="5000" placeholder="${esc(X('Write your message…', 'اكتب رسالتك…'))}"></textarea></div>
      <div class="fld" style="display:flex;align-items:center;justify-content:space-between"><span class="lab" style="margin:0">${esc(X('Include “Open the app” button', 'إظهار زر «فتح التطبيق»'))}</span><div class="switch on" id="ml_c"></div></div>
      <div class="ml-prev"><div class="ml-bar"></div><div class="ml-pb"><span class="ml-pill" id="mp_k">📢 ${esc(KS[0][2])}</span><h4 id="mp_s">${esc(X('Subject', 'الموضوع'))}</h4><p id="mp_b">${esc(X('Your message preview…', 'معاينة رسالتك…'))}</p><span class="ml-cta" id="mp_c">${esc(X('Open the app →', 'فتح التطبيق ←'))}</span></div></div>
      <button class="btn primary" data-ml="send" style="width:100%">${esc(X('Send email', 'إرسال الميل'))} ✉️</button>`);
    const q = s => o.querySelector(s);
    const upd = () => { const k = KS.find(x => x[0] === kind); const pill = q('#mp_k'); pill.textContent = k[1] + ' ' + k[2]; pill.style.setProperty('--pc', k[3]);
      q('#mp_s').textContent = q('#ml_s').value || X('Subject', 'الموضوع'); q('#mp_b').textContent = q('#ml_b').value || X('Your message preview…', 'معاينة رسالتك…'); q('#mp_c').style.display = cta ? '' : 'none'; };
    q('#ml_s').addEventListener('input', upd); q('#ml_b').addEventListener('input', upd);
    o.addEventListener('click', async e => {
      if (e.target.closest('#ml_c')) { cta = !cta; q('#ml_c').classList.toggle('on', cta); upd(); return; }
      const b = e.target.closest('[data-ml]'); if (!b) return;
      if (b.dataset.ml === 'x') return closeSheet();
      if (b.dataset.ml === 'kind') { kind = b.dataset.v; o.querySelectorAll('#ml_k .chip').forEach(c => c.classList.toggle('on', c === b)); upd(); return; }
      if (b.dataset.ml === 'to') { toAll = b.dataset.v === 'all'; o.querySelectorAll('#ml_to .chip').forEach(c => c.classList.toggle('on', c === b)); return; }
      if (b.dataset.ml === 'send') {
        const subject = q('#ml_s').value.trim(), body = q('#ml_b').value.trim();
        if (!subject || !body) return toast(X('Write a subject and a message', 'اكتب الموضوع والرسالة'), 'err');
        b.disabled = true;
        try {
          const r = await api('user_meta', { mode: 'mail', to: toAll ? 'all' : [username], subject, body, kind, link: cta ? location.href.split('#')[0] : '' });
          toast(X(`Sent to ${r.sent}`, `تم الإرسال إلى ${r.sent}`) + (r.skipped && r.skipped.length ? ` · ${X('skipped', 'تخطّي')} ${r.skipped.length}` : ''), 'ok'); closeSheet();
        } catch (er) { b.disabled = false; toast(er.code === 'quota' ? er.message : (er.message || 'Error'), 'err'); }
      }
    });
    upd();
  }
  window.__hrMail = openMail;
})();
