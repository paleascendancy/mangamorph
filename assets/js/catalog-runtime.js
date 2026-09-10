import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
function relative(value){
  if(!value)return"";
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));
  if(minutes<1)return"agora";if(minutes<60)return minutes+" min";
  const hours=Math.floor(minutes/60);if(hours<24)return hours+" h";
  return Math.floor(hours/24)+" dias";
}
const [{data},{data:chapters}]=await Promise.all([
  db.rpc("get_mangamorph_catalog"),
  db.from("mangamorph_chapters").select("id,manga_id,chapter_number,title,published_at").eq("published",true).order("published_at",{ascending:false}).limit(150)
]);
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
}