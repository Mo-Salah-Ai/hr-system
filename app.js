/* ============================================================
 * Nexus HR · Operations ERP — Frontend (app.js)
 * Mobile-first, offline-first SPA. Requires: index.html
 * ============================================================ */
'use strict';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwRyCxkctVn_hPEjbMJlsQoj9FNbkQzQV2OQUbedn7ps1-RVhoXbXJ7LME_Np1HoKzl/exec'; // /exec URL
const APP_NAME = { en:'Nexus HR', ar:'نكسس للموارد البشرية' };

/* ---------------- i18n ---------------- */
const T = {
  en:{ login:'Sign in', username:'Username', password:'Password', welcome:'Welcome back 👋',
       loginBtn:'Login', wrongCreds:'Wrong credentials', locked:'Too many attempts. Try again in',
       seconds:'s', synced:'Synced', offline:'Offline', pending:'pending', online:'online',
       lastSeen:'Last seen', onlineSince:'Online since', save:'Send ➤', saving:'Sending…',
       search:'Search…', edit:'Edit', del:'Delete', confirmDel:'Delete this record?',
       yes:'Delete', no:'Cancel', saved:'✅ Sent successfully', deleted:'🗑️ Deleted',
       queued:'📴 Saved offline — will sync', admin:'Admin Console', users:'Users',
       audit:'Audit Logs', presence:'Live Presence', addUser:'Add User', addTab:'New Tab',
       tabName:'Tab name (EN)', tabNameAr:'Tab name (AR)', fields:'Fields (field:type:label, comma sep)',
       create:'Create', fileHint:'Tap or drop a file', uploading:'Uploading', noRecords:'No records yet — tap ＋',
       logout:'Signed out', formTitle:'New entry', editTitle:'Edit entry', role:'Role',
       allowedTabs:'Allowed tabs', active:'Active', pass:'Password (blank = keep)', isAdmin:'Admin',
       close:'Close', filterUser:'Filter by user', filterTab:'Filter by tab', minutesAgo:'min ago' },
  ar:{ login:'تسجيل الدخول', username:'اسم المستخدم', password:'كلمة المرور', welcome:'أهلاً بعودتك 👋',
       loginBtn:'دخول', wrongCreds:'بيانات غير صحيحة', locked:'محاولات كثيرة. حاول بعد',
       seconds:'ث', synced:'متزامن', offline:'بدون اتصال', pending:'معلّق', online:'متصل',
       lastSeen:'آخر ظهور', onlineSince:'متصل منذ', save:'إرسال ➤', saving:'جارٍ الإرسال…',
       search:'بحث…', edit:'تعديل', del:'حذف', confirmDel:'حذف هذا السجل؟',
       yes:'حذف', no:'إلغاء', saved:'✅ تم الإرسال بنجاح', deleted:'🗑️ تم الحذف',
       queued:'📴 حُفظ محلياً — سيُزامَن', admin:'لوحة التحكم', users:'المستخدمون',
       audit:'سجل العمليات', presence:'الحضور المباشر', addUser:'إضافة مستخدم', addTab:'تبويب جديد',
       tabName:'اسم التبويب (EN)', tabNameAr:'اسم التبويب (AR)', fields:'الحقول (field:type:label)',
       create:'إنشاء', fileHint:'اضغط أو أسقط ملفاً', uploading:'جارٍ الرفع', noRecords:'لا سجلات بعد — اضغط ＋',
       logout:'تم تسجيل الخروج', formTitle:'إدخال جديد', editTitle:'تعديل الإدخال', role:'الدور',
       allowedTabs:'التبويبات المسموحة', active:'نشط', pass:'كلمة المرور (فارغ = بدون تغيير)', isAdmin:'مدير',
       close:'إغلاق', filterUser:'تصفية بالمستخدم', filterTab:'تصفية بالتبويب', minutesAgo:'دقيقة' }
};
let lang = localStorage.getItem('lang') || 'en';
const t = k => (T[lang] && T[lang][k]) || T.en[k] || k;

/* ---------------- state ---------------- */
const S = { token:null, user:null, tabs:[], schema:{}, records:{},
            activeTab:null, editingId:null, online:navigator.onLine };
try{ const saved = JSON.parse(localStorage.getItem('session')||'null');
  if(saved){ S.token=saved.token; S.user=saved.user; S.tabs=saved.tabs; S.schema=saved.schema; } }catch(e){}

/* ---------------- IndexedDB offline store ---------------- */
const DB = { h:null,
  open(){ return new Promise((res,rej)=>{
    const r = indexedDB.open('nexus-erp',1);
    r.onupgradeneeded = e=>{ const d=e.target.result;
      d.createObjectStore('outbox',{keyPath:'clientOpId'});
      d.createObjectStore('cache',{keyPath:'key'}); };
    r.onsuccess = e=>{ DB.h=e.target.result; res(); }; r.onerror=rej; }); },
  put(store,val){ return new Promise((res,rej)=>{ const tx=DB.h.transaction(store,'readwrite');
    tx.objectStore(store).put(val); tx.oncomplete=res; tx.onerror=rej; }); },
  all(store){ return new Promise((res,rej)=>{ const r=DB.h.transaction(store).objectStore(store).getAll();
    r.onsuccess=()=>res(r.result||[]); r.onerror=rej; }); },
  del(store,key){ return new Promise((res,rej)=>{ const tx=DB.h.transaction(store,'readwrite');
    tx.objectStore(store).delete(key); tx.oncomplete=res; tx.onerror=rej; }); },
  clear(store){ return new Promise((res,rej)=>{ const tx=DB.h.transaction(store,'readwrite');
    tx.objectStore(store).clear(); tx.oncomplete=res; tx.onerror=rej; }); }
};

/* ---------------- toasts ---------------- */
function toast(msg, type='ok'){
  const colors = { ok:'border-emerald-400/40 text-emerald-300',
    warn:'border-amber-400/40 text-amber-300', err:'border-rose-400/40 text-rose-300' };
  const el = document.createElement('div');
  el.className = `toast pointer-events-auto glass ${colors[type]} px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-card max-w-xs text-center`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),320); }, 2800);
}

/* ---------------- sync indicator ---------------- */
function setSync(mode, count=0){
  const dot=document.getElementById('syncDot'), txt=document.getElementById('syncText');
  dot.className = 'w-2 h-2 rounded-full ' + (mode==='ok'?'bg-emerald-400 sync-ok':mode==='warn'?'bg-amber-400':'bg-rose-400 animate-pulse');
  txt.textContent = mode==='ok' ? t('synced') : `${t('offline')} · ${count} ${t('pending')}`;
}
async function refreshSyncBadge(){
  if(!DB.h) return;
  const q = await DB.all('outbox');
  setSync(S.online ? (q.length?'warn':'ok') : 'err', q.length);
  if(q.length) document.getElementById('syncDot').className='w-2 h-2 rounded-full bg-amber-400';
}

/* ---------------- API client with offline outbox ---------------- */
async function api(action, params={}, method='GET', body=null){
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  if(S.token) url.searchParams.set('token', S.token);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k, typeof v==='string'?v:JSON.stringify(v)));
  const res = await fetch(url, method==='POST'
    ? { method:'POST', headers:{'Content-Type':'text/plain'}, body: JSON.stringify({token:S.token, action, ...body}) }
    : {});
  return res.json();
}
async function post(action, body){ return api(action,{},'POST',body); }

async function queueOp(op){
  op.clientOpId = op.clientOpId || (Date.now()+'_'+Math.random().toString(36).slice(2,7));
  op.ts = Date.now();
  await DB.put('outbox', op);
  await refreshSyncBadge();
  toast(t('queued'),'warn');
}
async function flushQueue(){
  if(!S.online || !S.token) return;
  const q = (await DB.all('outbox')).sort((a,b)=>a.ts-b.ts);
  if(!q.length) return;
  setSync('warn', q.length);
  try{
    const r = await post('syncQueue', { queue: q.map(({clientOpId,type,tabId,recordId,data})=>({clientOpId,type,tabId,recordId,data})) });
    if(r.ok){
      for(const res of r.results){
        await DB.del('outbox', res.clientOpId);
        if(!res.ok) console.warn('sync failed op', res);
      }
      toast('🔄 '+t('synced'),'ok');
      if(S.activeTab) loadRecords(S.activeTab, true);
      if(document.getElementById('adminView')?.dataset.open) renderAdmin();
    }
  }catch(e){}
  await refreshSyncBadge();
}

/* ---------------- network watcher ---------------- */
window.addEventListener('online', ()=>{ S.online=true; toast('🌐 Online','ok'); flushQueue(); refreshSyncBadge(); });
window.addEventListener('offline',()=>{ S.online=false; setSync('err'); toast('📴 Offline mode','err'); });

/* ---------------- UI helpers ---------------- */
const $ = s=>document.querySelector(s);
function openSheet(title, html){
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.add('open'); $('#sheetBackdrop').classList.add('open');
  gsap.fromTo('#sheetBody > *',{y:18,opacity:0},{y:0,opacity:1,stagger:.05,duration:.35,ease:'back.out(1.6)'});
}
function closeSheet(){ $('#sheet').classList.remove('open'); $('#sheetBackdrop').classList.remove('open'); }
function openModal(html){ $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal(){ $('#modal').classList.remove('open'); }
$('#sheetClose').onclick = closeSheet;
$('#sheetBackdrop').onclick = closeSheet;
$('#modal').onclick = e=>{ if(e.target.id==='modal') closeModal(); };

function fieldLabel(f){ return lang==='ar' ? (f.label_ar||f.label_en) : (f.label_en||f.label_ar); }

/* ---------------- login view ---------------- */
function renderLogin(){
  $('#bottomNav').classList.add('hidden'); $('#fab').classList.add('hidden');
  $('#fab').classList.remove('flex'); $('#userGreet').textContent='';
  $('#main').innerHTML = `
    <div class="min-h-[75vh] flex flex-col justify-center fade-in">
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow mb-4">
          <span class="text-white font-extrabold text-3xl">N</span></div>
        <h2 class="text-2xl font-extrabold">${APP_NAME[lang]}</h2>
        <p class="text-sm opacity-60 mt-1">${t('welcome')}</p>
      </div>
      <div class="glass rounded-3xl p-6 space-y-4">
        <input id="liUser" placeholder="${t('username')}" autocomplete="username"
          class="w-full glass rounded-2xl px-4 py-3.5 text-sm bg-transparent placeholder:opacity-50">
        <input id="liPass" type="password" placeholder="${t('password')}" autocomplete="current-password"
          class="w-full glass rounded-2xl px-4 py-3.5 text-sm bg-transparent placeholder:opacity-50">
        <button id="liBtn" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold shadow-glow active:scale-[.98] transition">${t('loginBtn')}</button>
        <p id="liErr" class="text-center text-xs text-rose-400 font-semibold min-h-[1rem]"></p>
      </div>
    </div>`;
  const go = async ()=>{
    const btn=$('#liBtn'); btn.disabled=true; btn.textContent='…';
    $('#liErr').textContent='';
    try{
      const r = await api('login',{},'POST',{action:'login',username:$('#liUser').value.trim(),password:$('#liPass').value});
      if(r.ok){
        S.token=r.token; S.user=r.user; S.tabs=r.tabs; S.schema=r.schema;
        localStorage.setItem('session', JSON.stringify({token:r.token,user:r.user,tabs:r.tabs,schema:r.schema}));
        toast(`👋 ${r.user.displayName}`);
        renderApp();
      } else {
        const err = r.error==='LOCKED' ? `${t('locked')} ${r.retryAfterSec}${t('seconds')}`
          : r.error==='DISABLED' ? '⛔' : `${t('wrongCreds')} · ${r.remaining??''}`;
        $('#liErr').textContent = err;
        gsap.fromTo('#liBtn',{x:-8},{x:0,duration:.4,ease:'elastic.out(1,.3)'});
      }
    }catch(e){ $('#liErr').textContent='⚠️ network'; }
    btn.disabled=false; btn.textContent=t('loginBtn');
  };
  $('#liBtn').onclick = go;
  $('#liPass').onkeydown = e=>{ if(e.key==='Enter') go(); };
}

/* ---------------- app shell ---------------- */
function renderApp(){
  $('#appTitle').textContent = APP_NAME[lang];
  $('#userGreet').textContent = S.user.displayName;
  $('#adminBtn').classList.toggle('hidden', !S.user.isAdmin);
  $('#adminBtn').classList.toggle('flex', S.user.isAdmin);
  $('#bottomNav').classList.remove('hidden');
  const fab=$('#fab'); fab.classList.remove('hidden'); fab.classList.add('flex');
  renderNav();
  if(S.tabs.length) switchTab(S.activeTab && S.tabs.some(x=>x.tabId===S.activeTab) ? S.activeTab : S.tabs[0].tabId);
  else $('#main').innerHTML = `<p class="text-center opacity-50 mt-20">No tabs assigned</p>`;
  startHeartbeat();
}
function renderNav(){
  $('#navTabs').innerHTML = S.tabs.map(tab=>`
    <button data-tab="${tab.tabId}" class="navBtn flex-none flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap">
      <span>${tab.icon||'📋'}</span><span>${lang==='ar'?tab.label_ar:tab.label_en}</span>
    </button>`).join('');
  document.querySelectorAll('.navBtn').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
}
function switchTab(tabId){
  S.activeTab = tabId;
  document.querySelectorAll('.navBtn').forEach(b=>{
    const on = b.dataset.tab===tabId;
    b.className = `navBtn flex-none flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
      on ? 'bg-gradient-to-r from-cyan-400/30 to-blue-500/30 border border-cyan-400/40 text-cyan-300 shadow-glow'
         : 'glass opacity-60'}`;
  });
  loadRecords(tabId);
}

/* ---------------- records (chat-feed style) ---------------- */
async function loadRecords(tabId, silent=false){
  const tab = S.tabs.find(x=>x.tabId===tabId);
  if(!silent){
    $('#main').innerHTML = Array(4).fill(`<div class="skel h-24 rounded-3xl mb-3"></div>`).join('');
  }
  if(!S.online){
    const c = await DB.all('cache');
    const hit = c.find(x=>x.key==='rec_'+tabId);
    S.records[tabId] = hit? hit.records : [];
    renderRecords(tabId); return;
  }
  try{
    const r = await api('records',{tabId});
    if(!r.ok) throw 0;
    S.records[tabId]=r.records;
    DB.put('cache',{key:'rec_'+tabId, records:r.records, ts:Date.now()});
  }catch(e){
    const c = await DB.all('cache');
    const hit = c.find(x=>x.key==='rec_'+tabId);
    S.records[tabId] = hit? hit.records : [];
  }
  renderRecords(tabId);
}

function renderRecords(tabId){
  const fields = (S.schema[tabId]||[]).filter(f=>f.visible);
  const recs = S.records[tabId]||[];
  const titleField = fields[0]?.field;
  const html = `
    <div class="relative mb-3">
      <input id="searchBox" placeholder="${t('search')}" class="w-full glass rounded-2xl ps-10 pe-4 py-3 text-sm bg-transparent placeholder:opacity-50">
      <span class="absolute start-3.5 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
    </div>
    <div id="feed" class="space-y-2.5"></div>`;
  $('#main').innerHTML = html;
  gsap.fromTo('#main > *',{y:14,opacity:0},{y:0,opacity:1,stagger:.06,duration:.35,ease:'power2.out'});
  const draw = q=>{
    const list = recs.filter(r=>!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
    $('#feed').innerHTML = list.length ? list.map((r,i)=>cardHtml(r,fields,titleField,i)).join('')
      : `<p class="text-center opacity-40 text-sm py-16">${t('noRecords')}</p>`;
    bindCards(tabId);
  };
  draw('');
  $('#searchBox').oninput = e=>draw(e.target.value);
}

function cardHtml(r, fields, titleField, i){
  const rows = fields.filter(f=>f.field!==titleField && r[f.field]!=='' && r[f.field]!==undefined)
    .map(f=>`<div class="flex justify-between gap-3 text-xs py-1 border-b border-white/5 last:border-0">
      <span class="opacity-50">${fieldLabel(f)}</span>
      <span class="font-semibold text-end break-all">${formatVal(r[f.field],f)}</span></div>`).join('');
  return `<div class="bubble bubble-tail glass p-4 card-lift cursor-pointer" data-id="${r.recordId}" style="animation:toastIn .3s ${i*0.05}s both">
    <div class="flex items-center justify-between mb-1.5">
      <h3 class="font-bold text-sm text-cyan-300">${escapeHtml(r[titleField]||r.recordId)}</h3>
      <span class="text-[10px] opacity-40">${(r.recordId||'').slice(0,6)}</span>
    </div>${rows}</div>`;
}
function formatVal(v,f){
  if(f.type==='file' && v) return `<a href="${v}" target="_blank" class="text-cyan-400 underline">📎 ${t('fileHint').split(' ')[0]||'file'}</a>`;
  if(v===true||v==='TRUE') return '✅'; if(v===false||v==='FALSE') return '—';
  return escapeHtml(String(v));
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function bindCards(tabId){
  document.querySelectorAll('#feed [data-id]').forEach(el=>{
    el.onclick = ()=>{
      const rec = S.records[tabId].find(r=>r.recordId===el.dataset.id);
      openRecordSheet(tabId, rec);
    };
  });
}

/* ---------------- dynamic schema form (bottom-sheet) ---------------- */
function inputHtml(f, val){
  const v = val ?? '';
  const base = `data-field="${f.field}" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent placeholder:opacity-50"`;
  switch(f.type){
    case 'select':
      return `<select ${base}><option value="">—</option>${f.options.map(o=>
        `<option ${o==v?'selected':''}>${o}</option>`).join('')}</select>`;
    case 'boolean':
      return `<label class="flex items-center justify-between glass rounded-2xl px-4 py-3 text-sm cursor-pointer">
        <span>${fieldLabel(f)}</span><input type="checkbox" data-field="${f.field}" ${v==='TRUE'||v===true?'checked':''} class="w-5 h-5 accent-cyan-400"></label>`;
    case 'date':
      return `<input type="date" ${base} value="${String(v).slice(0,10)}">`;
    case 'number':
      return `<input type="number" step="any" inputmode="decimal" placeholder="${fieldLabel(f)}" ${base} value="${v}">`;
    case 'textarea':
      return `<textarea rows="3" placeholder="${fieldLabel(f)}" ${base}>${escapeHtml(v)}</textarea>`;
    case 'file':
      return `<div id="dz_${f.field}" class="glass rounded-2xl p-5 text-center cursor-pointer transition border-2 border-dashed" data-filefield="${f.field}">
        <input type="file" class="hidden" id="fi_${f.field}">
        <p class="text-xs opacity-60">${t('fileHint')}</p>
        <div class="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden hidden"><div class="h-full bg-gradient-to-r from-cyan-400 to-lime-400 transition-all" style="width:0%"></div></div>
        <p class="fileName text-[11px] text-cyan-400 mt-2 font-semibold">${v?'📎 '+escapeHtml(String(v).split('/').pop()):''}</p>
        <input type="hidden" data-field="${f.field}" value="${v}"></div>`;
    default:
      return `<input type="text" placeholder="${fieldLabel(f)}" ${base} value="${escapeHtml(v)}">`;
  }
}

function openRecordSheet(tabId, existing=null){
  const fields = (S.schema[tabId]||[]).filter(f=>f.visible);
  S.editingId = existing?.recordId || null;
  const html = fields.map(f=>{
    if(f.calc) return ''; // calculated server-side
    const inner = inputHtml(f, existing ? existing[f.field] : '');
    if(['boolean','file'].includes(f.type)) return inner;
    return `<div><label class="block text-[11px] font-bold opacity-60 mb-1.5">${fieldLabel(f)}${f.required?' *':''}</label>${inner}</div>`;
  }).join('') + `
    <div class="fixed bottom-0 inset-x-0 z-50 max-w-2xl mx-auto p-4 glass !rounded-none !border-x-0 !border-b-0" style="background:rgba(15,23,42,.85)">
      <button id="saveBtn" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold shadow-glow active:scale-[.98] transition">
        ${existing?t('editTitle').split(' ')[0]+' ➤':t('save')}</button></div>`;
  openSheet(existing ? t('editTitle') : t('formTitle'), html);
  bindFileUploads(tabId);
  $('#saveBtn').onclick = ()=>saveRecord(tabId);
}

function collectForm(tabId){
  const fields = S.schema[tabId]||[];
  const data = {};
  let valid = true;
  document.querySelectorAll('#sheetBody [data-field]').forEach(el=>{
    const f = fields.find(x=>x.field===el.dataset.field);
    if(!f) return;
    if(f.type==='boolean') data[f.field] = el.checked ? 'TRUE':'FALSE';
    else data[f.field] = el.value;
    if(f.required && !el.value && f.type!=='boolean' && f.type!=='file'){ valid=false; el.classList.add('!border-rose-400'); }
  });
  return valid ? data : null;
}

async function saveRecord(tabId){
  const data = collectForm(tabId);
  if(!data){ toast('⚠️','err'); return; }
  const btn=$('#saveBtn'); btn.disabled=true; btn.textContent=t('saving');
  const payload = { tabId, recordId:S.editingId, data };
  if(!S.online){ await queueOp({type:'save', ...payload}); closeSheet(); loadRecords(tabId,true); return; }
  try{
    const r = await post('saveRecord', payload);
    if(r.ok){ toast(t('saved')); closeSheet(); loadRecords(tabId,true); }
    else toast(r.error||'⚠️','err');
  }catch(e){ await queueOp({type:'save', ...payload}); closeSheet(); loadRecords(tabId,true); }
}

async function deleteRecord(tabId, recordId){
  openModal(`<p class="font-bold mb-5">${t('confirmDel')}</p>
    <div class="flex gap-3">
      <button id="mYes" class="flex-1 py-3 rounded-2xl bg-rose-500/80 text-white font-bold">${t('yes')}</button>
      <button id="mNo" class="flex-1 py-3 rounded-2xl glass font-bold">${t('no')}</button></div>`);
  $('#mNo').onclick = closeModal;
  $('#mYes').onclick = async ()=>{
    closeModal();
    if(!S.online){ await queueOp({type:'delete', tabId, recordId}); toast(t('deleted')); loadRecords(tabId,true); return; }
    const r = await post('deleteRecord',{tabId, recordId});
    toast(r.ok?t('deleted'):'⚠️', r.ok?'ok':'err');
    loadRecords(tabId,true);
  };
}

/* swipe-to-delete on cards */
function bindSwipe(el, tabId, recordId){
  let sx=0, dx=0;
  el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX; el.style.transition='none';},{passive:true});
  el.addEventListener('touchmove',e=>{dx=e.touches[0].clientX-sx; el.style.transform=`translateX(${dx}px)`;},{passive:true});
  el.addEventListener('touchend',()=>{
    el.style.transition='transform .25s';
    if(Math.abs(dx)>90){ el.style.transform=`translateX(${dx>0?120:-120}%)`; setTimeout(()=>deleteRecord(tabId,recordId),220); }
    else el.style.transform='';
    dx=0;
  });
}

/* ---------------- file upload with live progress ---------------- */
function bindFileUploads(tabId){
  document.querySelectorAll('[data-filefield]').forEach(dz=>{
    const field = dz.dataset.filefield, inp = dz.querySelector('input[type=file]');
    const bar = dz.querySelector('.h-full'), barWrap = bar.parentElement, nameEl = dz.querySelector('.fileName');
    const hidden = dz.querySelector('input[data-field]');
    dz.onclick = ()=>inp.click();
    dz.ondragover = e=>{ e.preventDefault(); dz.classList.add('drag'); };
    dz.ondragleave = ()=>dz.classList.remove('drag');
    dz.ondrop = e=>{ e.preventDefault(); dz.classList.remove('drag'); if(e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); };
    inp.onchange = ()=>inp.files[0] && handle(inp.files[0]);
    async function handle(file){
      if(file.size > 10*1024*1024){ toast('Max 10MB','err'); return; }
      nameEl.textContent = `⏳ ${file.name}`;
      barWrap.classList.remove('hidden');
      const fr = new FileReader();
      fr.onprogress = e=>{ if(e.lengthComputable) bar.style.width = Math.round(e.loaded/e.total*60)+'%'; };
      fr.onload = async ()=>{
        bar.style.width='75%';
        if(!S.online){ toast(t('queued'),'warn'); return; }
        try{
          const r = await post('upload',{tabId, filename:file.name, mimeType:file.type,
            base64: fr.result.split(',')[1]});
          if(r.ok){ bar.style.width='100%'; hidden.value=r.fileUrl;
            nameEl.innerHTML=`📎 <a class="text-cyan-400 underline" target="_blank" href="${r.fileUrl}">${escapeHtml(r.filename)}</a>`; }
          else toast('⚠️','err');
        }catch(e){ toast(t('queued'),'warn'); }
      };
      fr.readAsDataURL(file);
    }
  });
}

/* ---------------- admin dashboard ---------------- */
async function renderAdmin(){
  $('#main').innerHTML = `<div id="adminView" data-open="1">
    <div class="flex gap-2 mb-4">
      <button data-av="presence" class="avBtn glass px-4 py-2 rounded-2xl text-xs font-bold">🟢 ${t('presence')}</button>
      <button data-av="users" class="avBtn glass px-4 py-2 rounded-2xl text-xs font-bold">👥 ${t('users')}</button>
      <button data-av="audit" class="avBtn glass px-4 py-2 rounded-2xl text-xs font-bold">📜 ${t('audit')}</button>
      <button data-av="tab" class="avBtn glass px-4 py-2 rounded-2xl text-xs font-bold">➕ ${t('addTab')}</button>
    </div><div id="avBody"></div></div>`;
  document.querySelectorAll('.avBtn').forEach(b=>b.onclick=()=>avSwitch(b.dataset.av));
  avSwitch('presence');
}
async function avSwitch(v){
  document.querySelectorAll('.avBtn').forEach(b=>{
    const on=b.dataset.av===v;
    b.className=`avBtn px-4 py-2 rounded-2xl text-xs font-bold ${on?'bg-gradient-to-r from-cyan-400/30 to-blue-500/30 border border-cyan-400/40 text-cyan-300':'glass'}`;});
  const body=$('#avBody');
  if(v==='presence'){
    body.innerHTML='<div class="skel h-40 rounded-3xl"></div>';
    const r = await api('presence');
    body.innerHTML = r.ok ? `<div class="space-y-2">${r.users.map(u=>{
      const status = u.online
        ? `<span class="text-emerald-400 font-bold text-xs">🟢 ${t('onlineSince')} ${new Date(u.onlineSince).toTimeString().slice(0,5)}</span>`
        : `<span class="text-slate-400 text-xs">⚪ ${t('lastSeen')} ${u.lastSeenText}</span>`;
      return `<div class="glass rounded-2xl px-4 py-3 flex items-center justify-between bubble">
        <span class="font-bold text-sm">${escapeHtml(u.username)}</span>${status}</div>`;}).join('')}</div>`
      : '⚠️';
  }
  if(v==='users'){
    body.innerHTML='<div class="skel h-40 rounded-3xl"></div>';
    const r = await api('admUsers');
    body.innerHTML = `<button id="addUserBtn" class="w-full mb-3 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-sm font-bold">＋ ${t('addUser')}</button>
      <div class="space-y-2">${r.users.map(u=>`
      <div class="glass rounded-2xl px-4 py-3 bubble cursor-pointer userRow" data-u='${JSON.stringify(u).replace(/'/g,"&#39;")}'>
        <div class="flex justify-between"><span class="font-bold text-sm">${escapeHtml(u.displayName)} ${u.isAdmin?'🛡️':''}</span>
        <span class="text-[10px] opacity-50">@${escapeHtml(u.username)}</span></div>
        <p class="text-[11px] opacity-60 mt-1">${u.allowedTabs.join(', ')||'—'}</p></div>`).join('')}</div>`;
    $('#addUserBtn').onclick = ()=>userForm(null);
    document.querySelectorAll('.userRow').forEach(el=>el.onclick=()=>userForm(JSON.parse(el.dataset.u.replace(/&#39;/g,"'"))));
  }
  if(v==='audit'){
    body.innerHTML = `<div class="flex gap-2 mb-3">
      <select id="afTab" class="glass rounded-xl px-3 py-2 text-xs bg-transparent"><option value="">${t('filterTab')}</option>
        ${S.tabs.map(x=>`<option value="${x.tabId}">${x.label_en}</option>`).join('')}</select>
      <input id="afUser" placeholder="${t('filterUser')}" class="glass rounded-xl px-3 py-2 text-xs bg-transparent flex-1"></div>
      <div id="auditList" class="space-y-2"></div>`;
    const load = async ()=>{
      const r = await api('audit',{tabId:$('#afTab').value,userId:'',action:''});
      let logs = r.logs||[];
      const qu=$('#afUser').value.toLowerCase();
      if(qu) logs=logs.filter(l=>(l.username||'').toLowerCase().includes(qu));
      $('#auditList').innerHTML = logs.slice(0,100).map(l=>`
        <div class="glass rounded-2xl px-4 py-2.5 text-xs bubble">
          <div class="flex justify-between"><span class="font-bold">${l.action} · ${l.tabId||''}</span>
          <span class="opacity-40">${String(l.ts).replace('T',' ').slice(0,16)}</span></div>
          <p class="opacity-60 mt-0.5">@${escapeHtml(l.username)} ${l.recordId?'· '+(l.recordId+'').slice(0,6):''}</p></div>`).join('')||'<p class="text-center opacity-40 text-xs">—</p>';
    };
    load(); $('#afTab').onchange=load; $('#afUser').oninput=load;
  }
  if(v==='tab'){
    body.innerHTML = `<div class="glass rounded-3xl p-5 space-y-3">
      <input id="ntName" placeholder="${t('tabName')}" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent">
      <input id="ntNameAr" placeholder="${t('tabNameAr')}" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent">
      <input id="ntFields" placeholder="e.g. name:text:Name|salary:number:Salary|dept:select:Dept(HR|IT)" class="w-full glass rounded-2xl px-4 py-3 text-xs bg-transparent">
      <button id="ntBtn" class="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-sm font-bold">${t('create')}</button></div>`;
    $('#ntBtn').onclick = async ()=>{
      const fields = $('#ntFields').value.split('|').map(s=>{const [field,type,label]=s.split(':');
        return field?{field:field.trim(),type:(type||'text').trim(),label_en:(label||field).trim(),
          label_ar:(label||field).trim(), options:(type||'').trim()==='select'? (label.match(/\(([^)]+)\)/)?.[1]||'').split(',').map(x=>x.trim()):[] }:null;}).filter(Boolean);
      const r = await api('admAddTab',{},'POST',{data:{sheetName:$('#ntName').value.trim().replace(/\W+/g,'_').toUpperCase(),
        label_en:$('#ntName').value, label_ar:$('#ntNameAr').value||$('#ntName').value, fields}});
      toast(r.ok?'✅':'⚠️', r.ok?'ok':'err');
      if(r.ok){ const b=await api('bootstrap'); S.tabs=b.tabs; S.schema=b.schema; renderNav(); }
    };
  }
}
function userForm(u){
  openSheet(u?u.displayName:t('addUser'), `
    <input id="ufName" value="${u?escapeHtml(u.username):''}" placeholder="${t('username')}" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent">
    <input id="ufDisp" value="${u?escapeHtml(u.displayName):''}" placeholder="Display name" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent">
    <input id="ufPass" type="password" placeholder="${t('pass')}" class="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent">
    <label class="flex items-center justify-between glass rounded-2xl px-4 py-3 text-sm"><span>${t('isAdmin')}</span>
      <input type="checkbox" id="ufAdmin" ${u?.isAdmin?'checked':''} class="w-5 h-5 accent-cyan-400"></label>
    <div><p class="text-[11px] font-bold opacity-60 mb-2">${t('allowedTabs')}</p>
      <div class="flex flex-wrap gap-2">${S.tabs.map(x=>`<label class="glass rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5">
        <input type="checkbox" class="ufTab accent-cyan-400" value="${x.tabId}" ${u?.allowedTabs.includes(x.tabId)?'checked':''}>${x.label_en}</label>`).join('')}</div></div>
    <button id="ufSave" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold">${t('create')}</button>`);
  $('#ufSave').onclick = async ()=>{
    const r = await api('admSaveUser',{},'POST',{data:{ userId:u?.userId, username:$('#ufName').value.trim(),
      displayName:$('#ufDisp').value, password:$('#ufPass').value, isAdmin:$('#ufAdmin').checked,
      allowedTabs:[...document.querySelectorAll('.ufTab:checked')].map(c=>c.value) }});
    toast(r.ok?'✅':'⚠️', r.ok?'ok':'err');
    if(r.ok){ closeSheet(); renderAdmin(); }
  };
}

/* ---------------- presence heartbeat ---------------- */
let hbTimer=null;
function startHeartbeat(){
  clearInterval(hbTimer);
  const beat = ()=>{ if(S.online && S.token) post('heartbeat',{}).catch(()=>{}); };
  beat(); hbTimer = setInterval(beat, 30000);
}

/* ---------------- global controls ---------------- */
$('#themeBtn').onclick = ()=>{
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', dark?'dark':'light');
  $('#themeIcon').textContent = dark?'🌙':'☀️';
};
if(localStorage.getItem('theme')==='light'){ document.documentElement.classList.remove('dark'); $('#themeIcon').textContent='☀️'; }
else document.documentElement.classList.add('dark');

function applyLang(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar' ? 'rtl':'ltr';
  localStorage.setItem('lang', lang);
  $('#langBtn').textContent = lang==='ar' ? 'EN':'ع';
  if(S.token) renderApp(); else renderLogin();
}
$('#langBtn').onclick = ()=>{ lang = lang==='ar'?'en':'ar'; applyLang(); };

$('#logoutBtn').onclick = ()=>{
  clearInterval(hbTimer); S.token=null; S.user=null; S.tabs=[]; S.activeTab=null;
  localStorage.removeItem('session'); toast(t('logout')); renderLogin();
};
$('#adminBtn').onclick = renderAdmin;
$('#fab').onclick = ()=>{ if(S.activeTab) openRecordSheet(S.activeTab); };
$('#syncBadge').onclick = ()=>{ flushQueue(); };

/* ---------------- boot ---------------- */
(async function init(){
  await DB.open();
  await refreshSyncBadge();
  if(S.token && S.user) renderApp();
  else renderLogin();
})();
