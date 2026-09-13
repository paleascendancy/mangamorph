(()=>{
  if(window.__MM_NAV_STABILITY_COMPAT__)return;
  window.__MM_NAV_STABILITY_COMPAT__=true;
  const root=document.documentElement;
  const clean=()=>{
    document.querySelector("#notificationsToggle")?.remove();
    document.querySelectorAll(".notification-button").forEach(node=>node.remove());
    document.querySelector("#mangamorphCatalogBoot")?.remove();
    document.querySelector("#mangamorphMangaBoot")?.remove();
    document.querySelector("#mmMangaDocumentGuard")?.remove();
    document.querySelector("#mmMangaLiveGuard")?.remove();
    root.classList.remove("mm-manga-prelive");
  };
  clean();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",clean,{once:true});
  root.classList.add("mm-nav-stable");
})();
