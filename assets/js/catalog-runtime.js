import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const {data}=await db.rpc("get_mangamorph_catalog");
if(data?.length){
  const catalog=data.map((m,i)=>({
    id:Number(m.id),
    title:m.title,
    genre:(m.genres&&m.genres[0])||"Outros",
    type:m.type||"Mangá",
    chapter:Number(m.latest_chapter)||0,
    accent:m.accent||"#3a4162",
    reads:Number(m.reader_count)||0,
    favorites:Number(m.favorite_count)||0,
    rating:Number(m.average_rating)||0,
    newness:Math.max(1,100-i),
    coverUrl:m.cover_url||null,
    description:m.synopsis||"",
    tags:[...(m.genres||[]),...(m.tags||[])]
  }));
  window.dispatchEvent(new CustomEvent("mangamorph:catalog-loaded",{detail:catalog}));
}