'use strict';
/* ai.patch.js — floating AI assistant + usage limit + admin usage panel. Load AFTER app.patch.js. Backend action: "ai_ask" (key stays server-side). */
(function () {
const X = (en, ar) => S.lang === 'ar' ? ar : en;
const live = () => !!(S.user && S.token);
const isAdmin = () => !!(S.user && S.user.role === 'admin');
const hist = []; let busy = false;
const st = document.createElement('style');
st.textContent = `
#aifab{position:fixed;z-index:80;right:16px;left:auto;bottom:calc(86px + env(safe-area-inset-bottom));width:58px;height:58px;border-radius:20px;border:0;cursor:pointer;color:#fff;font-size:24px;background:linear-gradient(135deg,#38bdf8,#7c3aed);box-shadow:0 14px 30px -8px rgba(124,58,237,.7),0 0 0 1px rgba(255,255,255,.22) inset,0 -6px 14px -6px rgba(255,255,255,.35) inset;transition:transform .15s,box-shadow .2s}
#aifab::after{content:"";position:absolute;inset:-5px;border-radius:24px;border:2px solid rgba(124,58,237,.45);animation:aipulse 2.4s ease-out infinite;pointer-events:none}
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
.topbar .btn.icon:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 12px 24px -10px rgba(56,189,248,.65),0 1px 0 rgba(255,255,255,.2) inset}
.topbar .btn.icon:hover .ic{transform:scale(1.12) rotate(-6deg)}
.topbar .btn.icon:active{transform:scale(.9)}
[data-theme=light] .topbar .btn.icon{box-shadow:0 6px 14px -8px rgba(15,23,42,.3),0 1px 0 #fff inset}
@media(max-width:420px){.topbar .btn.icon{width:36px;height:36px;border-radius:12px}}
.btn.primary{box-shadow:0 10px 24px -8px rgba(124,58,237,.6),0 1px 0 rgba(255,255,255,.3) inset;transition:transform .15s,box-shadow .2s,filter .2s}
.btn.primary:hover{transform:translateY(-2px);filter:brightness(1.08)}
.btn:not(.icon):not(.primary):not(.danger):hover{transform:translateY(-1px);box-shadow:0 8px 18px -10px rgba(56,189,248,.6)}
#fab{border-radius:22px;background:linear-gradient(135deg,#38bdf8,#7c3aed)!important;box-shadow:0 16px 32px -8px rgba(56,189,248,.6),0 0 0 1px rgba(255,255,255,.22) inset,0 -8px 16px -8px rgba(255,255,255,.35) inset!important;transition:transform .18s,box-shadow .2s}
#fab:hover{transform:translateY(-3px) scale(1.05)}
.pill{box-shadow:0 4px 12px -6px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.12) inset;backdrop-filter:blur(8px)}`;
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
    const r = await api('ai_ask', { mode: 'admin_get' });
    const fmt = ms => ms ? new Date(ms).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—';
    a.innerHTML = `<label>${esc(X('Default daily limit per user (0 = unlimited)', 'الحد اليومي الافتراضي لكل مستخدم (0 = بدون حد)'))}</label><input type="number" min="0" id="aidef" value="${+r.def}">
      <div class="ai-tw"><table><thead><tr><th>${esc(X('User', 'المستخدم'))}</th><th>${esc(X('Today', 'اليوم'))}</th><th>${esc(X('Total', 'الإجمالي'))}</th><th>${esc(X('Last use', 'آخر استخدام'))}</th><th>${esc(X('Custom limit', 'حد خاص'))}</th></tr></thead><tbody>${
        r.users.map(u => `<tr><td><b>${esc(u.name || u.username)}</b><br><small style="color:var(--muted)">${esc(u.username)}</small></td><td>${u.today}</td><td>${u.total}</td><td>${esc(fmt(u.last))}</td><td><input type="number" min="0" data-u="${esc(u.username)}" placeholder="${+r.def}" value="${u.limit == null ? '' : +u.limit}"></td></tr>`).join('')
      }</tbody></table></div><button type="button" class="ai-save">${esc(X('Save', 'حفظ'))}</button>`;
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
    if (typeof ACTIONS !== 'undefined') ['ai_ask', 'ai_settings'].forEach(a => { if (!ACTIONS.includes(a)) ACTIONS.push(a); });
    Object.assign(I18N.en, { a_ai_ask: 'AI question', a_ai_settings: 'AI limits changed' });
    Object.assign(I18N.ar, { a_ai_ask: 'سؤال للمساعد الذكي', a_ai_settings: 'تعديل حدود المساعد الذكي' });
    if (typeof AUD !== 'undefined') { AUD.ai_ask = ['✨', 'var(--accent2)']; AUD.ai_settings = ['⚙️', 'var(--accent)']; }
    if (typeof AUD_QUICK !== 'undefined' && !AUD_QUICK.some(x => x[0] === 'ai_ask')) AUD_QUICK.push(['ai_ask', '✨']);
    if (typeof audBody === 'function') {
      const orig = audBody;
      audBody = function (a, d, sc) {
        const A = String(a.action), ar = S.lang === 'ar';
        if (A === 'ai_ask') return `<div class="aud-body"><div style="line-height:1.7;word-break:break-word">💬 ${esc((d && d.q) || '')}${d && d.blocked ? ` <b style="color:var(--err)">⛔ ${ar ? 'تجاوز الحد اليومي' : 'daily limit reached'}</b>` : (d && d.limit > 0 ? ` <small style="color:var(--muted)">(${d.used}/${d.limit})</small>` : '')}</div></div>`;
        if (A === 'ai_settings') return `<div class="aud-body"><div>⚙️ ${ar ? 'الحد الافتراضي' : 'Default limit'}: <b>${esc(d && d.def)}</b> · ${ar ? 'حدود خاصة' : 'custom limits'}: <b>${esc(d && d.custom)}</b></div></div>`;
        return orig(a, d, sc);
      };
    }
  } catch (e) { console.warn(e); }
})();
