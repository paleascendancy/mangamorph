(()=>{
  if(window.__mmNavSpeedV11)return;
  window.__mmNavSpeedV11=true;

  const d=document;
  const root=d.documentElement;
  const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  const home=page==="index.html"||page==="";

  function validPositiveId(value){
    if(value===null||value===undefined||String(value).trim()==="")return false;
    const number=Number(value);
    return Number.isInteger(number)&&number>0;
  }

  function validChapter(value){
    if(value===null||value===undefined||String(value).trim()==="")return false;
    const number=Number(value);
    return Number.isFinite(number)&&number>=0;
  }

  /* Block malformed internal routes before any page runtime starts. */
  const params=new URLSearchParams(location.search);
  if(page==="manga.html"&&!validPositiveId(params.get("id"))){
    location.replace("index.html");
    return;
  }
  if(page==="reader.html"){
    const id=params.get("id");
    const chapter=params.get("chapter");
    if(!validPositiveId(id)){
      location.replace("index.html");
      return;
    }
    if(!validChapter(chapter)){
      location.replace("manga.html?id="+encodeURIComponent(id)+"#chapters");
      return;
    }
  }

  /* Remove obsolete guards left by older deployments. */
  root.classList.remove("mm-manga-prelive");
  d.querySelector("#mmMangaDocumentGuard")?.remove();
  d.querySelector("#mmMangaLiveGuard")?.remove();
  d.querySelector("#notificationsToggle")?.remove();
  d.querySelectorAll(".notification-button").forEach(node=>node.remove());

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

  import("./global-header.js?v=006").catch(error=>console.warn("MangaMorph navigation unavailable:",error));

  const bar=d.createElement("div");
  bar.className="mm-nav-progress";
  bar.setAttribute("aria-hidden","true");
  root.appendChild(bar);

  const finish=()=>{
    bar.classList.remove("active");
    bar.classList.add("done");
    setTimeout(()=>bar.classList.remove("done"),240);
  };
  addEventListener("pageshow",finish);
  addEventListener("load",finish,{once:true});

  function internalLink(anchor){
    if(!anchor?.href||anchor.target==="_blank"||anchor.hasAttribute("download"))return null;
    try{
      const url=new URL(anchor.href,location.href);
      return url.origin===location.origin?url:null;
    }catch{return null}
  }

  function currentReturnTarget(){
    if(page==="reader.html")return `reader.html${location.search}`;
    if(page==="manga.html")return `manga.html${location.search}`;
    return "";
  }

  function openAccountHub(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const returnTo=currentReturnTarget();
    if(returnTo){
      try{localStorage.setItem("mangamorph:auth-return",returnTo)}catch{}
    }
    location.assign("index.html?mmAccount=1");
  }

  function normalizeAccountIndicator(){
    if(localStorage.getItem("mangamorph:profile-session")==="on")return;
    const image=d.querySelector(".mm-profile-image");
    const initials=d.querySelector(".mm-profile-initials");
    const guest=d.querySelector(".mm-profile-guest");
    if(image){image.hidden=true;image.removeAttribute("src")}
    if(initials)initials.hidden=true;
    if(guest)guest.hidden=false;
  }

  d.addEventListener("click",event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!home&&event.target.closest?.("[data-mm-profile]")){
      openAccountHub(event);
      return;
    }
    if(event.defaultPrevented)return;
    const anchor=event.target.closest?.("a[href]");
    const url=internalLink(anchor);
    if(!url)return;
    if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
    if(!url.hash){
      try{sessionStorage.setItem("mangamorph:nav-reset",url.pathname+url.search)}catch{}
    }
    bar.classList.remove("done");
    bar.classList.add("active");
  },{capture:true});

  try{
    const reset=sessionStorage.getItem("mangamorph:nav-reset");
    const here=location.pathname+location.search;
    if(reset===here&&!location.hash){
      sessionStorage.removeItem("mangamorph:nav-reset");
      if("scrollRestoration" in history)history.scrollRestoration="manual";
      scrollTo(0,0);
      requestAnimationFrame(()=>scrollTo(0,0));
    }
  }catch{}

  addEventListener("pageshow",()=>setTimeout(normalizeAccountIndicator,0));
  addEventListener("storage",event=>{
    if(event.key==="mangamorph:profile-session")normalizeAccountIndicator();
  });
  setTimeout(normalizeAccountIndicator,40);

  if("serviceWorker" in navigator){
    const swVersion="2.1.0";
    let changing=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(changing)return;
      changing=true;
      try{
        const key="mangamorph:sw-controller";
        if(sessionStorage.getItem(key)!==swVersion){
          sessionStorage.setItem(key,swVersion);
          location.reload();
          return;
        }
      }catch{}
      changing=false;
    });
    addEventListener("load",()=>{
      navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(registration=>registration.update()).catch(()=>{});
    },{once:true});
  }
})();
