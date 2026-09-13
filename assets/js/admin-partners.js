const themeHref=new URL("../css/admin-blue.css?v=001",import.meta.url).href;
if(!document.querySelector('link[data-mangamorph-admin-blue]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=themeHref;
  link.dataset.mangamorphAdminBlue="true";
  document.head.append(link);
}

// The professional reliability layer is independent from partner integrations.
// Load it first so an integration failure cannot disable admin safeguards.
await import("./admin-professional.js?v=001");

// The original partner synchronizer still has a legacy CORS allowlist.
// Rewrite only that Edge Function request to the Vercel-compatible wrapper.
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{
  const raw=typeof input==="string"?input:input?.url||String(input||"");
  if(raw.includes("/functions/v1/mangamorph-sync-partners")&&!raw.includes("mangamorph-sync-partners-web")){
    const next=raw.replace("/functions/v1/mangamorph-sync-partners","/functions/v1/mangamorph-sync-partners-web");
    if(typeof input==="string")return nativeFetch(next,init);
    return nativeFetch(new Request(next,input),init);
  }
  return nativeFetch(input,init);
};

try{
  await import("./admin-partners-v2.js?v=002");
}catch(error){
  console.warn("MangaMorph partner admin:",error);
}
import("./admin-live-sync.js?v=002").catch(error=>console.warn("MangaMorph admin live sync:",error));

const heroNote=document.querySelector("#partnerOverview .partner-hero p");
if(heroNote)heroNote.textContent="A Scan fornece capítulos, páginas, crédito e origem de cada capítulo. Capa e metadados do perfil ficam por conta do AniList.";
const subtitle=document.querySelector("#partnerFormSubtitle");
if(subtitle)subtitle.textContent="Conecte a fonte autorizada dos capítulos. O perfil da obra será enriquecido separadamente pelo AniList.";
const sourceHint=document.querySelector("#partnerSourceHint");
if(sourceHint&&!sourceHint.textContent)sourceHint.textContent="Use a página da obra/capítulo ou uma API autorizada. Esta integração não define capa, sinopse, autor ou gêneros do perfil.";
