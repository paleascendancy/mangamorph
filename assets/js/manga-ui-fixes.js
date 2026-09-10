import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const mangaId=Number(new URLSearchParams(location.search).get("id"))||1;
const $=selector=>document.querySelector(selector);
let liveChapters=[];
let chapterOrder=localStorage.getItem("mangamorph:chapter-order")==="asc"?"asc":"desc";
let chapterQuery="";
let commentsLoaded=false;

function esc(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function fmtDate(value){
  if(!value)return"Sem data";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return"Sem data";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
    .format(date).replace(".","");
}

function safeAvatar(value){
  try{
    const url=new URL(String(value||""));
    return url.protocol==="https:"?url.href:"";
  }catch{return"";}
}

function initials(name){
  return (String(name||"Leitor").trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("")||"L").toUpperCase();
}

function installCommentsTab(){
  const relatedTab=$("#tabRelated");
  const nav=relatedTab?.parentElement;
  if(!nav||$("#tabComments"))return;

  const tab=document.createElement("button");
  tab.className="manga-tab";
  tab.id="tabComments";
  tab.type="button";
  tab.setAttribute("role","tab");
  tab.setAttribute("aria-selected","false");
  tab.setAttribute("aria-controls","panelComments");
  tab.dataset.tab="comments";
  tab.innerHTML='Comentários <span id="tabCommentCount"></span>';
  nav.insertBefore(tab,relatedTab);

  const relatedPanel=$("#panelRelated");
  const panel=document.createElement("section");
  panel.className="tab-panel";
  panel.id="panelComments";
  panel.setAttribute("role","tabpanel");
  panel.setAttribute("aria-labelledby","tabComments");
  panel.hidden=true;
  panel.innerHTML=`
    <div class="work-comments-section">
      <div class="chapters-heading work-comments-heading">
        <div>
          <p class="eyebrow">COMUNIDADE</p>
          <h2>Comentários da obra</h2>
          <p>Comentários recentes feitos nos capítulos desta obra.</p>
        </div>
        <span id="workCommentCount">Carregando…</span>
      </div>
      <div class="work-comments-note">Para publicar um comentário, abra o capítulo que você está lendo.</div>
      <div class="work-comments-list" id="workCommentsList">
        <div class="work-comments-loading">Carregando comentários…</div>
      </div>
    </div>`;
  relatedPanel?.parentElement?.insertBefore(panel,relatedPanel);
}

function installStyles(){
  if($("#mangamorphMangaUiFixStyles"))return;
  const style=document.createElement("style");
  style.id="mangamorphMangaUiFixStyles";
  style.textContent=`
    .manga-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
    .work-comments-section{padding-top:.15rem}
    .work-comments-note{margin:0 0 .65rem;padding:.62rem .72rem;border:1px solid rgba(255,255,255,.055);border-radius:.72rem;background:#0d141d;color:#7e8ca0;font-size:.62rem}
    .work-comments-list{display:grid;gap:.46rem}
    .work-comment-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.62rem;align-items:start;padding:.68rem .72rem;border:1px solid rgba(255,255,255,.055);border-radius:.78rem;background:#0f151d}
    .work-comment-avatar{width:2.35rem;height:2.35rem;display:grid;place-items:center;overflow:hidden;border-radius:.7rem;background:linear-gradient(145deg,var(--comment-accent,#526782),#202a38);color:#fff;font-size:.66rem;font-weight:850}
    .work-comment-avatar img{width:100%;height:100%;object-fit:cover}
    .work-comment-body{min-width:0}.work-comment-top{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}.work-comment-top strong{font-size:.68rem}.work-comment-top span{color:#748296;font-size:.54rem}.work-comment-body p{margin:.28rem 0 0;color:#b9c3d1;font-size:.65rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
    .work-comment-open{align-self:center;min-height:2.15rem;padding:0 .62rem;border:1px solid rgba(255,255,255,.06);border-radius:.6rem;background:#171f2a;color:#dce6f2;font-size:.56rem;font-weight:780;white-space:nowrap}
    .work-comments-empty,.work-comments-loading{padding:1.1rem;border:1px dashed rgba(255,255,255,.065);border-radius:.76rem;color:#778496;text-align:center;font-size:.65rem}
    body.light .work-comments-note,body.light .work-comment-card{background:#fff;border-color:rgba(0,0,0,.07)}
    body.light .work-comment-body p{color:#5f6877}body.light .work-comment-open{background:#eef2f7;color:#11151d;border-color:rgba(0,0,0,.06)}
    @media(max-width:560px){.manga-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible}.manga-tab{min-width:0;padding:.64rem .35rem;font-size:.66rem}.work-comment-card{grid-template-columns:auto minmax(0,1fr)}.work-comment-open{grid-column:2;justify-self:start}}
  `;
  document.head.append(style);
}

function setTab(name){
  const panels={chapters:$("#panelChapters"),comments:$("#panelComments"),related:$("#panelRelated")};
  document.querySelectorAll(".manga-tab").forEach(tab=>{
    const active=tab.dataset.tab===name;
    tab.classList.toggle("active",active);
    tab.setAttribute("aria-selected",active?"true":"false");
  });
  Object.entries(panels).forEach(([key,panel])=>{
    if(!panel)return;
    const active=key===name;
    panel.hidden=!active;
    panel.classList.toggle("active",active);
  });
  if(name==="comments")loadComments();
}

function updateSortButton(){
  const button=$("#sortToggle");
  if(!button)return;
  const desc=chapterOrder==="desc";
  button.innerHTML='<span class="sort-value">'+(desc?'Decrescente':'Crescente')+'</span><span class="sort-arrow">'+(desc?'↓':'↑')+'</span>';
  button.setAttribute("aria-pressed",desc?"true":"false");
  button.setAttribute("aria-label","Ordenar capítulos em ordem "+(desc?"crescente":"decrescente"));
}

function renderLiveChapters(){
  const list=$("#chapterList");
  if(!list||!liveChapters.length)return;
  const normalized=chapterQuery.trim().toLowerCase();
  let rows=liveChapters.slice().sort((a,b)=>chapterOrder==="desc"
    ?Number(b.chapter_number)-Number(a.chapter_number)
    :Number(a.chapter_number)-Number(b.chapter_number));
  if(normalized){
    rows=rows.filter(ch=>String(ch.chapter_number).toLowerCase().includes(normalized)||String(ch.title||"").toLowerCase().includes(normalized));
  }
  if(!rows.length){
    list.innerHTML='<div class="chapter-empty">Nenhum capítulo encontrado.</div>';
    return;
  }
  const latest=Math.max(...liveChapters.map(ch=>Number(ch.chapter_number)));
  list.innerHTML=rows.map(ch=>{
    const number=Number(ch.chapter_number);
    const isLatest=number===latest;
    return '<article class="chapter-row '+(isLatest?'latest':'')+'" id="capitulo-'+number+'">'+
      '<div class="chapter-copy"><div class="chapter-number"><strong>Capítulo '+number+'</strong><span class="chapter-meta-line"><span>◷ '+fmtDate(ch.published_at)+'</span>'+(ch.title?'<span>'+esc(ch.title)+'</span>':'')+'</span></div>'+
      (isLatest?'<span class="chapter-badge">NOVO</span>':'')+'</div>'+
      '<button class="chapter-read" type="button" data-read-chapter="'+number+'">Ler <span>›</span></button></article>';
  }).join("");
}

async function loadLiveChapters(){
  const {data,error}=await db.from("mangamorph_chapters")
    .select("id,chapter_number,title,published_at")
    .eq("manga_id",mangaId)
    .eq("published",true)
    .order("chapter_number",{ascending:false});
  if(error||!data?.length)return;
  liveChapters=data;
  const count=$("#chapterCount");
  const tabCount=$("#tabChapterCount");
  if(tabCount)tabCount.textContent=String(liveChapters.length);
  if(count&&!count.textContent.includes("na fonte"))count.textContent=liveChapters.length+" capítulos publicados";
  updateSortButton();
  renderLiveChapters();
}

async function loadComments(){
  if(commentsLoaded)return;
  commentsLoaded=true;
  const list=$("#workCommentsList");
  const count=$("#workCommentCount");
  if(!list)return;

  const {data,error}=await db.from("mangamorph_comments")
    .select('id,manga_id,chapter_number,user_id,content,created_at,author:mangamorph_profiles!mangamorph_comments_user_id_fkey(display_name,username,avatar_url,accent)')
    .eq("manga_id",mangaId)
    .order("created_at",{ascending:false})
    .limit(80);

  if(error){
    list.innerHTML='<div class="work-comments-empty">Não foi possível carregar os comentários agora.</div>';
    if(count)count.textContent="—";
    return;
  }

  const comments=data||[];
  if(count)count.textContent=comments.length+(comments.length===1?" comentário":" comentários");
  const tabCount=$("#tabCommentCount");
  if(tabCount)tabCount.textContent=comments.length?String(comments.length):"";
  if(!comments.length){
    list.innerHTML='<div class="work-comments-empty">Ainda não há comentários nesta obra.</div>';
    return;
  }

  list.innerHTML=comments.map(comment=>{
    const author=comment.author||{};
    const name=author.display_name||"Leitor";
    const avatar=safeAvatar(author.avatar_url);
    const chapter=Number(comment.chapter_number);
    return '<article class="work-comment-card">'+
      '<div class="work-comment-avatar" style="--comment-accent:'+esc(author.accent||"#526782")+'">'+(avatar?'<img src="'+esc(avatar)+'" alt="" loading="lazy">':'<span>'+esc(initials(name))+'</span>')+'</div>'+
      '<div class="work-comment-body"><div class="work-comment-top"><strong>'+esc(name)+'</strong><span>Cap. '+chapter+'</span><span>· '+fmtDate(comment.created_at)+'</span></div><p>'+esc(comment.content)+'</p></div>'+
      '<button class="work-comment-open" type="button" data-open-comment-chapter="'+chapter+'">Abrir cap. '+chapter+'</button>'+ 
    '</article>';
  }).join("");
}

installStyles();
installCommentsTab();

document.addEventListener("click",event=>{
  const tab=event.target.closest(".manga-tab");
  if(tab&&["chapters","comments","related"].includes(tab.dataset.tab)){
    event.preventDefault();
    event.stopImmediatePropagation();
    setTab(tab.dataset.tab);
    return;
  }

  const sort=event.target.closest("#sortToggle");
  if(sort){
    event.preventDefault();
    event.stopImmediatePropagation();
    chapterOrder=chapterOrder==="desc"?"asc":"desc";
    localStorage.setItem("mangamorph:chapter-order",chapterOrder);
    updateSortButton();
    renderLiveChapters();
    return;
  }

  const openComment=event.target.closest("[data-open-comment-chapter]");
  if(openComment){
    event.preventDefault();
    location.href="reader.html?id="+mangaId+"&chapter="+openComment.dataset.openCommentChapter+"#chapterCommunity";
  }
},true);

document.addEventListener("input",event=>{
  if(event.target?.id!=="chapterSearch")return;
  event.stopImmediatePropagation();
  chapterQuery=event.target.value||"";
  renderLiveChapters();
},true);

await loadLiveChapters();