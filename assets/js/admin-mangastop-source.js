import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const form=document.querySelector("#mangaImportForm");
const input=document.querySelector("#mangaImportInput");
const baseResults=document.querySelector("#mangaImportResults");
const card=form?.closest(".manga-import-card");
let results=[];
let busyIndex=null;
let progressTimer=null;

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}

function ensureUi(){
  if(!card||document.querySelector("#mangastopImportBlock"))return;
  const block=document.createElement("section");
  block.id="mangastopImportBlock";
  block.hidden=true;
  block.innerHTML='<div class="mangastop-import-head"><div><span>SCAN PARCEIRA</span><strong>MangásTop</strong><small>3 capítulos agora → atualização automática a cada 1 min → AniList/MyAnimeList → PT-BR</small></div><small id="mangastopImportStatus"></small></div><div class="manga-import-results" id="mangastopImportResults"></div>';
  baseResults?.insertAdjacentElement("afterend",block);
  const style=document.createElement("style");
  style.textContent=`
    #mangastopImportBlock{margin-top:.65rem;padding-top:.65rem;border-top:1px solid rgba(255,255,255,.055)}
    .mangastop-import-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;margin-bottom:.45rem}
    .mangastop-import-head span{display:block;color:#6f99db;font-size:.43rem;font-weight:850;letter-spacing:.1em}
    .mangastop-import-head strong{display:block;margin-top:.08rem;font-size:.7rem}
    .mangastop-import-head div>small{display:block;margin-top:.14rem;color:#75869c;font-size:.43rem}
    .mangastop-import-head>small{color:#75869c;font-size:.48rem;text-align:right;max-width:48%}
    .mangastop-import-actions{display:flex;gap:.3rem;align-items:center}
    .mangastop-import-actions button{min-height:2.1rem;padding:0 .58rem;border:1px solid rgba(93,146,233,.16);border-radius:.52rem;background:#edf2f7;color:#121821;font-size:.48rem;font-weight:850;white-space:nowrap}
    .mangastop-import-actions button:disabled{opacity:.68;cursor:default}
    .mangastop-import-actions button.is-syncing{background:#153256;color:#b9d8ff;border-color:rgba(116,168,236,.28);opacity:1}
    .mangastop-import-actions button.is-complete{background:#163a2b;color:#a9f0ca;border-color:rgba(93,210,150,.25);opacity:1}
    @media(max-width:520px){.mangastop-import-head{display:block}.mangastop-import-head>small{display:block;max-width:none;text-align:left;margin-top:.3rem}.mangastop-import-actions{grid-column:1/-1}.mangastop-import-actions button{width:100%}}
  `;
  document.head.appendChild(style);
}

function status(text,error=false){
  const node=document.querySelector("#mangastopImportStatus");
  if(!node)return;
  node.textContent=text||"";
  node.style.color=error?"#ed9aa5":"";
}

function buttonState(item,index){
  if(busyIndex!==null){
    if(busyIndex===index)return{label:item._progress?`Preparando ${item._progress}`:"Preparando 3 capítulos…",disabled:true,complete:false,syncing:true};
    if(item.importComplete)return{label:"Importado ✓",disabled:true,complete:true,syncing:false};
    if(Number(item.importedCount)>0)return{label:`Atualizando sozinho ${item.importedCount}/${item.chapterCount||"?"}`,disabled:true,complete:false,syncing:true};
    return{label:"Adicionar ao MangaMorph",disabled:true,complete:false,syncing:false};
  }
  if(item.importComplete)return{label:"Importado ✓",disabled:true,complete:true,syncing:false};
  if(Number(item.importedCount)>0)return{label:`Atualizando sozinho ${item.importedCount}/${item.chapterCount||"?"}`,disabled:true,complete:false,syncing:true};
  return{label:"Adicionar ao MangaMorph",disabled:false,complete:false,syncing:false};
}

function render(){
  ensureUi();
  const block=document.querySelector("#mangastopImportBlock");
  const out=document.querySelector("#mangastopImportResults");
  if(!block||!out)return;
  block.hidden=false;
  if(!results.length){out.innerHTML='<div class="empty-admin">Nenhuma obra do MangásTop encontrada.</div>';return}
  out.innerHTML=results.map((item,index)=>{
    const button=buttonState(item,index);
    const progress=Number(item.importedCount)>0&&Number(item.chapterCount)>0?` · MangaMorph: ${item.importedCount}/${item.chapterCount}`:"";
    const klass=button.complete?"is-complete":button.syncing?"is-syncing":"";
    return `<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MT</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">MANGÁSTOP / MANGÁSTOP</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml([item.publicationStatus,item.chapterCount?item.chapterCount+" capítulos":null].filter(Boolean).join(" · ")+progress)}</span><small>${escapeHtml((item.genres||[]).slice(0,4).join(" · ")||"Perfil será enriquecido pelo AniList e MyAnimeList")}</small></div><div class="mangastop-import-actions"><button class="${klass}" type="button" data-mangastop-import="${index}" ${button.disabled?"disabled":""}>${escapeHtml(button.label)}</button></div></article>`;
  }).join("");
}

async function getSession(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error("Entre novamente no painel ADM.");
  const {data:ok,error}=await supabase.rpc("is_mangamorph_admin");
  if(error||ok!==true)throw new Error("Sua conta não possui acesso administrativo.");
  supabase.functions.setAuth(session.access_token);
  return session;
}

async function hydrateImportedState(){
  const ids=[...new Set(results.map(item=>String(item.sourceId||"")).filter(Boolean))];
  if(!ids.length)return;
  const {data:maps,error:mapError}=await supabase.from("mangamorph_partner_work_map").select("source_id,external_work_id,manga_id").in("external_work_id",ids);
  if(mapError||!maps?.length)return;
  const sourceIds=[...new Set(maps.map(row=>Number(row.source_id)).filter(Number.isFinite))];
  const {data:chapterMaps,error:chapterMapError}=await supabase.from("mangamorph_partner_chapter_map").select("source_id,external_work_id,chapter_id").in("source_id",sourceIds).in("external_work_id",ids);
  if(chapterMapError)return;
  const counts=new Map();
  for(const row of chapterMaps||[]){
    const key=`${Number(row.source_id)}:${String(row.external_work_id)}`;
    counts.set(key,(counts.get(key)||0)+1);
  }
  for(const item of results){
    const matches=maps.filter(row=>String(row.external_work_id)===String(item.sourceId||""));
    let count=0;
    for(const row of matches)count=Math.max(count,counts.get(`${Number(row.source_id)}:${String(row.external_work_id)}`)||0);
    item.importedCount=count;
    const available=Number(item.chapterCount)||0;
    item.importComplete=available>0&&count>=available;
  }
}

function ensureProgressPolling(){
  if(progressTimer)return;
  progressTimer=setInterval(async()=>{
    if(busyIndex!==null||!results.some(item=>Number(item.importedCount)>0&&!item.importComplete))return;
    try{
      const before=results.map(item=>Number(item.importedCount)||0).join(",");
      await hydrateImportedState();
      const after=results.map(item=>Number(item.importedCount)||0).join(",");
      if(before!==after){
        render();
        const active=results.find(item=>Number(item.importedCount)>0&&!item.importComplete);
        if(active)status(`${active.title}: ${active.importedCount}/${active.chapterCount||"?"} capítulos · atualização automática em segundo plano.`);
        else if(results.some(item=>item.importComplete))status("Importação concluída ✓");
      }
    }catch{}
  },60000);
}

async function search(){
  const query=String(input?.value||"").trim();
  if(query.length<2||/^https?:\/\//i.test(query))return;
  ensureUi();
  status("Buscando no MangásTop…");
  results=[];
  render();
  try{
    await getSession();
    const {data,error}=await supabase.functions.invoke("mangamorph-search-mangastop",{body:{query}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"A busca no MangásTop falhou.");
    results=Array.isArray(data.results)?data.results:[];
    await hydrateImportedState();
    render();
    ensureProgressPolling();
    const complete=results.filter(item=>item.importComplete).length;
    const syncing=results.filter(item=>Number(item.importedCount)>0&&!item.importComplete).length;
    status(results.length?`${results.length} resultado${results.length===1?"":"s"} do MangásTop${complete?` · ${complete} concluído${complete===1?"":"s"}`:""}${syncing?` · ${syncing} atualizando sozinho`:""}.`:"Nenhum resultado do MangásTop.");
  }catch(error){
    results=[];
    render();
    status(error?.message||"Não foi possível pesquisar o MangásTop.",true);
  }
}

async function importWork(item,index){
  if(busyIndex!==null||!item||item.importComplete||Number(item.importedCount)>0)return;
  busyIndex=index;
  item._progress=`0/${item.chapterCount||"?"}`;
  render();
  try{
    await getSession();
    status("Importando os 3 primeiros capítulos e ativando a atualização automática…");
    const {data,error}=await supabase.functions.invoke("mangamorph-import-mangastop",{body:{work_id:Number(item.sourceId),title:item.title,enrich:true}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"A importação do MangásTop falhou.");
    const mapped=Number(data?.chapters?.mapped||0);
    const available=Number(data?.chapters?.available||item.chapterCount||0);
    item.importedCount=mapped;
    item.importComplete=!!data?.chapters?.complete||(available>0&&mapped>=available);
    item._progress="";
    render();
    const newChapters=Number(data?.sync?.imported||0);
    const newPages=Number(data?.sync?.pages||0);
    if(item.importComplete){
      status(`${data.title||item.title}: ${mapped}/${available||mapped} capítulos · concluído ✓`);
    }else{
      status(`${data.title||item.title}: ${mapped}/${available||"?"} capítulos · ${newChapters} novos e ${newPages} páginas agora · o restante entra automaticamente, até 3 capítulos por minuto.`);
    }
    window.dispatchEvent(new Event("mangamorph:chapters-imported"));
    ensureProgressPolling();
    setTimeout(()=>document.querySelector("#adminRefresh")?.click(),250);
  }catch(error){
    item._progress="";
    status(error?.message||"Não foi possível importar a obra do MangásTop.",true);
  }finally{
    busyIndex=null;
    render();
  }
}

form?.addEventListener("submit",()=>{search()});
document.addEventListener("click",event=>{
  const btn=event.target.closest("[data-mangastop-import]");
  if(!btn)return;
  const index=Number(btn.dataset.mangastopImport);
  const item=results[index];
  if(item)importWork(item,index);
});
ensureUi();
