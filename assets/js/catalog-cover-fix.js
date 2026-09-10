import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const style=document.createElement("style");
style.id="mangamorphCatalogCoverFixStyles";
style.textContent=`
  .featured-cover{background-color:#151b25!important;background-repeat:no-repeat!important}
  .premium-manga-card .manga-cover{position:relative!important;overflow:hidden!important;background-color:#171d27!important;background-size:cover!important;background-position:center 12%!important;background-repeat:no-repeat!important}
  .premium-manga-card .manga-cover-image,.premium-manga-card .mm-persistent-cover{position:absolute!important;inset:0!important;z-index:0!important;display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center 12%!important;opacity:1!important;visibility:visible!important;background:#171d27!important;transform:scale(1.002);transition:transform .35s ease,filter .25s ease!important;pointer-events:none!important}
  .premium-manga-card:hover .manga-cover-image,.premium-manga-card:hover .mm-persistent-cover{transform:scale(1.035);filter:saturate(1.03) contrast(1.015)}
  .premium-manga-card .manga-cover::before{z-index:1!important}
  .premium-manga-card .manga-cover::after{z-index:2!important}
  .premium-manga-card .manga-cover-copy{z-index:4!important}
  .premium-manga-card .manga-rank{z-index:5!important}
  .search-result-thumb,.ranking-thumb,.release-thumb{background-color:#171d27!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}
  .search-result-thumb.mm-has-cover,.ranking-thumb.mm-has-cover,.release-thumb.mm-has-cover{box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)!important}
  @media(max-width:620px){.premium-manga-card .manga-cover-image,.premium-manga-card .mm-persistent-cover{object-position:center 10%!important}.premium-manga-card:hover .manga-cover-image,.premium-manga-card:hover .mm-persistent-cover{transform:scale(1.002)}}
`;
document.head.append(style);

let coverMap=new Map();
let titleMap=new Map();
let queued=false;

function safeUrl(value){
  try{
    const u=new URL(String(value||""),location.href);
    if(u.protocol!=="https:")return"";
    if(u.hostname==="fnyellunugdfesprmvzm.supabase.co"){
      u.searchParams.delete("v");
      u.searchParams.delete("mmcover");
      u.searchParams.delete("_mmcover");
    }
    return u.href;
  }catch{return"";}
}

function remember(items){
  for(const item of items||[]){
    const id=Number(item?.id);
    const url=safeUrl(item?.coverUrl||item?.cover_url);
    const title=String(item?.title||"").trim().toLowerCase();
    if(Number.isFinite(id)&&url)coverMap.set(id,url);
    if(title&&url)titleMap.set(title,url);
  }
}

function warm(url){
  if(!url)return;
  const img=new Image();
  img.decoding="async";
  img.src=url;
}

function attachCover(card){
  if(!card)return;
  const id=Number(card.dataset.manga);
  const src=safeUrl(coverMap.get(id));
  const cover=card.querySelector(".manga-cover");
  if(!cover||!src)return;

  cover.style.setProperty("background-image",`url("${src.replace(/"/g,"%22")}")`,"important");
  cover.style.setProperty("background-size","cover","important");
  cover.style.setProperty("background-position","center 12%","important");
  cover.style.setProperty("background-repeat","no-repeat","important");

  let img=cover.querySelector(".manga-cover-image,.mm-persistent-cover");
  if(!img){
    img=document.createElement("img");
    img.className="mm-persistent-cover";
    img.alt="";
    img.decoding="async";
    img.loading="eager";
    img.fetchPriority="high";
    img.draggable=false;
    cover.prepend(img);
  }

  if(img.dataset.mmCover!==src){
    img.dataset.mmCover=src;
    img.hidden=false;
    img.style.setProperty("opacity","1","important");
    img.onload=()=>{
      img.hidden=false;
      img.style.setProperty("opacity","1","important");
    };
    img.onerror=()=>{
      img.hidden=true;
      cover.style.setProperty("background-image",`url("${src.replace(/"/g,"%22")}")`,"important");
    };
    img.src=src;
  }
}

function hydrateThumb(selector,parentSelector){
  document.querySelectorAll(selector).forEach(thumb=>{
    const parent=thumb.closest(parentSelector);
    const src=safeUrl(coverMap.get(Number(parent?.dataset.manga)));
    if(!src)return;
    if(thumb.dataset.mmCover===src)return;
    thumb.dataset.mmCover=src;
    thumb.style.setProperty("background-image",`url("${src.replace(/"/g,"%22")}")`,"important");
    thumb.style.setProperty("background-size","cover","important");
    thumb.style.setProperty("background-position","center","important");
    thumb.classList.add("mm-has-cover");
  });
}

function hydrateFeatured(){
  const cover=document.querySelector(".featured-cover");
  const title=document.querySelector("#featuredTitle")?.textContent?.trim().toLowerCase();
  if(!cover||!title)return;
  const src=safeUrl(titleMap.get(title));
  if(!src)return;
  cover.style.setProperty("background-image",`url("${src.replace(/"/g,"%22")}")`,"important");
  cover.style.setProperty("background-size","auto 178%","important");
  cover.style.setProperty("background-position","center top","important");
  cover.style.setProperty("background-repeat","no-repeat","important");
}

function applyAll(){
  queued=false;
  document.querySelectorAll(".premium-manga-card[data-manga]").forEach(attachCover);
  hydrateThumb(".search-result-card[data-manga] .search-result-thumb",".search-result-card");
  hydrateThumb(".ranking-row[data-manga] .ranking-thumb",".ranking-row");
  hydrateThumb(".release-row[data-manga] .release-thumb",".release-row");
  hydrateFeatured();
}

function queueApply(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(applyAll);
}

new MutationObserver(queueApply).observe(document.documentElement,{childList:true,subtree:true,characterData:true});

window.addEventListener("mangamorph:catalog-loaded",event=>{
  if(Array.isArray(event.detail)){
    remember(event.detail);
    [...coverMap.values()].slice(0,18).forEach(warm);
  }
  applyAll();
  setTimeout(applyAll,80);
  setTimeout(applyAll,350);
});

try{
  const {data,error}=await db.rpc("get_mangamorph_catalog");
  if(error)throw error;
  remember(data||[]);
  [...coverMap.values()].slice(0,18).forEach(warm);
  applyAll();
  setTimeout(applyAll,100);
  setTimeout(applyAll,500);
}catch(error){
  console.error("MangaMorph cover renderer:",error);
}
