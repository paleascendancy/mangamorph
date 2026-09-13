(()=>{
  const body=document.body;
  const main=document.querySelector(".reader-main");
  const header=document.querySelector("#readerHeader");
  if(!body||!main||!header)return;

  let hero=document.querySelector("#readerCinematicHero");
  if(!hero){hero=document.createElement("section");hero.id="readerCinematicHero";hero.className="reader-cinematic-hero";hero.setAttribute("aria-label","Informações do capítulo");body.insertBefore(hero,main)}
  if(header.parentElement!==hero)hero.append(header);

  const mangaHref=()=>document.querySelector("#readerTitleLink")?.getAttribute("href")||"manga.html";
  async function loadArtwork(){
    const id=Number(new URLSearchParams(location.search).get("id"));if(!id)return;
    try{
      const base="https://fnyellunugdfesprmvzm.supabase.co",key="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
      const url=new URL(base+"/rest/v1/mangamorph_mangas");url.searchParams.set("select","cover_url,accent");url.searchParams.set("id","eq."+id);url.searchParams.set("limit","1");
      const response=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key}});if(!response.ok)return;const rows=await response.json(),manga=rows?.[0];if(!manga?.cover_url)return;
      hero.style.setProperty("--reader-hero-image",`url("${String(manga.cover_url).replace(/"/g,"%22")}")`);if(manga.accent)hero.style.setProperty("--reader-hero-accent",manga.accent);
      const preload=document.createElement("link");preload.rel="preload";preload.as="image";preload.href=manga.cover_url;preload.fetchPriority="high";document.head.append(preload);
    }catch{}
  }

  function syncHero(){
    const card=document.querySelector("#readerChapterContext");
    const progress=document.querySelector(".reader-progress-shell");
    if(card&&card.parentElement!==hero)hero.append(card);
    if(progress&&progress.parentElement!==hero)hero.append(progress);
    const title=document.querySelector("#readerTitle")?.textContent?.trim();
    const chapterTitle=card?.querySelector(".reader-context-main small");
    if(chapterTitle&&title&&chapterTitle.textContent!==title)chapterTitle.textContent=title;
    if(chapterTitle&&!chapterTitle.dataset.mangaLink){chapterTitle.dataset.mangaLink="true";chapterTitle.setAttribute("role","link");chapterTitle.setAttribute("tabindex","0");chapterTitle.setAttribute("aria-label","Abrir página da obra")}
  }

  document.addEventListener("click",event=>{const target=event.target.closest('[data-manga-link="true"]');if(!target)return;event.preventDefault();location.href=mangaHref()});
  document.addEventListener("keydown",event=>{const target=event.target.closest?.('[data-manga-link="true"]');if(!target||!(event.key==="Enter"||event.key===" "))return;event.preventDefault();location.href=mangaHref()});
  let queued=false;const scheduleSync=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncHero()})};const observer=new MutationObserver(scheduleSync);observer.observe(body,{subtree:true,childList:true,characterData:true});
  syncHero();loadArtwork();window.addEventListener("load",syncHero,{once:true});
})();
