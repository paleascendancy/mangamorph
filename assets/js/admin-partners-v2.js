import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const el=id=>document.getElementById(id);
let sources=[];
let workMaps=[];
let mangas=[];
let selectedGroupKey=null;
let editingId=null;
let busy=false;

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}
function safeUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.toString():""}catch{return""}}
function hostFrom(value){try{return new URL(String(value||"")).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}}
function norm(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function groupKey(source){return hostFrom(source.website_url)||hostFrom(source.feed_url)||norm(source.name)||String(source.id)}
function formatDate(value){if(!value)return"Nunca";const date=new Date(value);return Number.isNaN(date.getTime())?"Nunca":date.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}
function relativeSync(value){if(!value)return"Ainda não sincronizada";const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms)||ms<0)return formatDate(value);const min=Math.floor(ms/60000);if(min<1)return"Agora";if(min<60)return`Há ${min} min`;const h=Math.floor(min/60);if(h<24)return`Há ${h} h`;const d=Math.floor(h/24);return`Há ${d} dia${d===1?"":"s"}`}
function statusInfo(status){const s=String(status||"idle").toLowerCase();if(s==="ok")return{key:"ok",label:"OK",rank:0};if(s==="partial")return{key:"partial",label:"Parcial",rank:2};if(s==="error")return{key:"error",label:"Erro",rank:3};return{key:"idle",label:"Aguardando",rank:1}}
function preferredName(items){const counts=new Map();for(const item of items){const name=String(item.name||"").trim()||"Scan parceira";const key=norm(name);const row=counts.get(key)||{name,count:0,accent:0};row.count++;row.accent=Math.max(row.accent,(name.match(/[^\x00-\x7F]/g)||[]).length);if(row.accent>0)row.name=name;counts.set(key,row)}return [...counts.values()].sort((a,b)=>b.count-a.count||b.accent-a.accent)[0]?.name||"Scan parceira"}
function latestDate(items){return items.map(x=>x.last_synced_at).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0]||null}
function uniqueById(items){const seen=new Set();return items.filter(item=>{const id=Number(item.id);if(seen.has(id))return false;seen.add(id);return true})}
function groupStatus(items){return items.map(x=>statusInfo(x.last_status)).sort((a,b)=>b.rank-a.rank)[0]||statusInfo(null)}
function groupStats(items){const out={ok:0,partial:0,error:0,idle:0};for(const item of items)out[statusInfo(item.last_status).key]++;return out}
function initials(name){return String(name||"MM").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase().slice(0,2)||"MM"}
function workForSource(source){const maps=workMaps.filter(m=>Number(m.source_id)===Number(source.id));if(!maps.length)return[{source,map:null,manga:null}];return maps.map(map=>({source,map,manga:mangas.find(m=>Number(m.id)===Number(map.manga_id))||null}))}
function buildGroups(){
  const grouped=new Map();
  for(const source of sources){const key=groupKey(source);if(!grouped.has(key))grouped.set(key,{key,sources:[]});grouped.get(key).sources.push(source)}
  return [...grouped.values()].map(group=>{
    const sourceList=group.sources;
    const works=sourceList.flatMap(workForSource);
    const name=preferredName(sourceList);
    const host=hostFrom(sourceList.find(s=>s.website_url)?.website_url)||hostFrom(sourceList[0]?.feed_url)||group.key;
    const website=safeUrl(sourceList.find(s=>s.website_url)?.website_url)||safeUrl(sourceList[0]?.website_url)||"";
    return {...group,name,host,website,works,status:groupStatus(sourceList),stats:groupStats(sourceList),lastSynced:latestDate(sourceList)};
  }).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
}

function mount(){
  const root=el("viewPartners");
  if(!root)return;
  root.innerHTML=`
    <div class="partner-v2-shell">
      <section id="partnerOverview" class="partner-screen">
        <div class="partner-hero">
          <div>
            <span class="partner-eyebrow">CENTRAL DE INTEGRAÇÕES</span>
            <h2>Scans e sites</h2>
            <p>Uma página por scan. As obras ficam organizadas dentro da fonte correspondente.</p>
          </div>
          <div class="partner-hero-actions">
            <button class="mm-btn mm-btn-ghost" id="partnerNewButton" type="button">＋ Nova integração</button>
            <button class="mm-btn mm-btn-primary" id="partnerSyncAll" type="button">↻ Sincronizar tudo</button>
          </div>
        </div>
        <div class="partner-kpis" id="partnerKpis"></div>
        <div class="partner-toolbar">
          <label class="partner-search"><span>⌕</span><input id="partnerSearch" type="search" placeholder="Buscar scan ou site…" autocomplete="off"></label>
          <span class="partner-toolbar-note" id="partnerToolbarNote"></span>
        </div>
        <div class="partner-groups" id="partnerGroups"><div class="partner-loading">Carregando integrações…</div></div>
      </section>

      <section id="partnerDetail" class="partner-screen" hidden>
        <button class="partner-back" id="partnerBack" type="button">← Voltar para scans</button>
        <div id="partnerDetailContent"></div>
      </section>

      <div class="partner-editor-shell" id="partnerEditorShell" hidden>
        <button class="partner-editor-backdrop" id="partnerEditorBackdrop" type="button" aria-label="Fechar editor"></button>
        <form class="partner-editor" id="partnerForm">
          <div class="partner-editor-head">
            <div><span>INTEGRAÇÃO</span><h2 id="partnerFormTitle">Nova integração</h2><p id="partnerFormSubtitle">Conecte uma obra autorizada à automação.</p></div>
            <button class="partner-editor-close" id="partnerEditorClose" type="button">×</button>
          </div>
          <div class="partner-editor-grid">
            <label>Nome da scan<input id="partnerName" maxlength="120" placeholder="MangásTop" required></label>
            <label>Site oficial<input id="partnerWebsite" type="url" maxlength="1000" placeholder="https://scan.exemplo"></label>
            <label>Tipo da fonte<select id="partnerSourceType"><option value="site">Site da scan</option><option value="feed">API / JSON</option></select></label>
            <label class="wide"><span id="partnerFeedLabel">Página da obra ou capítulo</span><input id="partnerFeed" type="url" maxlength="1500" placeholder="https://scan.exemplo/obra/..." required><small id="partnerSourceHint"></small></label>
            <label class="wide">Crédito exibido<input id="partnerCredit" maxlength="240" placeholder="Tradução e edição: Nome da Scan"></label>
            <label>Verificar a cada<select id="partnerInterval"><option value="5">5 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="360">6 horas</option><option value="1440">1 dia</option></select></label>
          </div>
          <div class="partner-editor-options">
            <label><input id="partnerEnabled" type="checkbox" checked> Sincronização ativa</label>
            <label><input id="partnerAutoPublish" type="checkbox" checked> Publicar automaticamente</label>
            <label><input id="partnerRights" type="checkbox"> A scan confirmou permissão de distribuição</label>
          </div>
          <div class="partner-editor-footer">
            <button class="mm-btn mm-btn-danger" id="partnerDeleteButton" type="button" hidden>Remover vínculo</button>
            <div class="partner-editor-footer-right">
              <button class="mm-btn mm-btn-ghost" id="partnerCancelButton" type="button">Cancelar</button>
              <button class="mm-btn mm-btn-primary" id="partnerSaveButton" type="submit">Salvar integração</button>
            </div>
          </div>
          <p class="partner-form-message" id="partnerMessage" hidden></p>
        </form>
      </div>
      <div class="partner-toast" id="partnerToast" hidden></div>
    </div>`;
  bindStaticEvents();
  updateSourceFields();
}

function renderKpis(groups){
  const sourceStats=groupStats(sources);
  const mapped=workMaps.length;
  const issues=sourceStats.error+sourceStats.partial;
  el("partnerKpis").innerHTML=`
    <article><span>Scans / sites</span><strong>${groups.length}</strong><small>fontes agrupadas</small></article>
    <article><span>Obras vinculadas</span><strong>${mapped}</strong><small>integrações ativas</small></article>
    <article><span>Saudáveis</span><strong>${sourceStats.ok}</strong><small>sincronizações OK</small></article>
    <article class="${issues?"has-issue":""}"><span>Precisam de atenção</span><strong>${issues}</strong><small>${sourceStats.idle} aguardando</small></article>`;
}

function groupCard(group){
  const total=group.sources.length;
  const okPct=total?Math.round((group.stats.ok/total)*100):0;
  return `<article class="partner-group-card" data-group-key="${escapeHtml(group.key)}">
    <div class="partner-group-top">
      <div class="partner-group-icon">${escapeHtml(initials(group.name))}</div>
      <div class="partner-group-copy">
        <div class="partner-group-title"><h3>${escapeHtml(group.name)}</h3><span class="partner-status ${group.status.key}">${escapeHtml(group.status.label)}</span></div>
        <span class="partner-domain">${escapeHtml(group.host)}</span>
      </div>
      <button class="partner-more" data-group-open="${escapeHtml(group.key)}" type="button" aria-label="Abrir ${escapeHtml(group.name)}">›</button>
    </div>
    <div class="partner-group-metrics">
      <div><strong>${group.works.filter(x=>x.manga).length}</strong><span>obras</span></div>
      <div><strong>${group.stats.ok}</strong><span>OK</span></div>
      <div><strong>${group.stats.partial+group.stats.error}</strong><span>atenção</span></div>
    </div>
    <div class="partner-health"><span style="width:${okPct}%"></span></div>
    <div class="partner-group-footer">
      <span>Última sincronização: <b>${escapeHtml(relativeSync(group.lastSynced))}</b></span>
      <div>
        <button class="mm-btn mm-btn-mini" data-group-sync="${escapeHtml(group.key)}" type="button">↻ Sincronizar</button>
        <button class="mm-btn mm-btn-mini mm-btn-blue" data-group-open="${escapeHtml(group.key)}" type="button">Abrir scan</button>
      </div>
    </div>
  </article>`;
}

function renderOverview(){
  const groups=buildGroups();
  renderKpis(groups);
  const q=String(el("partnerSearch")?.value||"").trim().toLowerCase();
  const filtered=groups.filter(g=>!q||`${g.name} ${g.host}`.toLowerCase().includes(q));
  el("partnerToolbarNote").textContent=`${groups.length} ${groups.length===1?"scan organizada":"scans organizadas"}`;
  el("partnerGroups").innerHTML=filtered.length?filtered.map(groupCard).join(""):'<div class="partner-empty"><strong>Nenhuma scan encontrada</strong><span>Tente outro termo de busca.</span></div>';
}

function workStatusCard(item){
  const {source,map,manga}=item;
  const status=statusInfo(source.last_status);
  const title=manga?.title||"Integração sem obra vinculada";
  const cover=safeUrl(manga?.cover_url);
  const chapters=Number(manga?.source_chapter_count)||0;
  const externalId=map?.external_work_id||"—";
  return `<article class="partner-work-card" data-work-search="${escapeHtml(title.toLowerCase())}">
    <div class="partner-work-cover">${cover?`<img src="${escapeHtml(cover)}" alt="" loading="lazy">`:`<span>${escapeHtml(initials(title))}</span>`}</div>
    <div class="partner-work-body">
      <div class="partner-work-heading">
        <div><h4>${escapeHtml(title)}</h4><span>${escapeHtml(source.source_type==="feed"?"API / JSON":"Site")} · ID externo ${escapeHtml(externalId)}</span></div>
        <span class="partner-status ${status.key}">${escapeHtml(status.label)}</span>
      </div>
      <div class="partner-work-meta">
        <span><b>${chapters||"—"}</b> capítulos na fonte</span>
        <span>Última sync <b>${escapeHtml(relativeSync(source.last_synced_at))}</b></span>
        ${manga?.published!==undefined?`<span>${manga.published?"Publicada":"Rascunho"}</span>`:""}
      </div>
      ${source.last_error?`<div class="partner-work-error"><span>!</span><p>${escapeHtml(source.last_error)}</p></div>`:""}
      <div class="partner-work-actions">
        <button class="mm-btn mm-btn-mini mm-btn-blue" data-source-sync="${source.id}" type="button">↻ Sincronizar obra</button>
        ${manga?`<button class="mm-btn mm-btn-mini" data-open-manga="${manga.id}" type="button">Abrir obra</button>`:""}
        <button class="mm-btn mm-btn-mini" data-source-edit="${source.id}" type="button">Editar vínculo</button>
      </div>
    </div>
  </article>`;
}

function renderDetail(){
  if(!selectedGroupKey)return;
  const group=buildGroups().find(g=>g.key===selectedGroupKey);
  if(!group){selectedGroupKey=null;showOverview();return}
  const issues=group.stats.partial+group.stats.error;
  const website=group.website;
  el("partnerDetailContent").innerHTML=`
    <div class="partner-detail-hero">
      <div class="partner-detail-brand">
        <div class="partner-detail-logo">${escapeHtml(initials(group.name))}</div>
        <div><span class="partner-eyebrow">SCAN / SITE</span><div class="partner-detail-title"><h2>${escapeHtml(group.name)}</h2><span class="partner-status ${group.status.key}">${escapeHtml(group.status.label)}</span></div><p>${escapeHtml(group.host)} · ${group.works.filter(x=>x.manga).length} obra(s) vinculada(s)</p></div>
      </div>
      <div class="partner-detail-actions">
        ${website?`<a class="mm-btn mm-btn-ghost" href="${escapeHtml(website)}" target="_blank" rel="noopener">Abrir site ↗</a>`:""}
        <button class="mm-btn mm-btn-ghost" data-group-add="${escapeHtml(group.key)}" type="button">＋ Adicionar obra</button>
        <button class="mm-btn mm-btn-primary" data-group-sync="${escapeHtml(group.key)}" type="button">↻ Sincronizar scan</button>
      </div>
    </div>
    <div class="partner-detail-kpis">
      <article><span>Obras</span><strong>${group.works.filter(x=>x.manga).length}</strong></article>
      <article><span>OK</span><strong>${group.stats.ok}</strong></article>
      <article class="${issues?"has-issue":""}"><span>Com atenção</span><strong>${issues}</strong></article>
      <article><span>Última sincronização</span><strong class="date">${escapeHtml(relativeSync(group.lastSynced))}</strong></article>
    </div>
    <div class="partner-work-section">
      <div class="partner-section-head"><div><span class="partner-eyebrow">CONTEÚDO CONECTADO</span><h3>Obras desta scan</h3><p>Agora cada integração mostra a obra correspondente, sem repetir o nome da scan.</p></div><label class="partner-search compact"><span>⌕</span><input id="partnerWorkSearch" type="search" placeholder="Buscar obra…"></label></div>
      <div class="partner-work-list" id="partnerWorkList">${group.works.map(workStatusCard).join("")||'<div class="partner-empty"><strong>Nenhuma obra vinculada</strong><span>Adicione uma obra para começar.</span></div>'}</div>
    </div>`;
  el("partnerWorkSearch")?.addEventListener("input",filterWorks);
}

function filterWorks(){
  const q=String(el("partnerWorkSearch")?.value||"").trim().toLowerCase();
  document.querySelectorAll(".partner-work-card").forEach(card=>{card.hidden=!!q&&!String(card.dataset.workSearch||"").includes(q)})
}

function showOverview(){selectedGroupKey=null;el("partnerOverview").hidden=false;el("partnerDetail").hidden=true;renderOverview()}
function openGroup(key){selectedGroupKey=key;el("partnerOverview").hidden=true;el("partnerDetail").hidden=false;renderDetail();window.scrollTo({top:0,behavior:"smooth"})}

function showToast(text,error=false){const node=el("partnerToast");if(!node)return;node.textContent=text;node.classList.toggle("error",!!error);node.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{node.hidden=true},5200)}
function formMessage(text,error=false){const node=el("partnerMessage");if(!node)return;node.textContent=text||"";node.hidden=!text;node.classList.toggle("error",!!error)}
function openEditor(){el("partnerEditorShell").hidden=false;document.body.classList.add("partner-editor-open")}
function closeEditor(){el("partnerEditorShell").hidden=true;document.body.classList.remove("partner-editor-open");formMessage("")}

function updateSourceFields(){
  const type=el("partnerSourceType")?.value||"site";
  const label=el("partnerFeedLabel"),input=el("partnerFeed"),hint=el("partnerSourceHint");
  if(!input)return;
  if(type==="site"){
    if(label)label.textContent="Página da obra ou capítulo";
    input.placeholder="https://scan.exemplo/obra/...";
    if(hint)hint.textContent="Cole a página da obra. O MangaMorph acompanha os capítulos autorizados automaticamente.";
  }else{
    if(label)label.textContent="Feed/API de capítulos";
    input.placeholder="https://scan.exemplo/api/mangamorph.json";
    if(hint)hint.textContent="Use uma URL HTTPS que retorne JSON com obras, capítulos e páginas.";
  }
}

function resetForm(prefill=null){
  editingId=null;
  el("partnerForm")?.reset();
  el("partnerSourceType").value="site";
  el("partnerEnabled").checked=true;
  el("partnerAutoPublish").checked=true;
  el("partnerInterval").value="5";
  el("partnerRights").checked=false;
  el("partnerFormTitle").textContent=prefill?`Adicionar obra em ${prefill.name}`:"Nova integração";
  el("partnerFormSubtitle").textContent=prefill?"A nova obra ficará agrupada nesta página da scan.":"Conecte uma obra autorizada à automação.";
  el("partnerSaveButton").textContent="Salvar integração";
  el("partnerDeleteButton").hidden=true;
  if(prefill){el("partnerName").value=prefill.name||"";el("partnerWebsite").value=prefill.website||"";el("partnerCredit").value=prefill.sources?.find(s=>s.attribution_text)?.attribution_text||""}
  updateSourceFields();formMessage("");openEditor();
}

function fillForm(source){
  editingId=Number(source.id);
  el("partnerName").value=source.name||"";
  el("partnerWebsite").value=source.website_url||"";
  el("partnerSourceType").value=source.source_type||"site";
  el("partnerFeed").value=source.feed_url||"";
  el("partnerCredit").value=source.attribution_text||"";
  el("partnerEnabled").checked=!!source.enabled;
  el("partnerAutoPublish").checked=!!source.auto_publish;
  el("partnerRights").checked=!!source.rights_confirmed;
  el("partnerInterval").value=String(source.sync_interval_minutes||5);
  const work=workForSource(source).find(x=>x.manga)?.manga;
  el("partnerFormTitle").textContent=work?`Editar ${work.title}`:`Editar ${source.name}`;
  el("partnerFormSubtitle").textContent="Ajuste este vínculo sem alterar as outras obras da mesma scan.";
  el("partnerSaveButton").textContent="Salvar alterações";
  el("partnerDeleteButton").hidden=false;
  updateSourceFields();formMessage("");openEditor();
}

async function getSession(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error("Entre novamente no painel.");
  const {data:isAdmin,error}=await supabase.rpc("is_mangamorph_admin");
  if(error||isAdmin!==true)throw new Error("Sua conta não possui acesso administrativo.");
  return session;
}

async function loadData(){
  const [sourceRes,mapRes,mangaRes]=await Promise.all([
    supabase.from("mangamorph_partner_sources").select("*").order("created_at",{ascending:false}),
    supabase.from("mangamorph_partner_work_map").select("id,source_id,external_work_id,manga_id,created_at").order("created_at",{ascending:false}),
    supabase.from("mangamorph_mangas").select("id,title,slug,cover_url,source_chapter_count,source_metadata_synced_at,published").order("title")
  ]);
  const firstError=sourceRes.error||mapRes.error||mangaRes.error;
  if(firstError)throw firstError;
  sources=sourceRes.data||[];workMaps=mapRes.data||[];mangas=mangaRes.data||[];
  if(selectedGroupKey)renderDetail();else renderOverview();
}

function summarizeSync(data){
  const rows=Array.isArray(data?.results)?data.results:[];
  const imported=rows.reduce((sum,row)=>sum+Number(row.imported||0),0);
  const pages=rows.reduce((sum,row)=>sum+Number(row.pages||0),0);
  const errors=rows.flatMap(row=>Array.isArray(row.errors)?row.errors:[]).filter(Boolean);
  if(errors.length)return{error:true,text:`Sincronização concluída com avisos. ${imported} capítulo(s), ${pages} páginas. ${errors[0]}`};
  return{error:false,text:`Sincronização concluída: ${imported} capítulo(s) e ${pages} páginas novas.`};
}

async function invokeSync(sourceId=null){
  const session=await getSession();
  supabase.functions.setAuth(session.access_token);
  const {data,error}=await supabase.functions.invoke("mangamorph-sync-partners",{body:sourceId?{source_id:Number(sourceId),max_chapters:6}:{max_chapters:6}});
  if(error)throw error;if(!data?.ok)throw new Error(data?.error||"A sincronização falhou.");return data;
}

async function syncSource(id,button=null){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{showToast("Sincronizando obra…");const data=await invokeSync(id);await loadData();const result=summarizeSync(data);showToast(result.text,result.error);window.dispatchEvent(new Event("mangamorph:partner-sync-complete"))}
  catch(error){showToast(error?.message||"Falha ao sincronizar a obra.",true)}
  finally{busy=false;if(button)button.disabled=false}
}

async function syncGroup(key,button=null){
  if(busy)return;const group=buildGroups().find(g=>g.key===key);if(!group)return;
  busy=true;if(button)button.disabled=true;let failures=0;
  try{
    const list=uniqueById(group.sources);
    for(let i=0;i<list.length;i++){showToast(`Sincronizando ${group.name}: ${i+1}/${list.length}…`);try{await invokeSync(list[i].id)}catch{failures++}}
    await loadData();showToast(failures?`Sincronização concluída com ${failures} falha(s).`:`${group.name} sincronizada com sucesso.`,failures>0);window.dispatchEvent(new Event("mangamorph:partner-sync-complete"));
  }finally{busy=false;if(button)button.disabled=false}
}

async function syncAll(button=null){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{showToast("Sincronizando todas as scans…");const data=await invokeSync();await loadData();const result=summarizeSync(data);showToast(result.text,result.error);window.dispatchEvent(new Event("mangamorph:partner-sync-complete"))}
  catch(error){showToast(error?.message||"Falha ao sincronizar.",true)}
  finally{busy=false;if(button)button.disabled=false}
}

async function saveSource(event){
  event.preventDefault();
  try{
    const session=await getSession();
    if(!el("partnerRights").checked)return formMessage("Confirme que a scan autorizou a distribuição antes de ativar a sincronização.",true);
    const sourceUrl=el("partnerFeed").value.trim(),website=el("partnerWebsite").value.trim();
    if(!/^https:\/\//i.test(sourceUrl))return formMessage("A fonte precisa usar HTTPS.",true);
    if(website&&!/^https:\/\//i.test(website))return formMessage("O site da scan precisa usar HTTPS.",true);
    const payload={name:el("partnerName").value.trim(),website_url:website||null,feed_url:sourceUrl,source_type:el("partnerSourceType").value||"site",attribution_text:el("partnerCredit").value.trim()||null,enabled:el("partnerEnabled").checked,auto_publish:el("partnerAutoPublish").checked,rights_confirmed:true,sync_interval_minutes:Number(el("partnerInterval").value)||5,site_cursor_url:null};
    formMessage(editingId?"Salvando alterações…":"Criando integração…");
    let result;
    if(editingId)result=await supabase.from("mangamorph_partner_sources").update(payload).eq("id",editingId).select().single();
    else result=await supabase.from("mangamorph_partner_sources").insert({...payload,created_by:session.user.id}).select().single();
    if(result.error)throw result.error;
    const id=Number(result.data.id);closeEditor();await loadData();showToast("Integração salva. Fazendo a primeira sincronização…");
    try{await syncSource(id)}catch{}
  }catch(error){formMessage(error?.message||"Não foi possível salvar a integração.",true)}
}

async function deleteSource(){
  if(!editingId)return;const source=sources.find(x=>Number(x.id)===editingId);const work=source?workForSource(source).find(x=>x.manga)?.manga:null;
  if(!confirm(`Remover ${work?.title||source?.name||"esta integração"}?`))return;
  const {error}=await supabase.from("mangamorph_partner_sources").delete().eq("id",editingId);if(error)return formMessage(error.message,true);
  closeEditor();await loadData();showToast("Vínculo removido.");
}

function openManga(id){
  document.querySelector('[data-admin-view="mangas"]')?.click();
  requestAnimationFrame(()=>{document.querySelector(`[data-edit-manga="${Number(id)}"]`)?.click()});
}

function bindStaticEvents(){
  el("partnerSearch")?.addEventListener("input",renderOverview);
  el("partnerBack")?.addEventListener("click",showOverview);
  el("partnerNewButton")?.addEventListener("click",()=>resetForm());
  el("partnerSyncAll")?.addEventListener("click",event=>syncAll(event.currentTarget));
  el("partnerEditorClose")?.addEventListener("click",closeEditor);
  el("partnerEditorBackdrop")?.addEventListener("click",closeEditor);
  el("partnerCancelButton")?.addEventListener("click",closeEditor);
  el("partnerSourceType")?.addEventListener("change",updateSourceFields);
  el("partnerForm")?.addEventListener("submit",saveSource);
  el("partnerDeleteButton")?.addEventListener("click",deleteSource);
}

document.addEventListener("click",event=>{
  const open=event.target.closest("[data-group-open]");if(open){openGroup(open.dataset.groupOpen);return}
  const gsync=event.target.closest("[data-group-sync]");if(gsync){syncGroup(gsync.dataset.groupSync,gsync);return}
  const add=event.target.closest("[data-group-add]");if(add){const group=buildGroups().find(g=>g.key===add.dataset.groupAdd);if(group)resetForm(group);return}
  const edit=event.target.closest("[data-source-edit]");if(edit){const source=sources.find(x=>Number(x.id)===Number(edit.dataset.sourceEdit));if(source)fillForm(source);return}
  const sync=event.target.closest("[data-source-sync]");if(sync){syncSource(Number(sync.dataset.sourceSync),sync);return}
  const manga=event.target.closest("[data-open-manga]");if(manga){openManga(Number(manga.dataset.openManga));return}
});

document.addEventListener("click",event=>{if(event.target.closest('[data-admin-view="partners"]'))loadData().catch(error=>showToast(error.message,true))});
window.addEventListener("mangamorph:partner-sync-complete",()=>loadData().catch(()=>{}));

mount();
await getSession().then(loadData).catch(()=>{});
