function esc(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function relative(value){if(!value)return"";const m=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(m<1)return"agora";if(m<60)return m+" min";const h=Math.floor(m/60);if(h<24)return h+" h";return Math.floor(h/24)+" dias"}
function stableCoverUrl(value){const raw=String(value||"").trim();if(!raw)return"";try{const url=new URL(raw,location.href);if(url.hostname==="fnyellunugdfesprmvzm.supabase.co"){url.searchParams.delete("v");url.searchParams.delete("_mmcover")}return url.href}catch{return raw}}

const CACHE_KEY="mangamorph:catalog-cache:v3";
let catalogMap=new Map();
let hasLoaded=false;
let lastFingerprint="";
let refreshTimer=null;
let db=null;
let channel=null;

function setLoading(loading){
  document.documentElement.classList.toggle("mm-catalog-loading",loading);
  const hero=document.querySelector(".hero-feature");
  hero?.toggleAttribute("aria-busy",loading);
  ["#favoriteRail","#popularRail","#newRail","#releaseList"].forEach(selector=>document.querySelector(selector)?.toggleAttribute("aria-busy",loading));

  // Never hide the whole home while waiting for Supabase.
  if(loading&&!hasLoaded){
    const title=document.querySelector("#featuredTitle");
    const description=document.querySelector(".featured-description");
    const actions=document.querySelector(".featured-actions");
    if(title)title.textContent="Carregando catálogo…";
    if(description)description.textContent="Buscando as obras mais recentes do MangaMorph.";
    if(actions)actions.style.visibility="hidden";
  }
}

function showError(message){
  if(hasLoaded)return;
  const title=document.querySelector("#featuredTitle");
  const description=document.querySelector(".featured-description");
  const actions=document.querySelector(".featured-actions");
  if(title)title.textContent="Catálogo temporariamente indisponível";
  if(description)description.textContent=message||"Não foi possível atualizar agora. Tente novamente em alguns instantes.";
  if(actions)actions.style.visibility="hidden";
  setLoading(false);
}

function mapCatalog(data){
  return (data||[]).map((m,i)=>({
    id:Number(m.id),
    title:m.title,
    genre:(m.genres&&m.genres[0])||"Outros",
    type:m.type||"Mangá",
    chapter:m.latest_chapter==null?"—":Number(m.latest_chapter),
    accent:m.accent||"#3a4162",
    reads:Number(m.reader_count)||0,
    favorites:Number(m.favorite_count)||0,
    rating:Number(m.average_rating)||0,
    newness:Math.max(1,100-i),
    coverUrl:stableCoverUrl(m.cover_url||""),
    featured:!!m.featured,
    description:m.synopsis||"",
    tags:[...(m.genres||[]),...(m.tags||[])],
    author:m.author||"",
    artist:m.artist||"",
    status:m.publication_status||"",
    country:m.country||""
  }));
}

function fingerprint(catalog,chapters){
  return JSON.stringify([
    catalog.map(x=>[x.id,x.title,x.chapter,x.coverUrl,x.featured,x.reads,x.favorites,x.rating,x.status]),
    (chapters||[]).map(x=>[x.id,x.manga_id,x.chapter_number,x.published_at,x.title])
  ]);
}

function readCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(!cached||!Array.isArray(cached.catalog)||!cached.catalog.length)return null;
    if(Date.now()-Number(cached.savedAt||0)>7*24*60*60*1000)return null;
    return cached;
  }catch{return null}
}

function saveCache(catalog,chapters){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),catalog,chapters:Array.isArray(chapters)?chapters.slice(0,150):[]}))}catch{}
}

function installCoverImage(cover,item){
  const src=stableCoverUrl(item?.coverUrl);if(!cover||!src)return;
  let image=cover.querySelector(".manga-cover-image");
  if(!image){
    image=document.createElement("img");
    image.className="manga-cover-image";
    image.alt="";
    image.decoding="async";
    image.loading="lazy";
    image.fetchPriority="low";
    image.setAttribute("aria-hidden","true");
    image.draggable=false;
    cover.prepend(image);
  }
  if(image.dataset.src!==src){image.dataset.src=src;image.src=src}
}

function enhanceAll(){
  document.querySelectorAll(".premium-manga-card[data-manga],.manga-card[data-manga]").forEach(card=>{
    const item=catalogMap.get(Number(card.dataset.manga));
    if(!item)return;
    const cover=card.querySelector(".manga-cover");
    if(cover)installCoverImage(cover,item);
  });
  const thumbPairs=[[".search-result-card[data-manga] .search-result-thumb",".search-result-card"],[".ranking-row[data-manga] .ranking-thumb",".ranking-row"],[".release-row[data-manga] .release-thumb",".release-row"]];
  for(const [selector,parentSelector] of thumbPairs){
    document.querySelectorAll(selector).forEach(thumb=>{
      const parent=thumb.closest(parentSelector);
      const item=catalogMap.get(Number(parent?.dataset.manga));
      const src=stableCoverUrl(item?.coverUrl);
      if(!src||thumb.dataset.coverSrc===src)return;
      thumb.dataset.coverSrc=src;
      thumb.style.backgroundImage='url("'+src.replace(/"/g,"%22")+'")';
      thumb.style.backgroundSize="cover";
      thumb.style.backgroundPosition="center";
    });
  }
}

function applySnapshot(catalog,chapters){
  if(!Array.isArray(catalog)||!catalog.length)return false;
  const safeChapters=Array.isArray(chapters)?chapters:[];
  const nextFingerprint=fingerprint(catalog,safeChapters);
  if(nextFingerprint===lastFingerprint){setLoading(false);return true}
  lastFingerprint=nextFingerprint;
  catalogMap=new Map(catalog.map(item=>[Number(item.id),item]));
  window.__MM_CATALOG__=catalog;
  window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));

  const map=new Map(catalog.map(item=>[Number(item.id),item]));
  const releases=safeChapters.map(ch=>({
    id:ch.id,
    manga:map.get(Number(ch.manga_id)),
    chapter:Number(ch.chapter_number),
    updated:relative(ch.published_at),
    publishedAt:ch.published_at
  })).filter(item=>item.manga);
  window.dispatchEvent(new CustomEvent("mangamorph:releases-loaded",{detail:releases}));

  hasLoaded=true;
  const actions=document.querySelector(".featured-actions");
  if(actions)actions.style.removeProperty("visibility");
  requestAnimationFrame(()=>{enhanceAll();setLoading(false)});
  return true;
}

new MutationObserver(()=>{if(catalogMap.size)requestAnimationFrame(enhanceAll)}).observe(document.body,{childList:true,subtree:true});

const cached=readCache();
if(cached)applySnapshot(cached.catalog,cached.chapters||[]);
else setLoading(true);

try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}catch(error){
  console.error("MangaMorph Supabase runtime:",error);
  if(!hasLoaded)showError("Não foi possível conectar ao catálogo agora. Atualize a página para tentar novamente.");
}

async function refreshCatalog({initial=false}={}){
  if(!db)return;
  if(initial&&!hasLoaded)setLoading(true);
  const previous=readCache();
  try{
    const [catalogResult,chaptersResult]=await Promise.allSettled([
      db.rpc("get_mangamorph_catalog"),
      db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
    ]);

    let catalog=null;
    let chapters=null;
    let catalogError=null;
    let chaptersError=null;

    if(catalogResult.status==="fulfilled"){
      catalogError=catalogResult.value?.error||null;
      if(!catalogError)catalog=mapCatalog(catalogResult.value?.data||[]);
    }else catalogError=catalogResult.reason;

    if(chaptersResult.status==="fulfilled"){
      chaptersError=chaptersResult.value?.error||null;
      if(!chaptersError)chapters=chaptersResult.value?.data||[];
    }else chaptersError=chaptersResult.reason;

    if(!catalog?.length){
      if(previous?.catalog?.length){
        applySnapshot(previous.catalog,chapters||previous.chapters||[]);
        return;
      }
      throw catalogError||new Error("Nenhuma obra foi encontrada no catálogo.");
    }

    if(chaptersError)console.warn("MangaMorph capítulos recentes:",chaptersError);
    const effectiveChapters=chapters||previous?.chapters||[];
    saveCache(catalog,effectiveChapters);
    applySnapshot(catalog,effectiveChapters);
  }catch(error){
    console.error("MangaMorph catalog runtime:",error);
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:error?.message||"Falha ao carregar catálogo"}}));
    if(!hasLoaded)showError("Não foi possível carregar o catálogo agora. Atualize a página em alguns instantes.");
    else setLoading(false);
  }
}

function scheduleRefresh(delay=180){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshCatalog(),delay)}

if(db)await refreshCatalog({initial:true});

if(db){
  channel=db.channel("mangamorph-live-catalog")
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_mangas"},()=>scheduleRefresh())
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_chapters"},()=>scheduleRefresh())
    .subscribe(status=>{if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("MangaMorph realtime catalog:",status)});
}

setInterval(()=>{if(db&&document.visibilityState==="visible")refreshCatalog()},45000);
window.addEventListener("focus",()=>{if(db)scheduleRefresh(50)});
document.addEventListener("visibilitychange",()=>{if(db&&document.visibilityState==="visible")scheduleRefresh(50)});
window.addEventListener("beforeunload",()=>{try{if(db&&channel)db.removeChannel(channel)}catch{}});
