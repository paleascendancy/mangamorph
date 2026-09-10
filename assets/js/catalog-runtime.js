const boot=document.createElement("div");
boot.id="mangamorphCatalogBoot";
boot.setAttribute("aria-hidden","true");
boot.style.cssText="position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#eef1f5;color:#171b22;transition:opacity .18s ease;pointer-events:none";
boot.innerHTML='<div style="display:grid;gap:12px;place-items:center;font:700 13px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase"><span style="font-size:18px;letter-spacing:-.03em;text-transform:none">MangaMorph</span><span style="width:34px;height:34px;border:3px solid rgba(20,27,37,.12);border-top-color:#587dad;border-radius:50%;animation:mmBootSpin .7s linear infinite"></span></div>';
const bootStyle=document.createElement("style");
bootStyle.textContent='@keyframes mmBootSpin{to{transform:rotate(360deg)}}';
document.head.append(bootStyle);
document.body.append(boot);

const premiumCardStyle=document.createElement("style");
premiumCardStyle.id="mangamorphPremiumCatalogCards";
premiumCardStyle.textContent=`
.featured-cover>*{display:none!important}
.featured-cover::before,.featured-cover::after{content:none!important;display:none!important}
.featured-cover[style*="background-image"]{background-size:auto 178%!important;background-position:center top!important;background-repeat:no-repeat!important}
.horizontal-rail{grid-auto-columns:minmax(174px,16.7vw)!important;gap:1rem!important;padding:.45rem .15rem 1.35rem!important}
.premium-manga-card{position:relative!important;isolation:isolate!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:1.28rem!important;background:linear-gradient(180deg,#121822,#0d1219)!important;box-shadow:0 15px 38px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.045)!important;transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease!important}
.premium-manga-card:hover{transform:translateY(-6px)!important;border-color:rgba(151,183,226,.24)!important;box-shadow:0 24px 52px rgba(0,0,0,.34),0 8px 18px rgba(0,0,0,.16)!important}
.premium-manga-card:focus-visible{outline:none!important;box-shadow:0 0 0 3px rgba(91,142,224,.24),0 22px 48px rgba(0,0,0,.3)!important}
.premium-manga-card .manga-cover{position:relative!important;aspect-ratio:3/4.15!important;display:block!important;overflow:hidden!important;padding:0!important;background:linear-gradient(155deg,var(--accent,#34415c),#0a0e15)!important}
.premium-manga-card .manga-cover-image{position:absolute;z-index:0;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:center 12%;opacity:1;transition:transform .42s ease,filter .3s ease,opacity .2s ease;background:#121821}
.premium-manga-card:hover .manga-cover-image{transform:scale(1.045);filter:saturate(1.04) contrast(1.02)}
.premium-manga-card .manga-cover-image.is-broken{opacity:0}
.premium-manga-card .manga-cover::before{content:""!important;display:block!important;position:absolute!important;z-index:1!important;inset:0!important;background:linear-gradient(180deg,rgba(6,10,16,.02) 22%,rgba(6,9,14,.16) 52%,rgba(5,8,13,.94) 100%)!important;pointer-events:none!important}
.premium-manga-card .manga-cover::after{content:"";position:absolute;z-index:2;inset:0;border:1px solid rgba(255,255,255,.08);border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.10);pointer-events:none}
.premium-manga-card .manga-rank{z-index:5!important;top:.7rem!important;left:.7rem!important;min-width:2.35rem!important;height:1.85rem!important;padding:0 .58rem!important;border:1px solid rgba(255,255,255,.15)!important;border-radius:.62rem!important;background:rgba(7,11,17,.66)!important;box-shadow:0 8px 18px rgba(0,0,0,.22)!important;color:#f4f7fb!important;font-size:.65rem!important;font-weight:900!important;letter-spacing:.02em!important;backdrop-filter:blur(10px) saturate(120%)!important;-webkit-backdrop-filter:blur(10px) saturate(120%)!important}
.premium-manga-card .manga-cover-copy{position:absolute!important;z-index:4!important;left:.64rem!important;right:.64rem!important;bottom:.62rem!important;display:block!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
.premium-manga-card .manga-cover-title{display:-webkit-box!important;overflow:hidden!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;color:#fff!important;font-size:.82rem!important;font-weight:900!important;line-height:1.14!important;letter-spacing:-.028em!important;text-shadow:0 2px 16px rgba(0,0,0,.75)!important}
.premium-manga-card .manga-cover-copy small{display:none!important}
.premium-manga-card .manga-info{display:grid!important;gap:.72rem!important;padding:.76rem .78rem .8rem!important;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.012))!important}
.premium-card-chips{display:flex;align-items:center;justify-content:space-between;gap:.45rem;min-width:0}
.premium-card-chip{display:inline-flex;align-items:center;min-width:0;max-width:58%;height:1.72rem;padding:0 .52rem;border:1px solid rgba(255,255,255,.065);border-radius:999px;background:rgba(255,255,255,.035);color:#a8b3c3;font-size:.61rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.premium-card-chip.chapter{max-width:none;color:#d9e2ee;background:rgba(116,151,199,.08);border-color:rgba(116,151,199,.12)}
.premium-card-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr) 2.1rem;align-items:center;gap:.32rem}
.premium-card-stat{display:flex;align-items:center;gap:.28rem;min-width:0;color:#8795a8;font-size:.62rem;font-weight:720;white-space:nowrap}
.premium-card-stat strong{overflow:hidden;text-overflow:ellipsis;color:#b7c3d3;font-weight:800}
.premium-card-stat.rating{color:#b9a578}.premium-card-stat.rating strong{color:#d8c58f}
.premium-card-icon{display:grid;place-items:center;width:1rem;height:1rem;font-size:.61rem;line-height:1;opacity:.9}
.premium-manga-card .favorite-button{display:grid!important;place-items:center!important;width:2.1rem!important;height:2.1rem!important;margin:0!important;padding:0!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:.72rem!important;background:rgba(255,255,255,.035)!important;color:#8996a8!important;font-size:1rem!important;line-height:1!important}
.premium-manga-card .favorite-button.active{color:#f2c96f!important;border-color:rgba(242,201,111,.22)!important;background:rgba(242,201,111,.09)!important}
body.light .premium-manga-card{border-color:rgba(17,25,38,.075)!important;background:linear-gradient(180deg,#fff,#f7f9fc)!important;box-shadow:0 14px 34px rgba(51,65,85,.10),inset 0 1px 0 #fff!important}
body.light .premium-manga-card .manga-info{background:linear-gradient(180deg,#fff,#f8fafc)!important}
body.light .premium-card-chip{border-color:rgba(15,23,42,.07);background:#f4f6f9;color:#657184}
body.light .premium-card-chip.chapter{border-color:rgba(73,113,165,.10);background:#eef4fb;color:#405e82}
body.light .premium-card-stat{color:#8490a0}body.light .premium-card-stat strong{color:#566273}
body.light .premium-card-stat.rating{color:#a1843f}body.light .premium-card-stat.rating strong{color:#7d632c}
body.light .premium-manga-card .favorite-button{border-color:rgba(15,23,42,.07)!important;background:#f3f6fa!important;color:#6f7b8b!important}
body.light .premium-manga-card .favorite-button.active{background:#fff7df!important;color:#ad7f19!important;border-color:rgba(173,127,25,.16)!important}
@media(max-width:980px){.horizontal-rail{grid-auto-columns:minmax(170px,29vw)!important}}
@media(max-width:620px){.horizontal-rail{grid-auto-columns:minmax(168px,44vw)!important;gap:.82rem!important;padding:.35rem .05rem 1.15rem!important}.premium-manga-card{border-radius:1.18rem!important}.premium-manga-card:hover{transform:none!important}.premium-manga-card:hover .manga-cover-image{transform:none}.premium-manga-card .manga-rank{top:.58rem!important;left:.58rem!important}.premium-manga-card .manga-cover-copy{left:.58rem!important;right:.58rem!important;bottom:.56rem!important}.premium-manga-card .manga-cover-title{font-size:.76rem!important}.premium-manga-card .manga-info{gap:.62rem!important;padding:.68rem .66rem .7rem!important}}
@media(prefers-reduced-motion:reduce){.premium-manga-card,.premium-manga-card .manga-cover-image{transition:none!important}}
`;
document.head.append(premiumCardStyle);

function finishBoot(){requestAnimationFrame(()=>requestAnimationFrame(()=>{boot.style.opacity="0";setTimeout(()=>{boot.remove();bootStyle.remove()},190)}))}
const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
function relative(value){if(!value)return"";const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(minutes<1)return"agora";if(minutes<60)return minutes+" min";const hours=Math.floor(minutes/60);if(hours<24)return hours+" h";return Math.floor(hours/24)+" dias"}
function esc(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function compact(value){return new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(Number(value)||0)}
let premiumCatalogMap=new Map();
let premiumEnhanceQueued=false;

function ensureCover(card,item){
  const cover=card.querySelector(".manga-cover");
  if(!cover)return;
  let img=cover.querySelector(".manga-cover-image");
  if(!item.coverUrl){if(img)img.remove();cover.classList.add("cover-missing");return}
  if(!img){
    img=document.createElement("img");
    img.className="manga-cover-image";
    img.alt="";
    img.decoding="async";
    img.loading="lazy";
    img.addEventListener("load",()=>{img.classList.remove("is-broken");cover.classList.remove("cover-missing")});
    img.addEventListener("error",()=>{img.classList.add("is-broken");cover.classList.add("cover-missing")});
    cover.prepend(img);
  }
  if(img.dataset.src!==item.coverUrl){img.dataset.src=item.coverUrl;img.classList.remove("is-broken");img.src=item.coverUrl}
}

function enhanceCard(card){
  if(!card)return;
  const item=premiumCatalogMap.get(Number(card.dataset.manga));
  if(!item)return;
  ensureCover(card,item);
  if(card.dataset.premiumCardVersion==="3")return;
  const cover=card.querySelector(".manga-cover");
  const info=card.querySelector(".manga-info");
  if(!cover||!info)return;
  let copy=cover.querySelector(".manga-cover-copy");
  if(!copy){copy=document.createElement("div");copy.className="manga-cover-copy";cover.append(copy)}
  copy.innerHTML='<span class="manga-cover-title">'+esc(item.title)+'</span>';
  const oldFavorite=info.querySelector("[data-favorite]");
  const active=Boolean(oldFavorite?.classList.contains("active"));
  const rating=Number(item.rating)||0;
  const ratingText=rating>0?rating.toFixed(1).replace(".",","):"—";
  const chapterText=item.chapter===null||item.chapter===undefined||item.chapter==="—"?"—":esc(item.chapter);
  info.innerHTML='<div class="premium-card-chips"><span class="premium-card-chip" title="'+esc(item.genre||"Outros")+'">'+esc(item.genre||"Outros")+'</span><span class="premium-card-chip chapter">Cap. '+chapterText+'</span></div><div class="premium-card-footer"><span class="premium-card-stat"><span class="premium-card-icon" aria-hidden="true">◉</span><strong>'+compact(item.reads)+'</strong></span><span class="premium-card-stat rating"><span class="premium-card-icon" aria-hidden="true">★</span><strong>'+ratingText+'</strong></span><button class="favorite-button '+(active?'active':'')+'" type="button" data-favorite="'+item.id+'" aria-label="'+(active?'Remover dos favoritos':'Adicionar aos favoritos')+'" title="Favoritar">'+(active?'★':'☆')+'</button></div>';
  card.dataset.premiumCardVersion="3";
}
function enhanceAllCards(){premiumEnhanceQueued=false;document.querySelectorAll(".premium-manga-card[data-manga]").forEach(enhanceCard)}
function queueEnhance(){if(premiumEnhanceQueued||!premiumCatalogMap.size)return;premiumEnhanceQueued=true;requestAnimationFrame(enhanceAllCards)}
new MutationObserver(queueEnhance).observe(document.body,{childList:true,subtree:true});

try{
  const [{data,error},{data:chapters,error:chaptersError}]=await Promise.all([
    db.rpc("get_mangamorph_catalog"),
    db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
  ]);
  if(error)throw error;if(chaptersError)throw chaptersError;
  if(data?.length){
    const catalog=data.map((m,i)=>({id:Number(m.id),title:m.title,genre:(m.genres&&m.genres[0])||"Outros",type:m.type||"Mangá",chapter:m.latest_chapter==null?"—":Number(m.latest_chapter),accent:m.accent||"#3a4162",reads:Number(m.reader_count)||0,favorites:Number(m.favorite_count)||0,rating:Number(m.average_rating)||0,newness:Math.max(1,100-i),coverUrl:m.cover_url||null,featured:!!m.featured,description:m.synopsis||"",tags:[...(m.genres||[]),...(m.tags||[])],author:m.author||"",artist:m.artist||"",status:m.publication_status||"",country:m.country||""}));
    premiumCatalogMap=new Map(catalog.map(item=>[item.id,item]));
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));
    requestAnimationFrame(enhanceAllCards);setTimeout(enhanceAllCards,80);setTimeout(enhanceAllCards,350);
    const map=new Map(catalog.map(item=>[item.id,item]));
    const releases=(chapters||[]).map(ch=>({id:ch.id,manga:map.get(Number(ch.manga_id)),chapter:Number(ch.chapter_number),updated:relative(ch.published_at),publishedAt:ch.published_at})).filter(item=>item.manga);
    window.dispatchEvent(new CustomEvent("mangamorph:releases-loaded",{detail:releases}));
  }else window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:"Catálogo vazio"}}));
}catch(error){console.error("MangaMorph catalog runtime:",error);window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:error?.message||"Falha ao carregar catálogo"}}))}finally{finishBoot()}
