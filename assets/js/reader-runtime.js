import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const p=new URLSearchParams(location.search);
const mangaId=Number(p.get("id"))||1,chapterNumber=Number(p.get("chapter"))||1;
const [{data:manga},{data:chapters}]=await Promise.all([
  db.from("mangamorph_mangas").select("id,title,accent,cover_url").eq("id",mangaId).maybeSingle(),
  db.from("mangamorph_chapters").select("id,chapter_number,title,published_at").eq("manga_id",mangaId).eq("published",true).order("chapter_number",{ascending:false})
]);
if(manga){
  const current=(chapters||[]).find(c=>Number(c.chapter_number)===chapterNumber);
  document.title="MangaMorph — "+manga.title+" · Capítulo "+chapterNumber;
  document.querySelector("#readerTitle").textContent=manga.title;
  document.querySelector("#readerChapterLabel").textContent="Capítulo "+chapterNumber;
  document.querySelector("#bottomChapterLabel").textContent=chapterNumber;
  document.querySelector("#finishChapterLabel").textContent="Capítulo "+chapterNumber+" concluído";
  document.querySelector("#readerBack").href="manga.html?id="+mangaId;
  if(current){
    const {data:pages}=await db.from("mangamorph_chapter_pages").select("id,page_number,image_url,width,height").eq("chapter_id",current.id).order("page_number");
    if(pages?.length){
      document.querySelector("#readerStage").innerHTML=pages.map(pg=>'<figure class="reader-real-page" data-reader-page="'+pg.page_number+'"><img src="'+pg.image_url+'" alt="Página '+pg.page_number+' do capítulo '+chapterNumber+'" loading="'+(pg.page_number<=2?"eager":"lazy")+'" decoding="async"></figure>').join("");
      requestAnimationFrame(()=>window.dispatchEvent(new Event("scroll")));
    }
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