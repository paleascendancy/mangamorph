import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const mangaId=Number(new URLSearchParams(location.search).get("id"))||1;
const readButton=document.querySelector("#readLatest");
const readLabel=document.querySelector("#readLatestLabel");
const favoriteButton=document.querySelector("#favoriteDetail");
const listButton=document.querySelector("#markDetail");

if(favoriteButton){
  favoriteButton.setAttribute("title","Favoritar");
  favoriteButton.setAttribute("aria-label","Favoritar obra");
}
if(listButton){
  listButton.setAttribute("title","Adicionar à minha lista");
  listButton.setAttribute("aria-label","Adicionar à minha lista");
}

let firstChapter=null;
try{
  const {data,error}=await db.from("mangamorph_chapters")
    .select("chapter_number")
    .eq("manga_id",mangaId)
    .eq("published",true)
    .order("chapter_number",{ascending:true})
    .limit(1);
  if(error)throw error;
  if(data?.length&&Number.isFinite(Number(data[0].chapter_number))){
    firstChapter=Number(data[0].chapter_number);
    if(readLabel)readLabel.textContent="Ler capítulo";
    const kicker=readButton?.querySelector("small");
    if(kicker)kicker.textContent="COMEÇAR";
  }else if(readLabel){
    readLabel.textContent="Sem capítulos";
  }
}catch(error){
  console.error("MangaMorph first chapter action:",error);
}

readButton?.addEventListener("click",event=>{
  if(firstChapter===null)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.href="reader.html?id="+mangaId+"&chapter="+encodeURIComponent(String(firstChapter));
},true);

import("./manga-chapter-source.js?v=003").catch(error=>console.error("MangaMorph chapter source:",error));
import("./manga-page-comments.js?v=002").catch(error=>console.error("MangaMorph page comments:",error));
