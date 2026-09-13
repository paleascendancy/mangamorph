function esc(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function relative(value){if(!value)return"";const m=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(m<1)return"agora";if(m<60)return m+" min";const h=Math.floor(m/60);if(h<24)return h+" h";return Math.floor(h/24)+" dias"}
function stableCoverUrl(value){const raw=String(value||"").trim();if(!raw)return"";try{const url=new URL(raw,location.href);if(url.hostname==="fnyellunugdfesprmvzm.supabase.co"){url.searchParams.delete("v");url.searchParams.delete("_mmcover")}return url.href}catch{return raw}}

let catalogMap=new Map();
let enhanceQueued=false;
let hasLoaded=false;
let refreshTimer=null;
let lastFingerprint="";

function setCatalogLoadingState(loading){
  const hero=document.querySelector(".hero-feature");
  const rails=["#favoriteRail","#popularRail","#newRail","#releaseList"].map(s=>document.querySelector(s)).filter(Boolean);
  document.documentElement.classList.toggle("mm-catalog-loading",loading);
  hero?.toggleAttribute("aria-busy",loading);
  rails.forEach(el=>el.toggleAttribute("aria-busy",loading));
  if(loading&&!hasLoaded){
    if(hero)hero.style.visibility="hidden";
    rails.forEach(el=>el.style.visibility="hidden");
  }else{
    if(hero)hero.style.removeProperty("visibility");
    rails.forEach(el=>el.style.removeProperty("visibility"));
  }
}

function showCatalogError(message){
  if(hasLoaded)return;
  const title=document.querySelector("#featuredTitle");
  const description=document.querySelector(".featured-description");
  const actions=document.querySelector(".featured-actions");
  if(title)title.textContent="Catálogo indisponível";
  if(description)description.textContent=message||"Não foi possível carregar as obras agora.";
  if(actions)actions.style.display="none";
  ["#favoriteRail","#popularRail","#newRail","#releaseList"].forEach(s=>document.querySelector(s)?.replaceChildren());
  setCatalogLoadingState(false);
}

function installCoverImage(cover,item){
  const src=stableCoverUrl(item?.coverUrl);if(!cover||!src)return;
  let image=cover.querySelector(".manga-cover-image");
  if(!image){image=document.createElement("img");image.className="manga-cover-image";image.alt="";image.decoding="async";image.loading="lazy";image.fetchPriority="low";image.setAttribute("aria-hidden","true");image.draggable=false;cover.prepend(image)}
  if(image.dataset.src!==src){image.dataset.src=src;image.src=src}
}
function enhanceCard(card){
  const item=catalogMap.get(Number(card?.dataset.manga));if(!item)return;
  const cover=card.querySelector(".manga-cover"),info=card.querySelector(".manga-info");if(!cover||!info)return;
  installCoverImage(cover,item);
  let copy=cover.querySelector(".manga-cover-copy");if(!copy){copy=document.createElement("div");copy.className="manga-cover-copy";cover.append(copy)}
  copy.innerHTML='<span class="manga-cover-title">'+esc(item.title)+'</span>';
  const oldFavorite=info.querySelector("[data-favorite]");const active=Boolean(oldFavorite?.classList.contains("active"));const chapter=item.chapter==null?"—":esc(item.chapter);
  info.innerHTML='<button class="favorite-button mm-card-favorite '+(active?'active':'')+'" type="button" data-favorite="'+item.id+'" aria-label="'+(active?'Remover dos favoritos':'Adicionar aos favoritos')+'">'+(active?'★':'☆')+'</button><span class="mm-card-chapter">Cap. '+chapter+'</span>';
}
function hydrateThumbs(){
  const selectors=[[".search-result-card[data-manga] .search-result-thumb",".search-result-card"],[".ranking-row[data-manga] .ranking-thumb",".ranking-row"],[".release-row[data-manga] .release-thumb",".release-row"]];
  for(const [thumbSelector,parentSelector] of selectors)document.querySelectorAll(thumbSelector).forEach(thumb=>{const parent=thumb.closest(parentSelector);const item=catalogMap.get(Number(parent?.dataset.manga));const src=stableCoverUrl(item?.coverUrl);if(!src||thumb.dataset.coverSrc===src)return;thumb.dataset.coverSrc=src;thumb.style.backgroundImage='url("'+src.replace(/"/g,"%22")+'")';thumb.style.backgroundSize="cover";thumb.style.backgroundPosition="center"})
}
function enhanceAll(){enhanceQueued=false;document.querySelectorAll(".premium-manga-card[data-manga],.manga-card[data-manga]").forEach(enhanceCard);hydrateThumbs()}
function queueEnhance(){if(enhanceQueued||!catalogMap.size)return;enhanceQueued=true;requestAnimationFrame(enhanceAll)}
new MutationObserver(queueEnhance).observe(document.body,{childList:true,subtree:true});

setCatalogLoadingState(true);

const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function mapCatalog(data){return (data||[]).map((m,i)=>({id:Number(m.id),title:m.title,genre:(m.genres&&m.genres[0])||"Outros",type:m.type||"Mangá",chapter:m.latest_chapter==null?"—":Number(m.latest_chapter),accent:m.accent||"#3a4162",reads:Number(m.reader_count)||0,favorites:Number(m.favorite_count)||0,rating:Number(m.average_rating)||0,newness:Math.max(1,100-i),coverUrl:stableCoverUrl(m.cover_url||""),featured:!!m.featured,description:m.synopsis||"",tags:[...(m.genres||[]),...(m.tags||[])],author:m.author||"",artist:m.artist||"",status:m.publication_status||"",country:m.country||""}))}
function fingerprint(catalog,chapters){return JSON.stringify([catalog.map(x=>[x.id,x.title,x.chapter,x.coverUrl,x.featured,x.reads,x.favorites,x.rating,x.status]),(chapters||[]).map(x=>[x.id,x.manga_id,x.chapter_number,x.published_at,x.title])])}

async function refreshCatalog({initial=false}={}){
  if(initial)setCatalogLoadingState(true);
  try{
    const [{data,error},{data:chapters,error:chaptersError}]=await Promise.all([
      db.rpc("get_mangamorph_catalog"),
      db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
    ]);
    if(error)throw error;if(chaptersError)throw chaptersError;
    const catalog=mapCatalog(data);
    if(!catalog.length){if(!hasLoaded)showCatalogError("Nenhuma obra foi encontrada no catálogo.");return}
    const nextFingerprint=fingerprint(catalog,chapters);
    if(nextFingerprint===lastFingerprint){setCatalogLoadingState(false);return}
    lastFingerprint=nextFingerprint;
    catalogMap=new Map(catalog.map(item=>[item.id,item]));
    window.__MM_CATALOG__=catalog;
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));
    const map=new Map(catalog.map(item=>[item.id,item]));
    const releases=(chapters||[]).map(ch=>({id:ch.id,manga:map.get(Number(ch.manga_id)),chapter:Number(ch.chapter_number),updated:relative(ch.published_at),publishedAt:ch.published_at})).filter(item=>item.manga);
    window.dispatchEvent(new CustomEvent("mangamorph:releases-loaded",{detail:releases}));
    hasLoaded=true;
    requestAnimationFrame(()=>{enhanceAll();setCatalogLoadingState(false)});
  }catch(error){
    console.error("MangaMorph catalog runtime:",error);
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:error?.message||"Falha ao carregar catálogo"}}));
    if(!hasLoaded)showCatalogError("Não foi possível carregar o catálogo agora. Atualize a página em alguns instantes.");
  }
}

function scheduleRefresh(delay=180){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshCatalog(),delay)}

await refreshCatalog({initial:true});

const channel=db.channel("mangamorph-live-catalog")
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_mangas"},()=>scheduleRefresh())
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_chapters"},()=>scheduleRefresh())
  .subscribe(status=>{if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("MangaMorph realtime catalog:",status)});

setInterval(()=>{if(document.visibilityState==="visible")refreshCatalog()},45000);
window.addEventListener("focus",()=>scheduleRefresh(50));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")scheduleRefresh(50)});
window.addEventListener("beforeunload",()=>{try{db.removeChannel(channel)}catch{}});
