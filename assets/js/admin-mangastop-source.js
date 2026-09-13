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

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}

function ensureUi(){
  if(!card||document.querySelector("#mangastopImportBlock"))return;
  const block=document.createElement("section");
  block.id="mangastopImportBlock";
  block.hidden=true;
  block.innerHTML='<div class="mangastop-import-head"><div><span>SCAN PARCEIRA</span><strong>MangásTop</strong><small>AniList → MyAnimeList/Jikan → tradução PT-BR</small></div><small id="mangastopImportStatus"></small></div><div class="manga-import-results" id="mangastopImportResults"></div>';
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
    .mangastop-import-actions button:disabled{opacity:.6;cursor:default}
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
    if(busyIndex===index)return{label:item._progress?`Importando ${item._progress}`:"Preparando…",disabled:true,complete:false};
    return{label:item.importComplete?"Importado ✓":item.importedCount?`Continuar ${item.importedCount}/${item.chapterCount||"?"}`:"Adicionar ao MangaMorph",disabled:true,complete:!!item.importComplete};
  }
  if(item.importComplete)return{label:"Importado ✓",disabled:true,complete:true};
  if(Number(item.importedCount)>0)return{label:`Continuar ${item.importedCount}/${item.chapterCount||"?"}`,disabled:false,complete:false};
  return{label:"Adicionar ao MangaMorph",disabled:false,complete:false};
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
    return `<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MT</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">MANGÁSTOP / MANGÁSTOP</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml([item.publicationStatus,item.chapterCount?item.chapterCount+" capítulos":null].filter(Boolean).join(" · ")+progress)}</span><small>${escapeHtml((item.genres||[]).slice(0,4).join(" · ")||"Perfil será enriquecido pelo AniList e MyAnimeList")}</small></div><div class="mangastop-import-actions"><button class="${button.complete?"is-complete":""}" type="button" data-mangastop-import="${index}" ${button.disabled?"disabled":""}>${escapeHtml(button.label)}</button></div></article>`;
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
  const {data:maps,error:mapError}=await supabase.from("mangamorph_partner_work_map").select("external_work_id,manga_id").in("external_work_id",ids);
  if(mapError||!maps?.length)return;
  const mangaIds=[...new Set(maps.map(row=>Number(row.manga_id)).filter(Number.isFinite))];
  if(!mangaIds.length)return;
  const {data:chapters,error:chapterError}=await supabase.from("mangamorph_chapters").select("id,manga_id").in("manga_id",mangaIds);
  if(chapterError)return;
  const counts=new Map();
  for(const chapter of chapters||[])counts.set(Number(chapter.manga_id),(counts.get(Number(chapter.manga_id))||0)+1);
  const workToManga=new Map(maps.map(row=>[String(row.external_work_id),Number(row.manga_id)]));
  for(const item of results){
    const mangaId=workToManga.get(String(item.sourceId||""));
    if(!mangaId)continue;
    const count=counts.get(mangaId)||0;
    item.importedCount=count;
    const available=Number(item.chapterCount)||0;
    item.importComplete=available>0&&count>=available;
  }
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
    const complete=results.filter(item=>item.importComplete).length;
    status(results.length?`${results.length} resultado${results.length===1?"":"s"} do MangásTop${complete?` · ${complete} já importado${complete===1?"":"s"}`:""}.`:"Nenhum resultado do MangásTop.");
  }catch(error){
    results=[];
    render();
    status(error?.message||"Não foi possível pesquisar o MangásTop.",true);
  }
}

async function importWork(item,index){
  if(busyIndex!==null||!item||item.importComplete)return;
  busyIndex=index;
  item._progress="0/"+(item.chapterCount||"?");
  render();
  let totalImported=0,totalPages=0,lastData=null;
  try{
    await getSession();
    status("Preparando obra, perfil e capítulos…");
    const availableHint=Math.max(0,Number(item.chapterCount)||0);
    const maxRounds=Math.max(15,Math.min(60,Math.ceil((availableHint||150)/10)+3));
    for(let round=0;round<maxRounds;round++){
      const {data,error}=await supabase.functions.invoke("mangamorph-import-mangastop",{body:{work_id:Number(item.sourceId),title:item.title,enrich:round===0}});
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||"A importação do MangásTop falhou.");
      lastData=data;
      totalImported+=Number(data?.sync?.imported||0);
      totalPages+=Number(data?.sync?.pages||0);
      const mapped=Number(data?.chapters?.mapped||0);
      const available=Number(data?.chapters?.available||item.chapterCount||0);
      item.importedCount=mapped;
      item.importComplete=!!data?.chapters?.complete||(available>0&&mapped>=available);
      item._progress=`${mapped}/${available||"?"}`;
      render();
      status(`${data.title||item.title}: ${mapped}${available?"/"+available:""} capítulos · ${totalPages} páginas novas nesta execução.`);
      if(item.importComplete)break;
      if(Number(data?.sync?.imported||0)===0)break;
      await new Promise(resolve=>setTimeout(resolve,420));
    }

    const mapped=Number(lastData?.chapters?.mapped||item.importedCount||0);
    const available=Number(lastData?.chapters?.available||item.chapterCount||0);
    const complete=!!lastData?.chapters?.complete||(available>0&&mapped>=available);
    item.importedCount=mapped;
    item.importComplete=complete;
    item._progress="";
    const source=lastData?.metadata_source||"MangásTop";
    const translation=lastData?.translation?.ok===false?"tradução pendente":"PT-BR aplicado";
    status(`${lastData?.title||item.title}: ${mapped}${available?"/"+available:""} capítulos vinculados · ${totalImported} novos · ${totalPages} páginas novas · perfil ${source} · ${translation}${complete?" · concluído.":" · parcial; use Continuar para trazer o restante."}`);
    window.dispatchEvent(new Event("mangamorph:chapters-imported"));
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
