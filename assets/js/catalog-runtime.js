const boot=document.createElement("div");
boot.id="mangamorphCatalogBoot";
boot.setAttribute("aria-hidden","true");
boot.style.cssText="position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#eef1f5;color:#171b22;transition:opacity .18s ease;pointer-events:none";
boot.innerHTML='<div style="display:grid;gap:12px;place-items:center;font:700 13px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase"><span style="font-size:18px;letter-spacing:-.03em;text-transform:none">MangaMorph</span><span style="width:34px;height:34px;border:3px solid rgba(20,27,37,.12);border-top-color:#587dad;border-radius:50%;animation:mmBootSpin .7s linear infinite"></span></div>';
const bootStyle=document.createElement("style");
bootStyle.textContent='@keyframes mmBootSpin{to{transform:rotate(360deg)}}';
document.head.append(bootStyle);
document.body.append(boot);

const cleanCoverStyle=document.createElement("style");
cleanCoverStyle.id="mangamorphCleanCatalogCovers";
cleanCoverStyle.textContent=`
  .featured-cover>*{display:none!important}
  .featured-cover::before,.featured-cover::after{content:none!important;display:none!important}
  .manga-cover::before{content:none!important;display:none!important}
  .featured-cover[style*="background-image"]{background-size:auto 178%!important;background-position:center top!important;background-repeat:no-repeat!important}
  .manga-cover[style*="background-image"]{background-size:auto 150%!important;background-position:center 8%!important;background-repeat:no-repeat!important}

  .premium-manga-card .manga-cover{position:relative!important}
  .premium-manga-card .manga-cover-copy{
    position:absolute!important;
    z-index:4!important;
    left:.48rem!important;
    right:.48rem!important;
    bottom:.48rem!important;
    display:flex!important;
    min-width:0!important;
    flex-direction:column!important;
    gap:.08rem!important;
    padding:.48rem .52rem!important;
    border:1px solid rgba(255,255,255,.10)!important;
    border-radius:.58rem!important;
    background:linear-gradient(180deg,rgba(6,10,16,.58),rgba(6,10,16,.88))!important;
    box-shadow:0 8px 24px rgba(0,0,0,.24)!important;
    backdrop-filter:blur(7px) saturate(115%)!important;
    -webkit-backdrop-filter:blur(7px) saturate(115%)!important;
  }
  .premium-manga-card .manga-cover-title{
    display:-webkit-box!important;
    overflow:hidden!important;
    -webkit-box-orient:vertical!important;
    -webkit-line-clamp:2!important;
    color:#f5f7fb!important;
    font-size:.64rem!important;
    font-weight:820!important;
    line-height:1.2!important;
    letter-spacing:-.015em!important;
    text-shadow:0 1px 8px rgba(0,0,0,.55)!important;
  }
  .premium-manga-card .manga-cover-copy small{display:none!important}
  @media(max-width:560px){
    .premium-manga-card .manga-cover-copy{left:.4rem!important;right:.4rem!important;bottom:.4rem!important;padding:.42rem .46rem!important}
    .premium-manga-card .manga-cover-title{font-size:.6rem!important}
  }
`;
document.head.append(cleanCoverStyle);

function finishBoot(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    boot.style.opacity="0";
    setTimeout(()=>{boot.remove();bootStyle.remove()},190);
  }));
}

const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");

function relative(value){
  if(!value)return"";
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));
  if(minutes<1)return"agora";if(minutes<60)return minutes+" min";
  const hours=Math.floor(minutes/60);if(hours<24)return hours+" h";
  return Math.floor(hours/24)+" dias";
}

try{
  const [{data,error},{data:chapters,error:chaptersError}]=await Promise.all([
    db.rpc("get_mangamorph_catalog"),
    db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
  ]);

  if(error)throw error;
  if(chaptersError)throw chaptersError;

  if(data?.length){
    const catalog=data.map((m,i)=>({
      id:Number(m.id),title:m.title,genre:(m.genres&&m.genres[0])||"Outros",type:m.type||"Mangá",
      chapter:m.latest_chapter==null?"—":Number(m.latest_chapter),accent:m.accent||"#3a4162",reads:Number(m.reader_count)||0,
      favorites:Number(m.favorite_count)||0,rating:Number(m.average_rating)||0,newness:Math.max(1,100-i),
      coverUrl:m.cover_url||null,featured:!!m.featured,description:m.synopsis||"",tags:[...(m.genres||[]),...(m.tags||[])],
      author:m.author||"",artist:m.artist||"",status:m.publication_status||"",country:m.country||""
    }));

    window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));
    const map=new Map(catalog.map(item=>[item.id,item]));
    const releases=(chapters||[]).map(ch=>({
      id:ch.id,manga:map.get(Number(ch.manga_id)),chapter:Number(ch.chapter_number),updated:relative(ch.published_at),publishedAt:ch.published_at
    })).filter(item=>item.manga);
    window.dispatchEvent(new CustomEvent("mangamorph:releases-loaded",{detail:releases}));
  }else{
    window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:"Catálogo vazio"}}));
  }
}catch(error){
  console.error("MangaMorph catalog runtime:",error);
  window.dispatchEvent(new CustomEvent("mangamorph:catalog-error",{detail:{message:error?.message||"Falha ao carregar catálogo"}}));
}finally{
  finishBoot();
}
