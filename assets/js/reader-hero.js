(()=>{
  "use strict";

  if(window.__MANGAMORPH_READER_HERO_V3__)return;
  window.__MANGAMORPH_READER_HERO_V3__=true;

  const body=document.body;
  const main=document.querySelector(".reader-main");
  const header=document.querySelector("#readerHeader");
  if(!body||!main||!header)return;

  let hero=document.querySelector("#readerCinematicHero");
  if(!hero){
    hero=document.createElement("section");
    hero.id="readerCinematicHero";
    hero.className="reader-cinematic-hero";
    hero.setAttribute("aria-label","Informações do capítulo");
    body.insertBefore(hero,main);
  }
  if(header.parentElement!==hero)hero.append(header);

  if(!document.querySelector("#readerHeroWorkLinkStyle")){
    const style=document.createElement("style");
    style.id="readerHeroWorkLinkStyle";
    style.textContent=`
      .reader-cinematic-hero .reader-work-link{display:inline-flex;width:max-content;max-width:100%;margin-top:.55rem;color:#b9cbe0;text-decoration:none;font-size:.72rem;font-weight:760;letter-spacing:.02em;text-shadow:0 2px 12px rgba(0,0,0,.48);transition:color .16s ease,opacity .16s ease}
      .reader-cinematic-hero .reader-work-link:hover{color:#fff;text-decoration:underline;text-underline-offset:.2em}
      .reader-cinematic-hero .reader-work-link:active{opacity:.72}
      @media(max-width:620px){.reader-cinematic-hero .reader-work-link{margin-top:.48rem;font-size:.66rem}}
    `;
    document.head.append(style);
  }

  const mangaHref=()=>document.querySelector("#readerTitleLink")?.getAttribute("href")||"manga.html";

  async function loadArtwork(){
    const id=Number(new URLSearchParams(location.search).get("id"));
    if(!Number.isInteger(id)||id<1)return;
    try{
      const base="https://fnyellunugdfesprmvzm.supabase.co";
      const key="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
      const url=new URL(base+"/rest/v1/mangamorph_mangas");
      url.searchParams.set("select","cover_url,accent");
      url.searchParams.set("id","eq."+id);
      url.searchParams.set("limit","1");
      const response=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key}});
      if(!response.ok)return;
      const rows=await response.json();
      const manga=rows?.[0];
      if(!manga?.cover_url)return;
      hero.style.setProperty("--reader-hero-image",`url("${String(manga.cover_url).replace(/"/g,"%22")}")`);
      if(manga.accent)hero.style.setProperty("--reader-hero-accent",manga.accent);
      if(!document.querySelector('link[data-reader-cover-preload="'+id+'"]')){
        const preload=document.createElement("link");
        preload.rel="preload";
        preload.as="image";
        preload.href=manga.cover_url;
        preload.fetchPriority="high";
        preload.dataset.readerCoverPreload=String(id);
        document.head.append(preload);
      }
    }catch{}
  }

  function syncHero(){
    const card=document.querySelector("#readerChapterContext");
    const progress=document.querySelector(".reader-progress-shell");
    if(card&&card.parentElement!==hero)hero.append(card);
    if(progress&&progress.parentElement!==hero)hero.append(progress);

    const contextMain=card?.querySelector(".reader-context-main");
    const mangaTitle=document.querySelector("#readerTitle")?.textContent?.trim();
    if(contextMain&&mangaTitle&&mangaTitle!=="Carregando..."){
      let workLink=contextMain.querySelector(".reader-work-link");
      if(!workLink){
        workLink=document.createElement("a");
        workLink.className="reader-work-link";
        const chapterTitle=contextMain.querySelector("small");
        if(chapterTitle)chapterTitle.insertAdjacentElement("afterend",workLink);
        else contextMain.append(workLink);
      }
      workLink.href=mangaHref();
      workLink.textContent=mangaTitle;
      workLink.setAttribute("aria-label","Abrir página de "+mangaTitle);
    }
  }

  let queued=false;
  const scheduleSync=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      syncHero();
    });
  };
  const observer=new MutationObserver(scheduleSync);
  observer.observe(body,{subtree:true,childList:true,characterData:true});

  syncHero();
  loadArtwork();
  window.addEventListener("load",syncHero,{once:true});
})();