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
  .manga-cover-copy,.manga-cover-title{display:none!important}
  .manga-cover::before{content:none!important;display:none!important}
  .featured-cover[style*="background-image"]{background-size:auto 178%!important;background-position:center top!important;background-repeat:no-repeat!important}
  .manga-cover[style*="background-image"]{background-size:auto 150%!important;background-position:center 8%!important;background-repeat:no-repeat!important}
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
      chapter:Number(m.latest_chapter)||0,accent:m.accent||"#3a4162",reads:Number(m.reader_count)||0,
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