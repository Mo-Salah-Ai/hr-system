'use strict';
/* ai.patch.js — floating AI assistant. Load AFTER app.patch.js. Calls backend action "ai_ask" (key stays server-side). */
(function () {
const X = (en, ar) => S.lang === 'ar' ? ar : en;
const live = () => !!(S.user && S.token);
const hist = []; let busy = false;
const st = document.createElement('style');
st.textContent = `
#aifab{position:fixed;z-index:80;inset-inline-end:16px;bottom:calc(84px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;color:#06121f;font-size:22px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:var(--glow),var(--shadow)}
#aip{position:fixed;z-index:95;inset-inline-end:0;bottom:0;width:100%;max-width:440px;height:min(78dvh,640px);display:none;flex-direction:column;border-radius:24px 24px 0 0;background:var(--bg2);border:1px solid var(--border);box-shadow:var(--shadow)}
#aip.open{display:flex;animation:rise .2s both}
@media(min-width:640px){#aip{inset-inline-end:16px;bottom:16px;border-radius:24px}}
.ai-h{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border);font-weight:800}
.ai-h button{margin-inline-start:auto;border:0;background:none;color:var(--muted);cursor:pointer;font-size:18px}
.ai-b{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.ai-m{max-width:88%;padding:10px 13px;border-radius:16px;line-height:1.6;font-size:14px;white-space:pre-wrap;word-break:break-word}
.ai-m.u{align-self:flex-end;background:var(--accent);color:#06121f}.ai-m.a{align-self:flex-start;background:var(--surface2);color:var(--text)}
.ai-s{display:flex;flex-wrap:wrap;gap:6px}.ai-s button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;padding:6px 10px;font-size:12.5px;cursor:pointer}
.ai-f{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border)}
.ai-f input{flex:1;min-width:0;padding:11px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);outline:0;font:inherit}
.ai-f button{border:0;border-radius:14px;padding:0 16px;font-weight:800;cursor:pointer;background:var(--accent);color:#06121f}.ai-f button:disabled{opacity:.5}`;
document.head.appendChild(st);

const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[\*\-] /gm, '• ');
function add(role, text) { const b = document.querySelector('#aip .ai-b'); const d = document.createElement('div'); d.className = 'ai-m ' + (role === 'u' ? 'u' : 'a'); d.innerHTML = md(text); b.appendChild(d); b.scrollTop = b.scrollHeight; return d; }
async function ask(q) {
  q = (q || '').trim(); if (!q || busy) return;
  const inp = document.querySelector('#aip input'), btn = document.querySelector('#aip .ai-f button');
  busy = true; btn.disabled = true; inp.value = ''; document.querySelector('#aip .ai-s')?.remove();
  add('u', q); const w = add('a', X('Thinking…', 'جارِ التفكير…'));
  try {
    const r = await api('ai_ask', { q, history: hist.slice(-6) });
    w.innerHTML = md(r.answer); hist.push({ role: 'user', text: q }, { role: 'ai', text: r.answer });
  } catch (e) {
    const m = { ai_not_configured: X('AI key is not configured on the server.', 'مفتاح الذكاء الاصطناعي غير مُعدّ في الخادم.'), rate_limited: X('Too many questions — wait a minute.', 'أسئلة كثيرة — انتظر دقيقة.'), network: X('You are offline.', 'أنت غير متصل.') }[e.code] || e.message;
    w.innerHTML = md('⚠️ ' + m);
  }
  busy = false; btn.disabled = false; inp.focus(); document.querySelector('#aip .ai-b').scrollTop = 1e9;
}
function build() {
  const p = document.createElement('div'); p.id = 'aip';
  p.innerHTML = `<div class="ai-h">✨ ${esc(X('Smart assistant', 'المساعد الذكي'))}<button type="button" aria-label="close">✕</button></div><div class="ai-b"></div><div class="ai-f"><input placeholder="${esc(X('Ask about your data…', 'اسأل عن بيانات النظام…'))}"><button type="button">${esc(X('Send', 'إرسال'))}</button></div>`;
  document.body.appendChild(p);
  p.querySelector('.ai-h button').onclick = () => p.classList.remove('open');
  p.querySelector('.ai-f button').onclick = () => ask(p.querySelector('input').value);
  p.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') ask(e.target.value); });
  add('a', X('Hi! Ask me about candidates, clients, revenue, resignations or hires.', 'أهلاً! اسألني عن المرشحين، العملاء، الإيرادات، الاستقالات أو التعيينات.'));
  const s = document.createElement('div'); s.className = 'ai-s';
  [X('How many records per tab?', 'كم عدد السجلات في كل تبويب؟'), X('Summarize the latest activity', 'لخّص آخر النشاطات'), X('Top client by requests?', 'من العميل الأكثر طلباً؟')].forEach(q => { const b = document.createElement('button'); b.textContent = q; b.onclick = () => ask(q); s.appendChild(b); });
  p.querySelector('.ai-b').appendChild(s);
}
setInterval(() => {
  const fab = document.getElementById('aifab');
  if (!live()) { fab?.remove(); document.getElementById('aip')?.remove(); hist.length = 0; return; }
  if (!fab) { const b = document.createElement('button'); b.id = 'aifab'; b.type = 'button'; b.textContent = '✨'; b.title = X('Smart assistant', 'المساعد الذكي'); b.onclick = () => { if (!document.getElementById('aip')) build(); document.getElementById('aip').classList.toggle('open'); }; document.body.appendChild(b); }
}, 700);
})();
