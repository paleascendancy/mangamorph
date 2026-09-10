import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const style=document.createElement("style");
style.id="mangamorphCatalogCoverFixStyles";
style.textContent=`
  .premium-manga-card .manga-cover{
    position:relative!important;
    overflow:hidden!important;
    background-size:cover!important;
    background-position:center!important;
  }
  .premium-manga-card .manga-cover-image{
    position:absolute!important;
    inset:0!important;
    z-index:0!important;
    display:block!important;
    width:100%!important;
    height:100%!important;
    object-fit:cover!important;
    object-position:center 18%!important;
    transform:scale(1.001);
    transition:transform .35s ease,filter .25s ease!important;
    background:#e8edf4;
  }
  .premium-manga-card:hover .manga-cover-image{transform:scale(1.035);filter:saturate(1.03) contrast(1.015)}
  .premium-manga-card .manga-cover::before{z-index:1!important}
  .premium-manga-card .manga-cover::after{z-index:2!important}
  .premium-manga-card .manga-rank{z-index:5!important}
  .premium-manga-card .manga-cover-copy{z-index:4!important}
  .premium-manga-card.cover-image-missing .manga-cover{background:linear-gradient(145deg,var(--accent,#42516a),#121821)!important}
  @media(max-width:620px){
    .premium-manga-card .manga-cover-image{object-position:center 16%!important}
    .premium-manga-card:hover .manga-cover-image{transform:scale(1.001)}
  }
  @media(prefers-reduced-motion:reduce){.premium-manga-card .manga-cover-image{transition:none!important}}
`;
document.head.append(style);

let coverMap=new Map();
let applyQueued=false;

function safeHttps(value){
  try{
    const u=new URL(String(value||""),location.href);
    return u.protocol==="https:"?u.href:"";
  }catch{return"";}
}

function applyCover(card){
  if(!card)return;
  const id=Number(card.dataset.manga);
  const url=safeHttps(coverMap.get(id));
  const cover=card.querySelector(".manga-cover");
  if(!cover)return;

  let img=cover.querySelector(".manga-cover-image");
  if(!url){
    img?.remove();
    card.classList.add("cover-image-missing");
    return;
  }

  card.classList.remove("cover-image-missing");
  if(!img){
    img=document.createElement("img");
    img.className="manga-cover-image";
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.referrerPolicy="no-referrer";
    img.addEventListener("error",()=>{
      card.classList.add("cover-image-missing");
      img.hidden=true;
    });
    img.addEventListener("load",()=>{
      card.classList.remove("cover-image-missing");
      img.hidden=false;
    });
    cover.prepend(img);
  }

  if(img.dataset.coverUrl!==url){
    img.dataset.coverUrl=url;
    img.hidden=false;
    img.src=url;
  }
}

function applyAll(){
  applyQueued=false;
  document.querySelectorAll(".premium-manga-card[data-manga]").forEach(applyCover);
}

function queueApply(){
  if(applyQueued)return;
  applyQueued=true;
  requestAnimationFrame(applyAll);
}

const observer=new MutationObserver(queueApply);
observer.observe(document.documentElement,{childList:true,subtree:true});

async function loadCovers(){
  try{
    const {data,error}=await db.rpc("get_mangamorph_catalog");
    if(error)throw error;
    coverMap=new Map((data||[]).map(item=>[Number(item.id),item.cover_url||""]));
    applyAll();
  }catch(error){
    console.error("MangaMorph cover fix:",error);
  }
}

window.addEventListener("mangamorph:catalog-loaded",event=>{
  if(!Array.isArray(event.detail))return;
  for(const item of event.detail){
    if(item&&Number.isFinite(Number(item.id))&&item.coverUrl)coverMap.set(Number(item.id),item.coverUrl);
  }
  applyAll();
});

await loadCovers();
