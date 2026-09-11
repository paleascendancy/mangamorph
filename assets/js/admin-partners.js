const themeHref=new URL("../css/admin-blue.css?v=001",import.meta.url).href;
if(!document.querySelector('link[data-mangamorph-admin-blue]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=themeHref;
  link.dataset.mangamorphAdminBlue="true";
  document.head.append(link);
}

await import("./admin-partners-v2.js?v=001");

const heroNote=document.querySelector("#partnerOverview .partner-hero p");
if(heroNote)heroNote.textContent="A Scan fornece capítulos, páginas, crédito e origem de cada capítulo. Capa e metadados do perfil ficam por conta do AniList.";
const subtitle=document.querySelector("#partnerFormSubtitle");
if(subtitle)subtitle.textContent="Conecte a fonte autorizada dos capítulos. O perfil da obra será enriquecido separadamente pelo AniList.";
const sourceHint=document.querySelector("#partnerSourceHint");
if(sourceHint&&!sourceHint.textContent)sourceHint.textContent="Use a página da obra/capítulo ou uma API autorizada. Esta integração não define capa, sinopse, autor ou gêneros do perfil.";
