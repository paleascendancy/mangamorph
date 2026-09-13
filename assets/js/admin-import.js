import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const el=id=>document.querySelector("#"+id);
const form=el("mangaImportForm"),input=el("mangaImportInput"),button=el("mangaImportButton"),messageNode=el("mangaImportMessage"),resultsNode=el("mangaImportResults");
let results=[],importingIndex=-1;

const helper=form?.parentElement?.querySelector(".admin-helper");
if(helper)helper.textContent="Pesquise pelo nome ou cole um link do AniList/MyAnimeList. A busca consulta AniList e Jikan diretamente; scans parceiras autorizadas aparecem separadas abaixo.";

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
function slugify(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140)}
function uniq(items){return[...new Set((items||[]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
function setMessage(text,error=false){messageNode.textContent=text||"";messageNode.hidden=!text;messageNode.classList.toggle("error",!!error)}
function setBusy(busy){input.disabled=busy;button.disabled=busy;button.textContent=busy?"Buscando…":"Buscar"}
function isAdultText(values){return /(^|\W)(hentai|porn|pornografia|adulto|adult|smut|erotica|erótico|erotico|\+18|18\+)(\W|$)/i.test((values||[]).join(" "))}

function renderResults(){
  if(!results.length){resultsNode.innerHTML="";return}
  resultsNode.innerHTML=results.map((item,index)=>{
    const meta=[item.type,item.year,item.publicationStatus].filter(Boolean).join(" · ");
    const genres=(item.genres||[]).slice(0,4).join(" · ");
    const importing=importingIndex===index;
    return `<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MM</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">${escapeHtml(item.source||"Fonte externa")}</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml(meta)}</span><small>${escapeHtml(genres||"Metadados encontrados")}</small></div><div class="manga-import-actions"><button type="button" data-use-import="${index}" ${importing?"disabled":""}>Revisar</button><button class="primary" type="button" data-quick-import="${index}" ${importing?"disabled":""}>${importing?"Importando…":"Importar"}</button></div></article>`;
  }).join("");
}

function aniCountry(code){return({JP:{country:"Japão",language:"Japonês",type:"Mangá"},KR:{country:"Coreia do Sul",language:"Coreano",type:"Manhwa"},CN:{country:"China",language:"Chinês",type:"Manhua"},TW:{country:"Taiwan",language:"Chinês",type:"Manhua"}})[code]||{country:code||"",language:"",type:"Outro"}}
function aniStatus(s){return({RELEASING:"Em lançamento",FINISHED:"Concluído",HIATUS:"Pausado",CANCELLED:"Cancelado",NOT_YET_RELEASED:"Em breve"})[s]||"Em lançamento"}
function stripHtml(v){return String(v||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").trim()}
function normalizeAni(m){
  if(!m||m.isAdult)return null;
  const info=aniCountry(m.countryOfOrigin),authors=[],artists=[];
  for(const edge of m?.staff?.edges||[]){const role=String(edge?.role||"").toLowerCase(),name=edge?.node?.name?.full;if(!name)continue;if(role.includes("story")||role.includes("original creator")||role.includes("writer"))authors.push(name);if(role.includes("art")||role.includes("illustrat"))artists.push(name)}
  const title=m?.title?.english||m?.title?.romaji||m?.title?.native||"Sem título";
  return{source:"AniList API",sourceId:String(m?.id||""),sourceUrl:m?.siteUrl||(m?.id?"https://anilist.co/manga/"+m.id:""),title,alternativeTitles:uniq([m?.title?.romaji,m?.title?.english,m?.title?.native,...(m?.synonyms||[])]).filter(x=>x!==title),type:String(m?.format||"").toUpperCase()==="NOVEL"?"Novel":info.type,country:info.country,originalLanguage:info.language,author:uniq(authors).join(", "),artist:uniq(artists).join(", "),publisher:"",year:m?.startDate?.year||null,publicationStatus:aniStatus(m?.status),genres:uniq(m?.genres||[]),tags:uniq((m?.tags||[]).filter(t=>Number(t?.rank||0)>=60).slice(0,14).map(t=>t?.name)),synopsis:stripHtml(m?.description),coverUrl:m?.coverImage?.extraLarge||m?.coverImage?.large||""};
}
async function searchAniList(query){
  const id=String(query).match(/anilist\.co\/manga\/(\d+)/i)?.[1];
  const fields='id siteUrl isAdult countryOfOrigin format status startDate{year} title{romaji english native} synonyms coverImage{extraLarge large} description(asHtml:false) genres tags{name rank} staff(perPage:25){edges{role node{name{full}}}}';
  const gql=id?`query($id:Int!){Media(id:$id,type:MANGA){${fields}}}`:`query($search:String!){Page(page:1,perPage:8){media(search:$search,type:MANGA,sort:SEARCH_MATCH){${fields}}}}`;
  const response=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query:gql,variables:id?{id:Number(id)}:{search:String(query).trim()}})});
  if(!response.ok)throw new Error("AniList indisponível.");
  const payload=await response.json();
  const rows=id?[payload?.data?.Media]:(payload?.data?.Page?.media||[]);
  return rows.map(normalizeAni).filter(Boolean);
}

function normalizeJikan(m){
  if(!m||isAdultText([m.rating,m.type,...(m.genres||[]).map(x=>x?.name),...(m.themes||[]).map(x=>x?.name)]))return null;
  const raw=String(m.type||"").toLowerCase();let type="Mangá",country="Japão",language="Japonês";
  if(raw.includes("manhwa")){type="Manhwa";country="Coreia do Sul";language="Coreano"}else if(raw.includes("manhua")){type="Manhua";country="China";language="Chinês"}else if(raw.includes("novel"))type="Novel";
  const title=m?.title_english||m?.title||m?.title_japanese||"Sem título";
  const status=/finished/i.test(m?.status||"")?"Concluído":/hiatus/i.test(m?.status||"")?"Pausado":/discontinued/i.test(m?.status||"")?"Cancelado":"Em lançamento";
  return{source:"Jikan / MyAnimeList",sourceId:String(m?.mal_id||""),sourceUrl:m?.url||(m?.mal_id?"https://myanimelist.net/manga/"+m.mal_id:""),title,alternativeTitles:uniq([m?.title,m?.title_english,m?.title_japanese,...(m?.title_synonyms||[]),...((m?.titles||[]).map(x=>x?.title))]).filter(x=>x!==title),type,country,originalLanguage:language,author:uniq((m?.authors||[]).map(a=>a?.name)).join(", "),artist:"",publisher:uniq((m?.serializations||[]).map(s=>s?.name)).join(", "),year:m?.published?.from?new Date(m.published.from).getUTCFullYear():null,publicationStatus:status,genres:uniq([...(m?.genres||[]).map(g=>g?.name),...(m?.demographics||[]).map(g=>g?.name)]),tags:uniq((m?.themes||[]).map(g=>g?.name)),synopsis:stripHtml(m?.synopsis||m?.background),coverUrl:m?.images?.webp?.large_image_url||m?.images?.jpg?.large_image_url||m?.images?.jpg?.image_url||""};
}
async function searchJikan(query){
  const id=String(query).match(/myanimelist\.net\/manga\/(\d+)/i)?.[1];
  const url=id?`https://api.jikan.moe/v4/manga/${id}/full`:`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(String(query).trim())}&limit=8&order_by=members&sort=desc`;
  const response=await fetch(url,{headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("MyAnimeList/Jikan indisponível.");
  const payload=await response.json();
  const rows=id?[payload?.data]:(payload?.data||[]);
  return rows.map(normalizeJikan).filter(Boolean);
}

function mergeResults(a,b){const out=[],seen=new Set();for(const item of [...a,...b]){const key=slugify(item.title);if(!key||seen.has(key))continue;seen.add(key);out.push(item)}return out.slice(0,12)}
function setValue(id,value){const node=el(id);if(node)node.value=value??""}
function useResult(item){el("newMangaButton")?.click();setValue("mangaTitleInput",item.title);setValue("mangaSlugInput",slugify(item.title));setValue("mangaTypeInput",item.type||"Mangá");setValue("mangaCountryInput",item.country);setValue("mangaLanguageInput",item.originalLanguage);setValue("mangaAuthorInput",item.author);setValue("mangaArtistInput",item.artist);setValue("mangaPublisherInput",item.publisher);setValue("mangaYearInput",item.year||"");setValue("mangaStatusInput",item.publicationStatus||"Em lançamento");setValue("mangaAltTitlesInput",(item.alternativeTitles||[]).join(", "));setValue("mangaGenresInput",(item.genres||[]).join(", "));setValue("mangaTagsInput",(item.tags||[]).join(", "));setValue("mangaSynopsisInput",item.synopsis||"");setValue("mangaImportedCoverUrl",item.coverUrl||"");setValue("mangaMetadataSource",item.source||"");setValue("mangaMetadataSourceId",item.sourceId||"");setValue("mangaMetadataSourceUrl",item.sourceUrl||"");const cover=el("mangaCoverStatus");if(cover)cover.textContent=item.coverUrl?"Capa importada. Você pode substituí-la enviando outra imagem.":"A fonte não forneceu uma capa.";const title=el("mangaFormTitle");if(title)title.textContent="Revisar "+(item.title||"obra importada");setMessage("Dados carregados no editor. Revise e toque em Salvar obra.");el("mangaAdminForm")?.scrollIntoView({behavior:"smooth",block:"start"})}
function quickPayload(item,userId){return{title:String(item.title||"Sem título").trim(),slug:slugify(item.title||"obra"),type:item.type||"Mangá",country:item.country||null,original_language:item.originalLanguage||null,author:item.author||null,artist:item.artist||null,publisher:item.publisher||null,year:Number(item.year)||null,publication_status:item.publicationStatus||"Em lançamento",content_rating:"Livre",accent:"#3a4162",alternative_titles:Array.isArray(item.alternativeTitles)?item.alternativeTitles:[],genres:Array.isArray(item.genres)?item.genres:[],tags:Array.isArray(item.tags)?item.tags:[],synopsis:item.synopsis||"",cover_url:item.coverUrl||null,metadata_source:item.source||null,metadata_source_id:item.sourceId||null,metadata_source_url:item.sourceUrl||null,featured:false,published:false,published_at:null,created_by:userId,updated_by:userId}}
async function quickImport(item,index){if(!item||importingIndex!==-1)return;importingIndex=index;renderResults();setMessage("Importando a ficha da obra como rascunho…");try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre na administração antes de importar.");const{data:isAdmin,error:adminError}=await supabase.rpc("is_mangamorph_admin");if(adminError||isAdmin!==true)throw new Error("Sua conta não possui acesso administrativo.");const slug=slugify(item.title||"");if(!slug)throw new Error("A obra encontrada não possui um título válido.");const{data:duplicate,error:duplicateError}=await supabase.from("mangamorph_mangas").select("id,title,slug").eq("slug",slug).maybeSingle();if(duplicateError)throw duplicateError;if(duplicate)throw new Error(`A obra “${duplicate.title}” já está no MangaMorph.`);const{data:saved,error}=await supabase.from("mangamorph_mangas").insert(quickPayload(item,session.user.id)).select("id,title,slug").single();if(error)throw error;setMessage(`“${saved.title}” foi importada como rascunho. Atualizando o catálogo…`);setTimeout(()=>location.reload(),650)}catch(error){importingIndex=-1;renderResults();setMessage(error?.message||"Não foi possível importar a obra.",true)}}

form?.addEventListener("submit",async event=>{
  event.preventDefault();const query=input.value.trim();if(query.length<2)return setMessage("Digite o nome da obra ou cole um link do AniList/MyAnimeList.",true);setBusy(true);setMessage("Consultando AniList e MyAnimeList…");results=[];renderResults();
  try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre na administração antes de importar.");const{data:isAdmin,error:adminError}=await supabase.rpc("is_mangamorph_admin");if(adminError||isAdmin!==true)throw new Error("Sua conta não possui acesso administrativo.");let ani=[],mal=[];if(/anilist\.co\/manga\//i.test(query)){ani=await searchAniList(query)}else if(/myanimelist\.net\/manga\//i.test(query)){mal=await searchJikan(query)}else if(/^https?:\/\//i.test(query)){throw new Error("Cole um link de obra do AniList ou MyAnimeList.")}else{const settled=await Promise.allSettled([searchAniList(query),searchJikan(query)]);ani=settled[0].status==="fulfilled"?settled[0].value:[];mal=settled[1].status==="fulfilled"?settled[1].value:[]}results=mergeResults(ani,mal);if(!results.length)throw new Error("Nenhuma obra encontrada nas fontes de metadados.");renderResults();setMessage(results.length===1?"1 resultado encontrado. Você pode revisar ou importar direto.":results.length+" resultados encontrados. Você pode revisar ou importar direto.")}catch(error){setMessage(error?.message||"Não foi possível pesquisar a obra.",true)}finally{setBusy(false)}
});

resultsNode?.addEventListener("click",event=>{const review=event.target.closest("[data-use-import]");if(review){const item=results[Number(review.dataset.useImport)];if(item)useResult(item);return}const quick=event.target.closest("[data-quick-import]");if(quick){const index=Number(quick.dataset.quickImport),item=results[index];if(item)quickImport(item,index)}});
