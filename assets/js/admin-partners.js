import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const el=id=>document.querySelector("#"+id);
let sources=[];
let editingId=null;

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}
function setMessage(text,error=false){const node=el("partnerMessage");node.textContent=text||"";node.hidden=!text;node.classList.toggle("error",Boolean(error))}
function formatDate(value){if(!value)return"nunca";const date=new Date(value);return Number.isNaN(date.getTime())?"nunca":date.toLocaleString("pt-BR")}

function ensureSourceTypeUI(){
  if(el("partnerSourceType"))return;
  const sourceInput=el("partnerFeed");
  const sourceLabel=sourceInput?.closest("label");
  if(!sourceLabel)return;
  const typeLabel=document.createElement("label");
  typeLabel.innerHTML='Tipo da fonte<select id="partnerSourceType"><option value="site">Site da scan</option><option value="feed">API / JSON</option></select>';
  sourceLabel.before(typeLabel);
  const hint=document.createElement("small");
  hint.id="partnerSourceHint";
  hint.style.color="#738299";
  hint.style.fontSize=".5rem";
  hint.style.lineHeight="1.45";
  sourceLabel.after(hint);
  el("partnerSourceType").addEventListener("change",updateSourceFields);
}

function updateSourceFields(){
  const type=el("partnerSourceType")?.value||"site";
  const input=el("partnerFeed");
  const label=input?.closest("label");
  const hint=el("partnerSourceHint");
  const details=document.querySelector(".partner-feed-help");
  if(!input||!label)return;
  for(const node of label.childNodes){if(node.nodeType===Node.TEXT_NODE){node.nodeValue=type==="site"?"Página da obra ou capítulo":"Feed/API de capítulos";break}}
  if(type==="site"){
    input.placeholder="https://scan.exemplo/obra/capitulo-01.html";
    if(hint)hint.textContent="Pode colar uma página normal da obra ou de um capítulo. O MangaMorph detecta os capítulos e continua acompanhando os próximos automaticamente.";
    if(details){details.querySelector("summary").textContent="Como funciona o modo Site";details.querySelector("p").textContent="O MangaMorph lê somente a fonte que você autorizou, detecta links de capítulos e páginas, evita duplicatas e continua a partir do último capítulo encontrado. Se a scan bloquear cópia pelo servidor, a página autorizada pode ser usada diretamente no leitor."}
  }else{
    input.placeholder="https://scan.exemplo/api/mangamorph.json";
    if(hint)hint.textContent="Use uma URL que retorne JSON com obras, capítulos e páginas.";
    if(details){details.querySelector("summary").textContent="Formato da API/feed";details.querySelector("p").textContent="O feed deve retornar JSON com obras e capítulos. Cada capítulo precisa ter identificador, número e uma lista de URLs HTTPS das páginas."}
  }
}

function resetForm(){
  editingId=null;
  el("partnerForm").reset();
  ensureSourceTypeUI();
  el("partnerSourceType").value="site";
  el("partnerEnabled").checked=true;
  el("partnerAutoPublish").checked=true;
  el("partnerInterval").value="15";
  el("partnerRights").checked=false;
  el("partnerFormTitle").textContent="Nova scan parceira";
  el("partnerSaveButton").textContent="Salvar parceria";
  el("partnerDeleteButton").hidden=true;
  updateSourceFields();
  setMessage("");
}

function fillForm(source){
  ensureSourceTypeUI();
  editingId=Number(source.id);
  el("partnerName").value=source.name||"";
  el("partnerWebsite").value=source.website_url||"";
  el("partnerSourceType").value=source.source_type||"feed";
  el("partnerFeed").value=source.feed_url||"";
  el("partnerCredit").value=source.attribution_text||"";
  el("partnerEnabled").checked=!!source.enabled;
  el("partnerAutoPublish").checked=!!source.auto_publish;
  el("partnerRights").checked=!!source.rights_confirmed;
  el("partnerInterval").value=String(source.sync_interval_minutes||15);
  el("partnerFormTitle").textContent="Editar "+source.name;
  el("partnerSaveButton").textContent="Salvar alterações";
  el("partnerDeleteButton").hidden=false;
  updateSourceFields();
  setMessage("");
  el("partnerForm").scrollIntoView({behavior:"smooth",block:"start"});
}

function render(){
  const list=el("partnerList");
  if(!sources.length){list.innerHTML='<div class="empty-admin">Nenhuma scan parceira conectada ainda.</div>';return}
  list.innerHTML=sources.map(source=>{
    const status=source.last_status||"aguardando";
    const statusClass=status==="ok"?"ok":status==="partial"?"partial":status==="error"?"error":"idle";
    const type=(source.source_type||"feed")==="site"?"SITE":"API";
    return '<article class="partner-row"><div class="partner-row-main"><div class="partner-row-title"><strong>'+escapeHtml(source.name)+'</strong><span class="partner-status idle">'+type+'</span><span class="partner-status '+statusClass+'">'+escapeHtml(status)+'</span></div><span>'+escapeHtml(source.attribution_text||"Sem crédito personalizado")+'</span><small>Sincronização: a cada '+Number(source.sync_interval_minutes||15)+' min · Última: '+escapeHtml(formatDate(source.last_synced_at))+'</small>'+(source.last_error?'<small class="partner-last-error">'+escapeHtml(source.last_error)+'</small>':'')+'</div><div class="partner-row-actions"><button type="button" data-partner-sync="'+source.id+'">Sincronizar</button><button type="button" data-partner-edit="'+source.id+'">Editar</button></div></article>';
  }).join("");
}

async function loadSources(){const {data,error}=await supabase.from("mangamorph_partner_sources").select("*").order("created_at",{ascending:false});if(error){setMessage(error.message,true);return}sources=data||[];render()}
async function getSession(){const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre novamente no painel.");const {data:isAdmin,error}=await supabase.rpc("is_mangamorph_admin");if(error||isAdmin!==true)throw new Error("Sua conta não possui acesso administrativo.");return session}

async function syncSource(id=null){
  const session=await getSession();
  supabase.functions.setAuth(session.access_token);
  setMessage(id?"Sincronizando scan…":"Sincronizando todas as scans…");
  const {data,error}=await supabase.functions.invoke("mangamorph-sync-partners",{body:id?{source_id:Number(id),max_chapters:6}:{max_chapters:6}});
  if(error)throw error;
  if(!data?.ok)throw new Error(data?.error||"A sincronização falhou.");
  const rows=Array.isArray(data.results)?data.results:[];
  const imported=rows.reduce((sum,row)=>sum+Number(row.imported||0),0);
  const pages=rows.reduce((sum,row)=>sum+Number(row.pages||0),0);
  const remote=rows.reduce((sum,row)=>sum+Number(row.remote||0),0);
  const errors=rows.flatMap(row=>Array.isArray(row.errors)?row.errors:[]).filter(Boolean);
  await loadSources();
  window.dispatchEvent(new Event("mangamorph:partner-sync-complete"));
  if(errors.length){setMessage("Sincronização concluída com avisos. "+imported+" capítulo(s), "+pages+" páginas. "+errors[0],true)}
  else setMessage("Sincronização concluída: "+imported+" capítulo(s) e "+pages+" páginas novas"+(remote?" · "+remote+" página(s) usando a fonte autorizada diretamente":"")+".");
}

el("partnerForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  try{
    const session=await getSession();
    if(!el("partnerRights").checked)return setMessage("Confirme que a scan autorizou a distribuição antes de ativar a sincronização.",true);
    const sourceUrl=el("partnerFeed").value.trim();
    const website=el("partnerWebsite").value.trim();
    const sourceType=el("partnerSourceType")?.value||"site";
    if(!/^https:\/\//i.test(sourceUrl))return setMessage("A fonte precisa usar HTTPS.",true);
    if(website&&!/^https:\/\//i.test(website))return setMessage("O site da scan precisa usar HTTPS.",true);
    const payload={name:el("partnerName").value.trim(),website_url:website||null,feed_url:sourceUrl,source_type:sourceType,attribution_text:el("partnerCredit").value.trim()||null,enabled:el("partnerEnabled").checked,auto_publish:el("partnerAutoPublish").checked,rights_confirmed:true,sync_interval_minutes:Number(el("partnerInterval").value)||15,site_cursor_url:null,created_by:session.user.id};
    let result;
    if(editingId){delete payload.created_by;result=await supabase.from("mangamorph_partner_sources").update(payload).eq("id",editingId).select().single()}
    else result=await supabase.from("mangamorph_partner_sources").insert(payload).select().single();
    if(result.error)throw result.error;
    const savedId=Number(result.data.id);
    await loadSources();
    fillForm(result.data);
    setMessage("Parceria salva. Fazendo a primeira sincronização…");
    try{await syncSource(savedId)}catch(error){setMessage("Parceria salva, mas a primeira sincronização falhou: "+(error?.message||String(error)),true)}
  }catch(error){setMessage(error?.message||"Não foi possível salvar a parceria.",true)}
});

el("partnerNewButton")?.addEventListener("click",resetForm);
el("partnerSyncAll")?.addEventListener("click",async()=>{try{await syncSource()}catch(error){setMessage(error?.message||"Falha ao sincronizar.",true)}});
el("partnerDeleteButton")?.addEventListener("click",async()=>{if(!editingId)return;const source=sources.find(item=>Number(item.id)===editingId);if(!confirm("Remover a integração com "+(source?.name||"esta scan")+"?"))return;const {error}=await supabase.from("mangamorph_partner_sources").delete().eq("id",editingId);if(error)return setMessage(error.message,true);resetForm();await loadSources()});

document.addEventListener("click",async event=>{
  const edit=event.target.closest("[data-partner-edit]");
  if(edit){const source=sources.find(item=>Number(item.id)===Number(edit.dataset.partnerEdit));if(source)fillForm(source);return}
  const sync=event.target.closest("[data-partner-sync]");
  if(sync){sync.disabled=true;try{await syncSource(Number(sync.dataset.partnerSync))}catch(error){setMessage(error?.message||"Falha ao sincronizar.",true)}finally{sync.disabled=false}}
});
document.addEventListener("click",event=>{if(event.target.closest('[data-admin-view="partners"]'))loadSources()});
window.addEventListener("mangamorph:partner-sync-complete",()=>loadSources());

ensureSourceTypeUI();
resetForm();
await getSession().then(loadSources).catch(()=>{});
