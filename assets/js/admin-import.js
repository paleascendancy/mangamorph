import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const el = id => document.querySelector("#" + id);
const form = el("mangaImportForm");
const input = el("mangaImportInput");
const button = el("mangaImportButton");
const messageNode = el("mangaImportMessage");
const resultsNode = el("mangaImportResults");
let results = [];

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);
}

function slugify(value){
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140);
}

function setMessage(text,error=false){
  messageNode.textContent = text || "";
  messageNode.hidden = !text;
  messageNode.classList.toggle("error",Boolean(error));
}

function setBusy(busy){
  input.disabled = busy;
  button.disabled = busy;
  button.textContent = busy ? "Buscando…" : "Buscar";
}

function renderResults(){
  if(!results.length){
    resultsNode.innerHTML = "";
    return;
  }
  resultsNode.innerHTML = results.map((item,index)=>{
    const meta = [item.type,item.year,item.publicationStatus].filter(Boolean).join(" · ");
    const genres = (item.genres || []).slice(0,4).join(" · ");
    return `<article class="manga-import-result">
      <div class="manga-import-cover">
        ${item.coverUrl ? '<img src="'+escapeHtml(item.coverUrl)+'" alt="" loading="lazy">' : '<span>MM</span>'}
      </div>
      <div class="manga-import-copy">
        <div class="manga-import-source">${escapeHtml(item.source || "Fonte externa")}</div>
        <strong>${escapeHtml(item.title || "Sem título")}</strong>
        <span>${escapeHtml(meta)}</span>
        <small>${escapeHtml(genres || "Metadados encontrados")}</small>
      </div>
      <button type="button" data-use-import="${index}">Usar dados</button>
    </article>`;
  }).join("");
}

function setValue(id,value){
  const node = el(id);
  if(node) node.value = value ?? "";
}

function useResult(item){
  el("newMangaButton")?.click();

  setValue("mangaTitleInput",item.title);
  setValue("mangaSlugInput",slugify(item.title));
  setValue("mangaTypeInput",item.type || "Mangá");
  setValue("mangaCountryInput",item.country);
  setValue("mangaLanguageInput",item.originalLanguage);
  setValue("mangaAuthorInput",item.author);
  setValue("mangaArtistInput",item.artist);
  setValue("mangaPublisherInput",item.publisher);
  setValue("mangaYearInput",item.year || "");
  setValue("mangaStatusInput",item.publicationStatus || "Em lançamento");
  setValue("mangaAltTitlesInput",(item.alternativeTitles || []).join(", "));
  setValue("mangaGenresInput",(item.genres || []).join(", "));
  setValue("mangaTagsInput",(item.tags || []).join(", "));
  setValue("mangaSynopsisInput",item.synopsis || "");
  setValue("mangaImportedCoverUrl",item.coverUrl || "");
  setValue("mangaMetadataSource",item.source || "");
  setValue("mangaMetadataSourceId",item.sourceId || "");
  setValue("mangaMetadataSourceUrl",item.sourceUrl || "");

  const coverStatus = el("mangaCoverStatus");
  if(coverStatus){
    coverStatus.textContent = item.coverUrl
      ? "Capa importada. Você pode substituí-la enviando outra imagem."
      : "A fonte não forneceu uma capa.";
  }

  const formTitle = el("mangaFormTitle");
  if(formTitle) formTitle.textContent = "Revisar " + (item.title || "obra importada");

  setMessage("Dados carregados no editor. Revise e toque em Salvar obra.");
  el("mangaAdminForm")?.scrollIntoView({behavior:"smooth",block:"start"});
}

form?.addEventListener("submit",async event=>{
  event.preventDefault();
  const query = input.value.trim();
  if(query.length < 2) return setMessage("Digite o nome da obra ou cole um link do AniList/MyAnimeList.",true);

  setBusy(true);
  setMessage("Consultando APIs…");
  results = [];
  renderResults();

  try{
    const {data:{session}} = await supabase.auth.getSession();
    if(!session) throw new Error("Entre na administração antes de importar.");

    const {data:isAdmin,error:adminError} = await supabase.rpc("is_mangamorph_admin");
    if(adminError || isAdmin !== true) throw new Error("Sua conta não possui acesso administrativo.");

    const {data,error} = await supabase.functions.invoke("mangamorph-import-metadata",{
      body:{input:query}
    });
    if(error) throw error;
    if(data?.error) throw new Error(data.error);

    results = Array.isArray(data?.results) ? data.results : [];
    if(!results.length) throw new Error("Nenhuma obra encontrada.");

    renderResults();
    setMessage(results.length === 1 ? "1 resultado encontrado." : results.length + " resultados encontrados.");
  }catch(error){
    const text = error?.context?.body?.error || error?.message || "Não foi possível consultar a fonte.";
    setMessage(String(text),true);
  }finally{
    setBusy(false);
  }
});

resultsNode?.addEventListener("click",event=>{
  const target = event.target.closest("[data-use-import]");
  if(!target) return;
  const item = results[Number(target.dataset.useImport)];
  if(item) useResult(item);
});
