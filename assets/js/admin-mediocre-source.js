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
  if(!card||document.querySelector("#mediocreImportBlock"))return;
  const block=document.createElement("section");
  block.id="mediocreImportBlock";
  block.hidden=true;
  block.innerHTML='<div class="mediocre-import-head"><div><span>SCAN PARCEIRA</span><strong>Medíocre Scan</strong></div><small id="mediocreImportStatus"></small></div><div class="manga-import-results" id="mediocreImportResults"></div>';
  baseResults?.insertAdjacentElement("afterend",block);
  const style=document.createElement("style");
  style.textContent=`#mediocreImportBlock{margin-top:.65rem;padding-top:.65rem;border-top:1px solid rgba(255,255,255,.055)}.mediocre-import-head{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-bottom:.45rem}.mediocre-import-head span{display:block;color:#6f99db;font-size:.43rem;font-weight:850;letter-spacing:.1em}.mediocre-import-head strong{display:block;margin-top:.08rem;font-size:.7rem}.mediocre-import-head small{color:#75869c;font-size:.48rem}.mediocre-import-actions{display:flex;gap:.3rem;align-items:center}.mediocre-import-actions button{min-height:2.1rem;padding:0 .55rem;border:1px solid rgba(93,146,233,.16);border-radius:.52rem;background:#16243a;color:#b9d1f7;font-size:.48rem;font-weight:800}.mediocre-import-actions button.primary{background:#edf2f7;color:#121821}.mediocre-import-actions button:disabled{opacity:.55;cursor:default}@media(max-width:520px){.mediocre-import-actions{grid-column:1/-1}.mediocre-import-actions button{width:100%}}`;
  document.head.appendChild(style);
}
function status(text,error=false){const node=document.querySelector("#mediocreImportStatus");if(!node)return;node.textContent=text||"";node.style.color=error?"#ed9aa5":""}
function render(){ensureUi();const block=document.querySelector("#mediocreImportBlock");const out=document.querySelector("#mediocreImportResults");if(!block||!out)return;block.hidden=false;if(!results.length){out.innerHTML='<div class="empty-admin">Nenhuma obra da Medíocre encontrada.</div>';return}out.innerHTML=results.map((item,index)=>`<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MM</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">MEDÍOCRE SCAN</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml([item.publicationStatus,item.chapterCount?item.chapterCount+" capítulos":null].filter(Boolean).join(" · "))}</span><small>${escapeHtml((item.genres||[]).slice(0,4).join(" · ")||"Obra disponível na scan")}</small></div><div class="mediocre-import-actions"><button class="primary" type="button" data-mediocre-import="${index}">${busy?"Importando…":"Importar obra + capítulos"}</button></div></article>`).join("")}
async function getSession(){const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre novamente no painel ADM.");const {data:ok,error}=await supabase.rpc("is_mangamorph_admin");if(error||ok!==true)throw new Error("Sua conta não possui acesso administrativo.");supabase.functions.setAuth(session.access_token);return session}
async function search(){const query=String(input?.value||"").trim();if(query.length<2||/^https?:\/\//i.test(query))return;ensureUi();status("Buscando…");results=[];render();try{await getSession();const {data,error}=await supabase.functions.invoke("mangamorph-search-mediocre",{body:{query}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"A busca na Medíocre falhou.");results=Array.isArray(data.results)?data.results:[];render();status(results.length?`${results.length} resultado${results.length===1?"":"s"} da Medíocre.`:"Nenhum resultado da Medíocre.")}catch(error){results=[];render();status(error?.message||"Não foi possível pesquisar a Medíocre.",true)}}
async function importWork(item){if(busy||!item)return;busy=true;render();status("Importando obra e capítulos…");try{await getSession();const {data,error}=await supabase.functions.invoke("mangamorph-import-mediocre",{body:{work_id:Number(item.sourceId),max_chapters:80}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"A importação falhou.");const parts=[`${data.chapters_imported||0} capítulo(s) novo(s)`,`${data.chapters_updated||0} atualizado(s)`,`${data.pages||0} páginas`];if(data.partial)parts.push(`foram processados ${data.chapters_checked||80} de ${data.chapters_available||"?"} capítulos`);status(`${data.title}: ${parts.join(" · ")}.`);window.dispatchEvent(new Event("mangamorph:chapters-imported"));setTimeout(()=>location.reload(),900)}catch(error){status(error?.message||"Não foi possível importar a obra.",true)}finally{busy=false;render()}}
form?.addEventListener("submit",()=>{search()});
document.addEventListener("click",event=>{const btn=event.target.closest("[data-mediocre-import]");if(!btn)return;const item=results[Number(btn.dataset.mediocreImport)];if(item)importWork(item)});
ensureUi();