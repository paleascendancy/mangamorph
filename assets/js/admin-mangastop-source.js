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
let busy=false;

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}
function ensureUi(){
  if(!card||document.querySelector("#mangastopImportBlock"))return;
  const block=document.createElement("section");
  block.id="mangastopImportBlock";
  block.hidden=true;
  block.innerHTML='<div class="mangastop-import-head"><div><span>SCAN PARCEIRA</span><strong>MangásTop</strong><small>AniList → MyAnimeList/Jikan → tradução PT-BR</small></div><small id="mangastopImportStatus"></small></div><div class="manga-import-results" id="mangastopImportResults"></div>';
  baseResults?.insertAdjacentElement("afterend",block);
  const style=document.createElement("style");
  style.textContent=`#mangastopImportBlock{margin-top:.65rem;padding-top:.65rem;border-top:1px solid rgba(255,255,255,.055)}.mangastop-import-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;margin-bottom:.45rem}.mangastop-import-head span{display:block;color:#6f99db;font-size:.43rem;font-weight:850;letter-spacing:.1em}.mangastop-import-head strong{display:block;margin-top:.08rem;font-size:.7rem}.mangastop-import-head div>small{display:block;margin-top:.14rem;color:#75869c;font-size:.43rem}.mangastop-import-head>small{color:#75869c;font-size:.48rem;text-align:right;max-width:48%}.mangastop-import-actions{display:flex;gap:.3rem;align-items:center}.mangastop-import-actions button{min-height:2.1rem;padding:0 .58rem;border:1px solid rgba(93,146,233,.16);border-radius:.52rem;background:#edf2f7;color:#121821;font-size:.48rem;font-weight:850}.mangastop-import-actions button:disabled{opacity:.55;cursor:default}@media(max-width:520px){.mangastop-import-head{display:block}.mangastop-import-head>small{display:block;max-width:none;text-align:left;margin-top:.3rem}.mangastop-import-actions{grid-column:1/-1}.mangastop-import-actions button{width:100%}}`;
  document.head.appendChild(style);
}
function status(text,error=false){const node=document.querySelector("#mangastopImportStatus");if(!node)return;node.textContent=text||"";node.style.color=error?"#ed9aa5":""}
function render(){ensureUi();const block=document.querySelector("#mangastopImportBlock");const out=document.querySelector("#mangastopImportResults");if(!block||!out)return;block.hidden=false;if(!results.length){out.innerHTML='<div class="empty-admin">Nenhuma obra do MangásTop encontrada.</div>';return}out.innerHTML=results.map((item,index)=>`<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MT</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">MANGÁSTOP / MANGÁSTOP</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml([item.publicationStatus,item.chapterCount?item.chapterCount+" capítulos":null].filter(Boolean).join(" · "))}</span><small>${escapeHtml((item.genres||[]).slice(0,4).join(" · ")||"Perfil será enriquecido pelo AniList e MyAnimeList")}</small></div><div class="mangastop-import-actions"><button type="button" data-mangastop-import="${index}" ${busy?"disabled":""}>${busy?"Importando…":"Importar obra + capítulos"}</button></div></article>`).join("")}
async function getSession(){const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre novamente no painel ADM.");const {data:ok,error}=await supabase.rpc("is_mangamorph_admin");if(error||ok!==true)throw new Error("Sua conta não possui acesso administrativo.");supabase.functions.setAuth(session.access_token);return session}
async function search(){const query=String(input?.value||"").trim();if(query.length<2||/^https?:\/\//i.test(query))return;ensureUi();status("Buscando no MangásTop…");results=[];render();try{await getSession();const {data,error}=await supabase.functions.invoke("mangamorph-search-mangastop",{body:{query}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"A busca no MangásTop falhou.");results=Array.isArray(data.results)?data.results:[];render();status(results.length?`${results.length} resultado${results.length===1?"":"s"} do MangásTop.`:"Nenhum resultado do MangásTop.")}catch(error){results=[];render();status(error?.message||"Não foi possível pesquisar o MangásTop.",true)}}
async function importWork(item){if(busy||!item)return;busy=true;render();let totalImported=0,totalPages=0,lastData=null;try{await getSession();status("Criando a obra e enriquecendo o perfil…");for(let round=0;round<15;round++){const {data,error}=await supabase.functions.invoke("mangamorph-import-mangastop",{body:{work_id:Number(item.sourceId),title:item.title,enrich:round===0}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"A importação do MangásTop falhou.");lastData=data;totalImported+=Number(data?.sync?.imported||0);totalPages+=Number(data?.sync?.pages||0);const mapped=Number(data?.chapters?.mapped||0),available=Number(data?.chapters?.available||0);status(`${data.title||item.title}: ${mapped}${available?"/"+available:""} capítulos vinculados · ${totalPages} páginas nesta importação…`);if(data?.chapters?.complete)break;if(Number(data?.sync?.imported||0)===0)break;await new Promise(resolve=>setTimeout(resolve,420))}
    const mapped=Number(lastData?.chapters?.mapped||0),available=Number(lastData?.chapters?.available||0),complete=!!lastData?.chapters?.complete;const source=lastData?.metadata_source||"MangásTop";const translation=lastData?.translation?.ok===false?" · tradução pendente":" · PT-BR aplicado";status(`${lastData?.title||item.title}: ${mapped}${available?"/"+available:""} capítulos vinculados · ${totalImported} novos · ${totalPages} páginas · perfil ${source}${translation}${complete?".":" · importação parcial; clique novamente para continuar."}`);window.dispatchEvent(new Event("mangamorph:chapters-imported"));if(complete)setTimeout(()=>location.reload(),1300)}catch(error){status(error?.message||"Não foi possível importar a obra do MangásTop.",true)}finally{busy=false;render()}}

form?.addEventListener("submit",()=>{search()});
document.addEventListener("click",event=>{const btn=event.target.closest("[data-mangastop-import]");if(!btn)return;const item=results[Number(btn.dataset.mangastopImport)];if(item)importWork(item)});
ensureUi();
