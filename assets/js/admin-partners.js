const themeHref=new URL("../css/admin-blue.css?v=001",import.meta.url).href;
if(!document.querySelector('link[data-mangamorph-admin-blue]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=themeHref;
  link.dataset.mangamorphAdminBlue="true";
  document.head.append(link);
}

// Reliability and safety layers are independent from partner integrations.
// Load them first so an integration failure cannot disable admin safeguards.
await import("./admin-professional.js?v=001");
await import("./admin-safety.js?v=001");

// Partner sync now accepts the production Vercel origin directly and performs
// its own authenticated authorization. Keep the browser fetch untouched so a
// wrapper failure can never affect unrelated requests in the admin panel.
try{
  await import("./admin-partners-v2.js?v=003");
}catch(error){
  console.warn("MangaMorph partner admin:",error);
}
import("./admin-live-sync.js?v=002").catch(error=>console.warn("MangaMorph admin live sync:",error));

const heroNote=document.querySelector("#partnerOverview .partner-hero p");
if(heroNote)heroNote.textContent="A Scan fornece capítulos, páginas, crédito e origem de cada capítulo. O MangaMorph copia as páginas para o próprio Storage antes de publicar.";
const subtitle=document.querySelector("#partnerFormSubtitle");
if(subtitle)subtitle.textContent="Conecte uma fonte autorizada. Capítulos só são publicados depois que as páginas forem copiadas com sucesso.";
const sourceHint=document.querySelector("#partnerSourceHint");
if(sourceHint&&!sourceHint.textContent)sourceHint.textContent="Use HTTPS. A fonte fica isolada por obra, com trava de sincronização, validação de origem e cópia das páginas para o Storage do MangaMorph.";