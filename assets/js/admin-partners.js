const themeHref=new URL("../css/admin-blue.css?v=001",import.meta.url).href;
if(!document.querySelector('link[data-mangamorph-admin-blue]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=themeHref;
  link.dataset.mangamorphAdminBlue="true";
  document.head.append(link);
}

await import("./admin-partners-v2.js?v=001");
