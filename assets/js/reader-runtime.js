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
  let sourceFailureShown=false;

  function hideReaderExtras(){
    document.querySelector("#readerFinish")?.setAttribute("hidden","");
    document.querySelector("#chapterCommunity")?.setAttribute("hidden","");
    document.querySelector(".reader-bottom-bar")?.setAttribute("hidden","");
  }

  function renderUnavailable(titleText,bodyText){
    if(sourceFailureShown)return;
    sourceFailureShown=true;
    stage.replaceChildren();
    const box=document.createElement("section");
    box.className="reader-empty-state reader-source-unavailable";
    const kicker=document.createElement("span");
    kicker.textContent="LEITURA";
    const title=document.createElement("strong");
    title.textContent=titleText;
    const body=document.createElement("p");
    body.textContent=bodyText;
    box.append(kicker,title,body);
    if(current?.source_url&&/^https:\/\//i.test(current.source_url)){
      const sourceLink=document.createElement("a");
      sourceLink.href=current.source_url;
      sourceLink.target="_blank";
      sourceLink.rel="noopener noreferrer";
      sourceLink.textContent="Verificar na fonte";
      box.append(sourceLink);
    }
    const back=document.createElement("a");
    back.href="manga.html?id="+mangaId;
    back.textContent="Voltar para a obra";
    box.append(back);
    stage.append(box);
    if(progressText)progressText.textContent="Fonte indisponível";
    if(progressPercent)progressPercent.textContent="—";
    if(progressBar)progressBar.style.width="0%";
    hideReaderExtras();
  }

  if(current){
    const {data:pages}=await db.from("mangamorph_chapter_pages").select("id,page_number,image_url,width,height").eq("chapter_id",current.id).order("page_number");
    if(pages?.length){
      hasPages=true;
      stage.innerHTML=pages.map(pg=>'<figure class="reader-real-page" data-reader-page="'+pg.page_number+'"><img src="'+pg.image_url+'" alt="Página '+pg.page_number+' do capítulo '+chapterNumber+'" loading="'+(pg.page_number<=2?"eager":"lazy")+'" decoding="async"></figure>').join("");
      if(progressText)progressText.textContent="Página 1 de "+pages.length;

      let loaded=0,failed=0,initialFailures=0;
      const images=[...stage.querySelectorAll(".reader-real-page img")];
      images.forEach((img,index)=>{
        img.addEventListener("load",()=>{loaded++},{once:true});
        img.addEventListener("error",()=>{
          failed++;
          if(index<2)initialFailures++;
          const figure=img.closest(".reader-real-page");
          if(figure&&!sourceFailureShown){
            figure.classList.add("reader-real-page-failed");
            figure.replaceChildren();
            const note=document.createElement("div");
            note.className="reader-page-unavailable";
            note.innerHTML="<span>PÁGINA "+String(index+1).padStart(2,"0")+"</span><strong>Imagem indisponível</strong><small>A fonte não entregou esta página.</small>";
            figure.append(note);
          }
          if(loaded===0&&initialFailures>=Math.min(2,images.length)){
            renderUnavailable(
              "Capítulo temporariamente indisponível",
              "As imagens deste capítulo não estão carregando na fonte parceira. O MangaMorph tentará novamente automaticamente quando a fonte voltar."
            );
          }else if(failed===images.length&&loaded===0){
            renderUnavailable(
              "Capítulo temporariamente indisponível",
              "Nenhuma página pôde ser carregada agora. O MangaMorph tentará novamente automaticamente."
            );
          }
        },{once:true});
      });
      requestAnimationFrame(()=>window.dispatchEvent(new Event("scroll")));
    }
  }

  if(!hasPages){
    const hasAnyChapter=Array.isArray(chapters)&&chapters.length>0;
    const titleText=hasAnyChapter?"Páginas ainda não disponíveis":"Nenhum capítulo publicado";
    const bodyText=hasAnyChapter
      ?"Este capítulo existe, mas ainda não recebeu páginas para leitura."
      :"Esta obra foi adicionada ao catálogo, mas ainda não possui capítulos publicados.";
    renderUnavailable(titleText,bodyText);
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