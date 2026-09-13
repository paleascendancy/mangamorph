(()=>{
  const root=document.documentElement;
  const body=document.body;
  if(!body)return;

  try{
    const saved=localStorage.getItem("mangamorph:theme-v2")||localStorage.getItem("mangamorph:theme")||"gray";
    body.classList.toggle("light",saved==="light");
    body.classList.toggle("light-reader",saved==="light"&&body.classList.contains("reader-body"));
  }catch{}

  document.querySelector("#notificationsToggle")?.remove();
  document.querySelectorAll(".notification-button").forEach(node=>node.remove());
  document.querySelector(".topbar:not(.manga-topbar)")?.classList.add("mm-site-header");

  if(!document.querySelector("#mmNavStabilityStyles")){
    const style=document.createElement("style");
    style.id="mmNavStabilityStyles";
    style.textContent=`
      :root{--mm-nav-h:52px}
      #notificationsToggle,.notification-button{display:none!important}
      #mangamorphCatalogBoot,#mangamorphMangaBoot{display:none!important;pointer-events:none!important}
      html body .mm-site-header,
      html body.mm-home .topbar.mm-site-header{
        position:sticky!important;top:0!important;z-index:1200!important;width:100%!important;
        min-height:var(--mm-nav-h)!important;height:var(--mm-nav-h)!important;
        display:flex!important;align-items:center!important;justify-content:space-between!important;
        gap:.4rem!important;padding:0 .68rem!important;overflow:visible!important;
        border:0!important;border-bottom:1px solid rgba(255,255,255,.075)!important;
        background:rgba(8,12,18,.96)!important;color:#f4f7fb!important;
        box-shadow:0 7px 22px rgba(0,0,0,.15)!important;
        backdrop-filter:blur(18px) saturate(125%)!important;-webkit-backdrop-filter:blur(18px) saturate(125%)!important;
        transform:none!important;opacity:1!important;visibility:visible!important;
      }
      html body .mm-site-header .desktop-nav,html body.mm-home .topbar.mm-site-header .desktop-nav{display:none!important}
      html body .mm-site-header .header-brand,html body.mm-home .topbar.mm-site-header .header-brand{display:flex!important;align-items:center!important;gap:.48rem!important;min-width:0!important;overflow:visible!important}
      html body .mm-site-header .brand,html body.mm-home .topbar.mm-site-header .brand{display:flex!important;align-items:center!important;max-width:none!important;overflow:visible!important;text-decoration:none!important}
      html body .mm-site-header .brand-name,html body.mm-home .topbar.mm-site-header .brand-name{
        display:block!important;max-width:none!important;overflow:visible!important;white-space:nowrap!important;
        font:860 .93rem/1 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;
        letter-spacing:-.045em!important;color:#f4f7fb!important;background:none!important;-webkit-text-fill-color:initial!important;
      }
      html body .mm-site-header .brand-name>span,html body.mm-home .topbar.mm-site-header .brand-name>span{color:#e8ae56!important;background:none!important;-webkit-text-fill-color:initial!important}
      html body .mm-site-header .topbar-actions,html body.mm-home .topbar.mm-site-header .topbar-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.24rem!important;margin-left:auto!important}
      html body .mm-site-header .menu-tab,
      html body .mm-site-header .icon-button,
      html body .mm-site-header .header-action-button,
      html body .mm-site-header .mm-nav-button,
      html body.mm-home .topbar.mm-site-header .menu-tab,
      html body.mm-home .topbar.mm-site-header .header-action-button{
        flex:0 0 35px!important;width:35px!important;min-width:35px!important;max-width:35px!important;
        height:35px!important;min-height:35px!important;max-height:35px!important;padding:0!important;margin:0!important;
        display:grid!important;place-items:center!important;border:1px solid rgba(255,255,255,.085)!important;
        border-radius:10px!important;background:rgba(255,255,255,.03)!important;color:#f4f7fb!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.025)!important;overflow:hidden!important;
      }
      html body .mm-site-header .menu-tab,html body.mm-home .topbar.mm-site-header .menu-tab{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important}
      html body .mm-site-header .menu-tab span,html body.mm-home .topbar.mm-site-header .menu-tab span{display:block!important;width:17px!important;height:1.7px!important;margin:0!important;border:0!important;border-radius:999px!important;background:currentColor!important;transform:none!important}
      html body .mm-site-header svg{width:17px!important;height:17px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important}
      html body .mm-site-header .account-button,html body .mm-site-header .mm-profile-button,html body.mm-home .topbar.mm-site-header .account-button{border-radius:50%!important;padding:2px!important}
      html body .mm-site-header .header-profile-image,html body .mm-site-header .mm-profile-image,html body.mm-home .topbar.mm-site-header .header-profile-image{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:inherit!important}
      html body.light .mm-site-header{background:rgba(247,248,250,.97)!important;color:#111827!important;border-bottom-color:rgba(15,23,42,.075)!important;box-shadow:0 7px 22px rgba(15,23,42,.055)!important}
      html body.light .mm-site-header .brand-name{color:#111827!important}
      html body.light .mm-site-header .brand-name>span{color:#b7791f!important}
      html body.light .mm-site-header .menu-tab,html body.light .mm-site-header .icon-button,html body.light .mm-site-header .header-action-button,html body.light .mm-site-header .mm-nav-button{border-color:rgba(15,23,42,.08)!important;background:rgba(15,23,42,.025)!important;color:#111827!important}
      html.mm-catalog-loading body.mm-home .hero-feature{min-height:300px!important}
      html.mm-catalog-loading body.mm-home:not(.light) .hero-feature{background:#1f2329!important;color:#f4f7fb!important}
      .reader-header.mm-reader-context{display:none!important}
      @media(min-width:621px){:root{--mm-nav-h:56px}html body .mm-site-header,html body.mm-home .topbar.mm-site-header{padding:0 1.1rem!important}html body .mm-site-header .menu-tab,html body .mm-site-header .icon-button,html body .mm-site-header .header-action-button,html body .mm-site-header .mm-nav-button{width:38px!important;min-width:38px!important;max-width:38px!important;height:38px!important;min-height:38px!important;max-height:38px!important}html body .mm-site-header .brand-name{font-size:1rem!important}}
    `;
    document.head.append(style);
  }

  const clean=()=>{
    document.querySelector("#notificationsToggle")?.remove();
    document.querySelectorAll(".notification-button").forEach(node=>node.remove());
    const headers=[...document.querySelectorAll(".mm-site-header")];
    if(headers.length>1)headers.slice(1).forEach(node=>node.remove());
  };
  clean();
  const observer=new MutationObserver(clean);
  observer.observe(body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),5000);
  root.classList.add("mm-nav-stable");
})();