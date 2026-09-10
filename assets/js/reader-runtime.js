import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const p=new URLSearchParams(location.search);
const mangaId=Number(p.get("id"))||1,chapterNumber=Number(p.get("chapter"))||1;
const [{data:manga},{data:chapters}]=await Promise.all([
  db.from("mangamorph_mangas").select("id,title,accent,cover_url").eq("id",mangaId).maybeSingle(),
  db.from("mangamorph_chapters").select("id,chapter_number,title,published_at,source_name,source_credit,source_url").eq("manga_id",mangaId).eq("published",true).order("chapter_number",{ascending:false})
]);
if(manga){
  const current=(chapters||[]).find(c=>Number(c.chapter_number)===chapterNumber);
  document.title="MangaMorph — "+manga.title+" · Capítulo "+chapterNumber;
  document.querySelector("#readerTitle").textContent=manga.title;
  document.querySelector("#readerChapterLabel").textContent="Capítulo "+chapterNumber;
  const credit=document.querySelector("#readerCredit");
  if(credit&&current&&(current.source_credit||current.source_name)){
    credit.textContent=current.source_credit||("Tradução e edição: "+current.source_name);
    if(current.source_url){
      credit.href=current.source_url;
      credit.target="_blank";
      credit.rel="noopener noreferrer";
    }else{
      credit.removeAttribute("href");
    }
    credit.hidden=false;
  }else if(credit){
    credit.hidden=true;
  }
  document.querySelector("#bottomChapterLabel").textContent=chapterNumber;
  document.querySelector("#finishChapterLabel").textContent="Capítulo "+chapterNumber+" concluído";
  document.querySelector("#readerBack").href="manga.html?id="+mangaId;
  const stage=document.querySelector("#readerStage");
  const progressText=document.querySelector("#readerProgressText");
  const progressPercent=document.querySelector("#readerProgressPercent");
  const progressBar=document.querySelector("#readerProgressBar");
  let hasPages=false;

  if(current){
    const {data:pages}=await db.from("mangamorph_chapter_pages").select("id,page_number,image_url,width,height").eq("chapter_id",current.id).order("page_number");
    if(pages?.length){
      hasPages=true;
      stage.innerHTML=pages.map(pg=>'<figure class="reader-real-page" data-reader-page="'+pg.page_number+'"><img src="'+pg.image_url+'" alt="Página '+pg.page_number+' do capítulo '+chapterNumber+'" loading="'+(pg.page_number<=2?"eager":"lazy")+'" decoding="async"></figure>').join("");
      if(progressText)progressText.textContent="Página 1 de "+pages.length;
      requestAnimationFrame(()=>window.dispatchEvent(new Event("scroll")));
    }
  }

  if(!hasPages){
    const hasAnyChapter=Array.isArray(chapters)&&chapters.length>0;
    const titleText=hasAnyChapter?"Páginas ainda não disponíveis":"Nenhum capítulo publicado";
    const bodyText=hasAnyChapter
      ?"Este capítulo existe, mas ainda não recebeu páginas para leitura."
      :"Esta obra foi adicionada ao catálogo, mas ainda não possui capítulos publicados.";
    stage.innerHTML='<section class="reader-empty-state"><span>LEITURA</span><strong>'+titleText+'</strong><p>'+bodyText+'</p><a href="manga.html?id='+mangaId+'">Voltar para a obra</a></section>';
    if(progressText)progressText.textContent="Sem páginas";
    if(progressPercent)progressPercent.textContent="—";
    if(progressBar)progressBar.style.width="0%";
    document.querySelector("#readerFinish")?.setAttribute("hidden","");
    document.querySelector("#chapterCommunity")?.setAttribute("hidden","");
    document.querySelector(".reader-bottom-bar")?.setAttribute("hidden","");
  }
  const grid=document.querySelector("#readerChapterGrid");
  if(chapters?.length){
    grid.innerHTML=chapters.slice(0,60).map(c=>'<button type="button" data-live-chapter="'+Number(c.chapter_number)+'" class="'+(Number(c.chapter_number)===chapterNumber?"active":"")+'">Cap. '+Number(c.chapter_number)+'</button>').join("");
    grid.addEventListener("click",e=>{const b=e.target.closest("[data-live-chapter]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();location.href="reader.html?id="+mangaId+"&chapter="+b.dataset.liveChapter},true);
    const ordered=chapters.map(c=>Number(c.chapter_number)).sort((a,b)=>a-b);
    const index=ordered.indexOf(chapterNumber);
    const previous=index>0?ordered[index-1]:null,next=index>=0&&index<ordered.length-1?ordered[index+1]:null;
    [["#previousChapter",previous],["#finishPrevious",previous],["#nextChapter",next],["#finishNext",next]].forEach(([selector,target])=>{
      const button=document.querySelector(selector);if(!button)return;
      button.disabled=!target;
      button.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(target)location.href="reader.html?id="+mangaId+"&chapter="+target},true);
    });
  }
}