import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const style=document.createElement("style");
style.id="mangamorphCatalogCoverFixStyles";
style.textContent=`
  .premium-manga-card .manga-cover{position:relative!important;overflow:hidden!important;background-size:cover!important;background-position:center 12%!important;background-repeat:no-repeat!important}
  .premium-manga-card .manga-cover-image,.premium-manga-card .mm-persistent-cover{position:absolute!important;inset:0!important;z-index:0!important;display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center 12%!important;opacity:1!important;visibility:visible!important;background:transparent!important;transform:scale(1.002);transition:transform .35s ease,filter .25s ease!important;pointer-events:none!important}
  .premium-manga-card:hover .manga-cover-image,.premium-manga-card:hover .mm-persistent-cover{transform:scale(1.035);filter:saturate(1.03) contrast(1.015)}
  .premium-manga-card .manga-cover::before{z-index:1!important}
  .premium-manga-card .manga-cover::after{z-index:2!important}
  .premium-manga-card .manga-cover-copy{z-index:4!important}
  .premium-manga-card .manga-rank{z-index:5!important}
  @media(max-width:620px){.premium-manga-card .manga-cover-image,.premium-manga-card .mm-persistent-cover{object-position:center 10%!important}.premium-manga-card:hover .manga-cover-image,.premium-manga-card:hover .mm-persistent-cover{transform:scale(1.002)}}
`;
document.head.append(style);

let coverMap=new Map();
let queued=false;

function safeUrl(value){
  try{
    const u=new URL(String(value||""),location.href);
    return u.protocol==="https:"?u.href:"";
  }catch{return"";}
}

function attachCover(card){
  if(!card)return;
  const id=Number(card.dataset.manga);
  const src=safeUrl(coverMap.get(id));
  const cover=card.querySelector(".manga-cover");
  if(!cover||!src)return;

  // Inline important background is the permanent visual fallback.
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
    img.referrerPolicy="no-referrer";
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
      card.classList.remove("cover-image-missing");
    };
    img.onerror=()=>{
      // Keep the CSS background fallback and retry once without stale caches.
      if(img.dataset.mmRetried==="1"){
        img.hidden=true;
        return;
      }
      img.dataset.mmRetried="1";
      try{
        const retry=new URL(src);
        retry.searchParams.set("mmcover",String(Date.now()));
        img.src=retry.href;
      }catch{img.hidden=true;}
    };
    img.dataset.mmRetried="0";
    img.src=src;
  }
}

function applyAll(){
  queued=false;
  document.querySelectorAll(".premium-manga-card[data-manga]").forEach(attachCover);
}

function queueApply(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(applyAll);
}

new MutationObserver(queueApply).observe(document.documentElement,{childList:true,subtree:true});

window.addEventListener("mangamorph:catalog-loaded",event=>{
  if(Array.isArray(event.detail)){
    for(const item of event.detail){
      const id=Number(item?.id);
      const url=safeUrl(item?.coverUrl);
      if(Number.isFinite(id)&&url)coverMap.set(id,url);
    }
  }
  queueApply();
});

try{
  const {data,error}=await db.rpc("get_mangamorph_catalog");
  if(error)throw error;
  coverMap=new Map((data||[]).map(item=>[Number(item.id),safeUrl(item.cover_url)]).filter(([,url])=>url));
  applyAll();
  setTimeout(applyAll,100);
  setTimeout(applyAll,500);
}catch(error){
  console.error("MangaMorph cover renderer:",error);
}
