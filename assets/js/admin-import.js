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
if(helper)helper.textContent="Pesquise pelo nome ou cole o link do perfil da obra no MangaUpdates, MangaDex, MyAnimeList ou AniList. A descrição prioriza MangaUpdates, depois MangaDex e MyAnimeList; AniList fica apenas como referência de identificação.";
if(input)input.placeholder="Nome da obra ou link do perfil (MangaUpdates, MangaDex, MAL, AniList)";

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
function slugify(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140)}
function setMessage(text,error=false){if(!messageNode)return;messageNode.textContent=text||"";messageNode.hidden=!text;messageNode.classList.toggle("error",!!error)}
function setBusy(busy){if(input)input.disabled=busy;if(button){button.disabled=busy;button.textContent=busy?"Buscando…":"Buscar"}}

function renderResults(){
  if(!resultsNode)return;
  if(!results.length){resultsNode.innerHTML="";return}
  resultsNode.innerHTML=results.map((item,index)=>{
    const meta=[item.type,item.country,item.year,item.publicationStatus].filter(Boolean).join(" · ");
    const genres=(item.genres||[]).slice(0,4).join(" · ");
    const source=[item.source,item.synopsisSource?`Descrição: ${item.synopsisSource}`:""].filter(Boolean).join(" · ");
    const confidence=Number(item.matchScore);const match=Number.isFinite(confidence)?` · ${Math.round(confidence*100)}%`:"";
    const importing=importingIndex===index;
    return `<article class="manga-import-result"><div class="manga-import-cover">${item.coverUrl?`<img src="${escapeHtml(item.coverUrl)}" alt="" loading="lazy">`:'<span>MM</span>'}</div><div class="manga-import-copy"><div class="manga-import-source">${escapeHtml(source||"Metadados verificados")}${escapeHtml(match)}</div><strong>${escapeHtml(item.title||"Sem título")}</strong><span>${escapeHtml(meta)}</span><small>${escapeHtml(genres||"Dados encontrados em fontes externas")}</small></div><div class="manga-import-actions"><button type="button" data-use-import="${index}" ${importing?"disabled":""}>Revisar</button><button class="primary" type="button" data-quick-import="${index}" ${importing?"disabled":""}>${importing?"Importando…":"Importar"}</button></div></article>`;
  }).join("");
}

function setValue(id,value){const node=el(id);if(node)node.value=value??""}
function useResult(item){
  el("newMangaButton")?.click();
  setValue("mangaTitleInput",item.title);setValue("mangaSlugInput",slugify(item.title));setValue("mangaTypeInput",item.type||"Mangá");setValue("mangaCountryInput",item.country);setValue("mangaLanguageInput",item.originalLanguage);setValue("mangaAuthorInput",item.author);setValue("mangaArtistInput",item.artist);setValue("mangaPublisherInput",item.publisher);setValue("mangaYearInput",item.year||"");setValue("mangaStatusInput",item.publicationStatus||"Em lançamento");setValue("mangaAltTitlesInput",(item.alternativeTitles||[]).join(", "));setValue("mangaGenresInput",(item.genres||[]).join(", "));setValue("mangaTagsInput",(item.tags||[]).join(", "));setValue("mangaSynopsisInput",item.synopsis||"");setValue("mangaImportedCoverUrl",item.coverUrl||"");setValue("mangaMetadataSource",item.source||"");setValue("mangaMetadataSourceId",item.sourceId||"");setValue("mangaMetadataSourceUrl",item.sourceUrl||"");
  const cover=el("mangaCoverStatus");if(cover)cover.textContent=item.coverUrl?"Capa encontrada. Você pode substituí-la enviando outra imagem.":"As fontes não forneceram uma capa.";
  const title=el("mangaFormTitle");if(title)title.textContent="Revisar "+(item.title||"obra importada");
  setMessage(`Dados carregados. A descrição veio de ${item.synopsisSource||"uma fonte externa validada"}. Revise antes de salvar.`);
  el("mangaAdminForm")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function quickPayload(item,userId){return{title:String(item.title||"Sem título").trim(),slug:slugify(item.title||"obra"),type:item.type||"Mangá",country:item.country||null,original_language:item.originalLanguage||null,author:item.author||null,artist:item.artist||null,publisher:item.publisher||null,year:Number(item.year)||null,publication_status:item.publicationStatus||"Em lançamento",content_rating:"Livre",accent:"#3a4162",alternative_titles:Array.isArray(item.alternativeTitles)?item.alternativeTitles:[],genres:Array.isArray(item.genres)?item.genres:[],tags:Array.isArray(item.tags)?item.tags:[],synopsis:item.synopsis||"",cover_url:item.coverUrl||null,metadata_source:item.source||null,metadata_source_id:item.sourceId||null,metadata_source_url:item.sourceUrl||null,featured:false,published:false,published_at:null,created_by:userId,updated_by:userId}}
async function quickImport(item,index){
  if(!item||importingIndex!==-1)return;importingIndex=index;renderResults();setMessage("Importando a ficha como rascunho…");
  try{
    const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre na administração antes de importar.");
    const{data:isAdmin,error:adminError}=await supabase.rpc("is_mangamorph_admin");if(adminError||isAdmin!==true)throw new Error("Sua conta não possui acesso administrativo.");
    const slug=slugify(item.title||"");if(!slug)throw new Error("A obra encontrada não possui título válido.");
    const{data:duplicate,error:duplicateError}=await supabase.from("mangamorph_mangas").select("id,title,slug").eq("slug",slug).maybeSingle();if(duplicateError)throw duplicateError;if(duplicate)throw new Error(`A obra “${duplicate.title}” já está no MangaMorph.`);
    const{data:saved,error}=await supabase.from("mangamorph_mangas").insert(quickPayload(item,session.user.id)).select("id,title,slug").single();if(error)throw error;
    setMessage(`“${saved.title}” foi importada como rascunho. Atualizando o catálogo…`);setTimeout(()=>location.reload(),650);
  }catch(error){importingIndex=-1;renderResults();setMessage(error?.message||"Não foi possível importar a obra.",true)}
}

async function searchMetadata(query){
  const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Entre na administração antes de pesquisar.");
  supabase.functions.setAuth(session.access_token);
  const{data,error}=await supabase.functions.invoke("mangamorph-import-metadata",{body:{input:query}});
  if(error)throw error;if(!data?.ok)throw new Error(data?.error||"Não foi possível pesquisar a obra.");return Array.isArray(data.results)?data.results:[];
}

form?.addEventListener("submit",async event=>{
  event.preventDefault();const query=input?.value.trim()||"";if(query.length<2)return setMessage("Digite o nome da obra ou cole o link de um perfil suportado.",true);
  setBusy(true);setMessage("Consultando MangaUpdates, MangaDex e MyAnimeList…");results=[];renderResults();
  try{results=await searchMetadata(query);if(!results.length)throw new Error("Nenhuma obra confiável foi encontrada.");renderResults();setMessage(results.length===1?"1 resultado verificado encontrado.":`${results.length} resultados verificados encontrados.`)}catch(error){setMessage(error?.message||"Não foi possível pesquisar a obra.",true)}finally{setBusy(false)}
});

resultsNode?.addEventListener("click",event=>{const review=event.target.closest("[data-use-import]");if(review){const item=results[Number(review.dataset.useImport)];if(item)useResult(item);return}const quick=event.target.closest("[data-quick-import]");if(quick){const index=Number(quick.dataset.quickImport),item=results[index];if(item)quickImport(item,index)}});
