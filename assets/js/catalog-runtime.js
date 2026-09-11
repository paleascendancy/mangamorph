function esc(value){
  return String(value??"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function relative(value){
  if(!value)return"";
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));
  if(minutes<1)return"agora";
  if(minutes<60)return minutes+" min";
  const hours=Math.floor(minutes/60);
  if(hours<24)return hours+" h";
  return Math.floor(hours/24)+" dias";
}

function stableCoverUrl(value){
  const raw=String(value||"").trim();
  if(!raw)return"";
  try{
    const url=new URL(raw,location.href);
    if(url.hostname==="fnyellunugdfesprmvzm.supabase.co"){
      url.searchParams.delete("v");
      url.searchParams.delete("_mmcover");
    }
    return url.href;
  }catch{return raw;}
}

let catalogMap=new Map();
let enhanceQueued=false;

function installCoverImage(cover,item){
  if(!cover||!item)return;
  const src=stableCoverUrl(item.coverUrl);
  let image=cover.querySelector(".manga-cover-image");
  if(!src){
    if(image)image.remove();
    return;
  }
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
  if(image.dataset.src!==src){
    image.dataset.src=src;
    image.src=src;
  }
}

function enhanceCard(card){
  if(!card)return;
  const item=catalogMap.get(Number(card.dataset.manga));
  if(!item)return;
  const cover=card.querySelector(".manga-cover");
  const info=card.querySelector(".manga-info");
  if(!cover||!info)return;

  installCoverImage(cover,item);

  let copy=cover.querySelector(".manga-cover-copy");
  if(!copy){
    copy=document.createElement("div");
    copy.className="manga-cover-copy";
    cover.append(copy);
  }
  copy.innerHTML='<span class="manga-cover-title">'+esc(item.title)+'</span>';

  const oldFavorite=info.querySelector("[data-favorite]");
  const active=Boolean(oldFavorite?.classList.contains("active"));
  const chapter=item.chapter===null||item.chapter===undefined||item.chapter==="—"?"—":esc(item.chapter);
  info.innerHTML=
    '<button class="favorite-button mm-card-favorite '+(active?'active':'')+'" type="button" data-favorite="'+item.id+'" aria-label="'+(active?'Remover dos favoritos':'Adicionar aos favoritos')+'">'+(active?'★':'☆')+'</button>'+
    '<span class="mm-card-chapter">Cap. '+chapter+'</span>';
}

function hydrateThumbs(){
  const selectors=[
    [".search-result-card[data-manga] .search-result-thumb",".search-result-card"],
    [".ranking-row[data-manga] .ranking-thumb",".ranking-row"],
    [".release-row[data-manga] .release-thumb",".release-row"]
  ];
  for(const [thumbSelector,parentSelector] of selectors){
    document.querySelectorAll(thumbSelector).forEach(thumb=>{
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

function enhanceAll(){
  enhanceQueued=false;
  document.querySelectorAll(".premium-manga-card[data-manga],.manga-card[data-manga]").forEach(enhanceCard);
  hydrateThumbs();
}

function queueEnhance(){
  if(enhanceQueued||!catalogMap.size)return;
  enhanceQueued=true;
  requestAnimationFrame(enhanceAll);
}

new MutationObserver(queueEnhance).observe(document.body,{childList:true,subtree:true});

(async()=>{
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const db=createClient(
      "https://fnyellunugdfesprmvzm.supabase.co",
      "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
    );

    const [{data,error},{data:chapters,error:chaptersError}]=await Promise.all([
      db.rpc("get_mangamorph_catalog"),
      db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
    ]);

    if(error)throw error;
    if(chaptersError)throw chaptersError;

    const catalog=(data||[]).map((m,i)=>({
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

    if(!catalog.length){
      window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:"Catálogo vazio"}}));
      return;
    }

    catalogMap=new Map(catalog.map(item=>[item.id,item]));
    window.__MM_CATALOG__=catalog;
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));

    requestAnimationFrame(enhanceAll);
    setTimeout(enhanceAll,120);

    const map=new Map(catalog.map(item=>[item.id,item]));
    const releases=(chapters||[]).map(ch=>({
      id:ch.id,
      manga:map.get(Number(ch.manga_id)),
      chapter:Number(ch.chapter_number),
      updated:relative(ch.published_at),
      publishedAt:ch.published_at
    })).filter(item=>item.manga);
    window.dispatchEvent(new CustomEvent("mangamorph:releases-loaded",{detail:releases}));
  }catch(error){
    console.error("MangaMorph catalog runtime:",error);
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:error?.message||"Falha ao carregar catálogo"}}));
  }
})();
