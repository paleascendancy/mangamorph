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


function aniCountry(code){
  return ({
    JP:{country:"Japão",language:"Japonês",type:"Mangá"},
    KR:{country:"Coreia do Sul",language:"Coreano",type:"Manhwa"},
    CN:{country:"China",language:"Chinês",type:"Manhua"},
    TW:{country:"Taiwan",language:"Chinês",type:"Manhua"}
  })[code] || {country:code || "",language:"",type:"Outro"};
}

function aniPublicationStatus(status){
  return ({
    RELEASING:"Em lançamento",
    FINISHED:"Concluído",
    HIATUS:"Pausado",
    CANCELLED:"Cancelado",
    NOT_YET_RELEASED:"Em breve"
  })[status] || "Em lançamento";
}

function stripAniText(value){
  return String(value || "").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").trim();
}

function normalizeAniDirect(media){
  const info=aniCountry(media?.countryOfOrigin);
  const author=[],artist=[];
  for(const edge of media?.staff?.edges || []){
    const role=String(edge?.role || "").toLowerCase();
    const name=edge?.node?.name?.full;
    if(!name) continue;
    if(role.includes("story") || role.includes("original creator") || role.includes("writer")) author.push(name);
    if(role.includes("art") || role.includes("illustrat")) artist.push(name);
  }
  const title=media?.title?.english || media?.title?.romaji || media?.title?.native || "Sem título";
  const uniq=items=>[...new Set(items.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))];
  return {
    source:"AniList API (direto)",
    sourceId:String(media?.id || ""),
    sourceUrl:media?.siteUrl || (media?.id ? "https://anilist.co/manga/" + media.id : ""),
    title,
    alternativeTitles:uniq([media?.title?.romaji,media?.title?.english,media?.title?.native,...(media?.synonyms || [])]).filter(x=>x!==title),
    type:String(media?.format || "").toUpperCase()==="NOVEL" ? "Novel" : info.type,
    country:info.country,
    originalLanguage:info.language,
    author:uniq(author).join(", "),
    artist:uniq(artist).join(", "),
    publisher:"",
    year:media?.startDate?.year || null,
    publicationStatus:aniPublicationStatus(media?.status),
    genres:uniq(media?.genres || []),
    tags:uniq((media?.tags || []).filter(t=>Number(t?.rank || 0)>=60).slice(0,14).map(t=>t?.name)),
    synopsis:stripAniText(media?.description),
    coverUrl:media?.coverImage?.extraLarge || media?.coverImage?.large || ""
  };
}

async function searchAniListDirect(query){
  const linkMatch=String(query).match(/anilist\.co\/manga\/(\d+)/i);
  const gql=linkMatch
    ? 'query($id:Int!){Media(id:$id,type:MANGA){id siteUrl countryOfOrigin format status startDate{year} title{romaji english native} synonyms coverImage{extraLarge large} description(asHtml:false) genres tags{name rank} staff(perPage:25){edges{role node{name{full}}}}}}'
    : 'query($search:String!){Page(page:1,perPage:8){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id siteUrl countryOfOrigin format status startDate{year} title{romaji english native} synonyms coverImage{extraLarge large} description(asHtml:false) genres tags{name rank} staff(perPage:25){edges{role node{name{full}}}}}}}';
  const variables=linkMatch ? {id:Number(linkMatch[1])} : {search:String(query).trim()};
  const response=await fetch("https://graphql.anilist.co",{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({query:gql,variables})
  });
  if(!response.ok) throw new Error("AniList não respondeu no navegador.");
  const payload=await response.json();
  if(linkMatch){
    return payload?.data?.Media ? [normalizeAniDirect(payload.data.Media)] : [];
  }
  return (payload?.data?.Page?.media || []).map(normalizeAniDirect);
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

    supabase.functions.setAuth(session.access_token);
    const {data,error} = await supabase.functions.invoke("mangamorph-import-metadata",{
      body:{input:query}
    });
    if(error) throw error;

    results = Array.isArray(data?.results) ? data.results : [];

    if((data?.error || !results.length) && (/anilist\.co\/manga\//i.test(query) || !/^https?:\/\//i.test(query))){
      try{
        results = await searchAniListDirect(query);
      }catch{}
    }

    if(!results.length){
      throw new Error(data?.error || "Nenhuma obra encontrada.");
    }

    renderResults();
    setMessage(results.length === 1 ? "1 resultado encontrado." : results.length + " resultados encontrados.");
  }catch(error){
    let text = error?.message || "Não foi possível consultar a fonte.";
    try{
      if(error?.context && typeof error.context.clone === "function"){
        const payload = await error.context.clone().json();
        if(payload?.error) text = payload.error;
      }
    }catch{}
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
