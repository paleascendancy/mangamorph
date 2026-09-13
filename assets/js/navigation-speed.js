(()=>{
  if(window.__mmNavSpeedV10)return;
  window.__mmNavSpeedV10=true;

  const d=document;
  const root=d.documentElement;
  const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  const home=page==="index.html"||page==="";

  /* Old workers used to hide the real UI while waiting for network data. Undo only those legacy guards. */
  root.classList.remove("mm-manga-prelive");
  d.querySelector("#mmMangaDocumentGuard")?.remove();
  d.querySelector("#mmMangaLiveGuard")?.remove();
  d.querySelector("#notificationsToggle")?.remove();
  d.querySelectorAll(".notification-button").forEach(node=>node.remove());

  /* Never flash the old fictitious placeholders while live data is being fetched. */
  function neutralizeLegacyPlaceholders(){
    if(home){
      const title=d.querySelector("#featuredTitle");
      if(title&&title.textContent.trim()==="Neon Ronin"){
        title.textContent="Carregando catálogo…";
        const desc=d.querySelector(".featured-description");if(desc)desc.textContent="Buscando as obras publicadas do MangaMorph.";
        const meta=d.querySelector(".featured-meta");if(meta)meta.textContent="";
        const actions=d.querySelector(".featured-actions");if(actions)actions.style.visibility="hidden";
        const cover=d.querySelector(".featured-cover");if(cover)cover.style.backgroundImage="none";
      }
    }
    if(page==="manga.html"){
      const title=d.querySelector("#mangaTitle");
      if(title&&title.textContent.trim()==="Neon Ronin"){
        title.textContent="Carregando obra…";
        ["#mangaAltTitle","#mangaDescription","#mangaTags"].forEach(selector=>{const node=d.querySelector(selector);if(node)node.textContent=""});
        ["#mangaRating","#mangaReads","#mangaFavorites","#mangaYearFact","#mangaAuthorFact","#mangaArtistFact","#latestChapter"].forEach(selector=>{const node=d.querySelector(selector);if(node)node.textContent="—"});
        const cover=d.querySelector("#detailCover");if(cover){cover.style.backgroundImage="none";cover.querySelectorAll("strong,small,.detail-cover-kicker").forEach(node=>node.style.display="none")}
      }
    }
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",neutralizeLegacyPlaceholders,{once:true});else neutralizeLegacyPlaceholders();

  /* The global header has no auth/database dependency and can initialize immediately. */
  import("./global-header.js?v=005").catch(error=>console.warn("MangaMorph navigation unavailable:",error));

  /* Tiny progress feedback only. No touch/intersection prefetching: it competed with the page the user actually opened. */
  const bar=d.createElement("div");bar.className="mm-nav-progress";bar.setAttribute("aria-hidden","true");root.appendChild(bar);
  const finish=()=>{bar.classList.remove("active");bar.classList.add("done");setTimeout(()=>bar.classList.remove("done"),240)};
  addEventListener("pageshow",finish);addEventListener("load",finish,{once:true});

  function internalLink(anchor){
    if(!anchor?.href||anchor.target==="_blank"||anchor.hasAttribute("download"))return null;
    try{const url=new URL(anchor.href,location.href);return url.origin===location.origin?url:null}catch{return null}
  }

  d.addEventListener("click",event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const anchor=event.target.closest?.("a[href]");const url=internalLink(anchor);if(!url)return;
    if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
    if(!url.hash){try{sessionStorage.setItem("mangamorph:nav-reset",url.pathname+url.search)}catch{}}
    bar.classList.remove("done");bar.classList.add("active");
  },{capture:true});

  try{
    const reset=sessionStorage.getItem("mangamorph:nav-reset");
    const here=location.pathname+location.search;
    if(reset===here&&!location.hash){
      sessionStorage.removeItem("mangamorph:nav-reset");
      if("scrollRestoration" in history)history.scrollRestoration="manual";
      scrollTo(0,0);requestAnimationFrame(()=>scrollTo(0,0));
    }
  }catch{}

  /* Force replacement of the old document-rewriting service worker. Reload once when the new controller takes over. */
  if("serviceWorker" in navigator){
    const swVersion="2.0.1";
    let changing=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(changing)return;changing=true;
      try{
        const key="mangamorph:sw-controller";
        if(sessionStorage.getItem(key)!==swVersion){sessionStorage.setItem(key,swVersion);location.reload();return}
      }catch{}
      changing=false;
    });
    addEventListener("load",()=>{
      navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(registration=>registration.update()).catch(()=>{});
    },{once:true});
  }
})();
