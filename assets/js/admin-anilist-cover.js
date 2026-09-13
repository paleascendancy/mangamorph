import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const $=id=>document.querySelector("#"+id);
let resolving=false;

function parseAniListId(raw){
  const match=String(raw||"").match(/anilist\.co\/manga\/(\d+)/i);
  const id=Number(match?.[1]);
  return Number.isInteger(id)&&id>0?id:null;
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
function setValue(id,value){const node=$(id);if(node)node.value=value??""}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

function ensureCandidateUi(){
  if(!document.getElementById("mangamorphAniResolverStyles")){
    const style=document.createElement("style");
    style.id="mangamorphAniResolverStyles";
    style.textContent=`
      .anilist-candidates{display:grid;gap:.42rem;margin-top:.5rem}
      .anilist-candidate{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:.48rem;align-items:center;padding:.46rem;border:1px solid rgba(105,157,238,.13);border-radius:.68rem;background:rgba(9,21,38,.48)}
      .anilist-candidate img,.anilist-candidate-cover{width:46px;aspect-ratio:3/4;border-radius:.45rem;object-fit:cover;background:#132236;display:grid;place-items:center;color:#7e98bd;font-size:.52rem;font-weight:850}
      .anilist-candidate-copy{min-width:0}.anilist-candidate-copy strong,.anilist-candidate-copy span,.anilist-candidate-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .anilist-candidate-copy strong{font-size:.62rem;color:#edf5ff}.anilist-candidate-copy span{margin-top:.08rem;color:#8da0b9;font-size:.5rem}.anilist-candidate-copy small{margin-top:.12rem;color:#667b98;font-size:.45rem}
      .anilist-candidate button{min-height:2rem;padding:0 .55rem;border:1px solid rgba(98,153,239,.22);border-radius:.52rem;background:#16305a;color:#dcecff;font-size:.5rem;font-weight:800}
      @media(max-width:520px){.anilist-candidate{grid-template-columns:42px minmax(0,1fr)}.anilist-candidate img,.anilist-candidate-cover{width:42px}.anilist-candidate button{grid-column:1/-1;width:100%}}
    `;
    document.head.append(style);
  }
  let list=$("anilistCandidateList");
  if(!list){
    list=document.createElement("div");
    list.id="anilistCandidateList";
    list.className="anilist-candidates";
    list.hidden=true;
    const message=$("anilistCoverMessage");
    if(message)message.insertAdjacentElement("afterend",list);
    else $("importAniListCover")?.insertAdjacentElement("afterend",list);
  }
  return list;
}
function clearCandidates(){const list=$("anilistCandidateList");if(list){list.innerHTML="";list.hidden=true}}
function renderCandidates(items){
  const list=ensureCandidateUi();
  const candidates=Array.isArray(items)?items.filter(x=>Number.isInteger(Number(x?.id))):[];
  if(!candidates.length){clearCandidates();return}
  list.innerHTML=candidates.map(item=>{
    const meta=[item.type,item.country,item.year].filter(Boolean).join(" · ");
    const subtitle=item.romaji&&item.romaji!==item.title?item.romaji:(item.native||"");
    const score=Number(item.score);const confidence=Number.isFinite(score)?`${Math.round(score*100)}% de compatibilidade`:"Perfil possível";
    const cover=item.cover_url?`<img src="${escapeHtml(item.cover_url)}" alt="" loading="lazy">`:'<span class="anilist-candidate-cover">AL</span>';
    return `<article class="anilist-candidate">${cover}<div class="anilist-candidate-copy"><strong>${escapeHtml(item.title||"Perfil AniList")}</strong><span>${escapeHtml(subtitle||meta||"AniList")}</span><small>${escapeHtml([meta,confidence].filter(Boolean).join(" · "))}</small></div><button type="button" data-anilist-choice="${Number(item.id)}">Usar este perfil</button></article>`;
  }).join("");
  list.hidden=false;
}

function fillEditor(row){
  if(!row)return;
  setValue("mangaTypeInput",row.type||"Mangá");
  setValue("mangaCountryInput",row.country||"");
  setValue("mangaLanguageInput",row.original_language||"");
  setValue("mangaAuthorInput",row.author||"");
  setValue("mangaArtistInput",row.artist||"");
  setValue("mangaPublisherInput",row.publisher||"");
  setValue("mangaYearInput",row.year||"");
  setValue("mangaStatusInput",row.publication_status||"Em lançamento");
  setValue("mangaAltTitlesInput",Array.isArray(row.alternative_titles)?row.alternative_titles.join(", "):"");
  setValue("mangaGenresInput",Array.isArray(row.genres)?row.genres.join(", "):"");
  setValue("mangaTagsInput",Array.isArray(row.tags)?row.tags.join(", "):"");
  setValue("mangaSynopsisInput",row.synopsis||"");
  setValue("mangaImportedCoverUrl",row.cover_url||"");
  setValue("mangaMetadataSource",row.metadata_source||"");
  setValue("mangaMetadataSourceId",row.metadata_source_id||"");
  setValue("mangaMetadataSourceUrl",row.metadata_source_url||"");

  const aniInput=$("mangaAniListUrlInput"),aniId=Number(row.metadata_source_id);
  if(aniInput&&/anilist/i.test(String(row.metadata_source||""))&&Number.isInteger(aniId)&&aniId>0){
    aniInput.value=`https://anilist.co/manga/${aniId}`;
    aniInput.dataset.userEdited="0";
    aniInput.dispatchEvent(new Event("input",{bubbles:true}));
  }
  const status=$("mangaCoverStatus");
  if(status)status.textContent=row.cover_url?"Capa salva no MangaMorph e perfil sincronizado pelo AniList.":"Perfil sincronizado; o AniList não retornou capa.";
  const preview=$("anilistCoverPreview");
  if(preview&&row.cover_url){preview.src=row.cover_url;preview.hidden=false}
}

async function readInvokeError(error){
  try{if(error?.context&&typeof error.context.clone==="function"){const payload=await error.context.clone().json();return payload?.error||payload?.message||""}}catch{}
  return error?.message||"";
}
async function invokeResolver(body){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("Entre novamente no painel administrativo.");
    supabase.functions.setAuth(session.access_token);
    const result=await supabase.functions.invoke("mangamorph-import-anilist-cover",{body});
    if(!result.error)return result;
    lastError=result.error;
    if(attempt===0)await delay(650);
  }
  throw lastError||new Error("Não foi possível consultar o resolvedor do AniList.");
}

async function resolveProfile(forcedId=null){
  if(resolving)return;
  const mangaId=Number($("mangaIdInput")?.value),button=$("importAniListCover"),message=$("anilistCoverMessage");
  if(!Number.isInteger(mangaId)||mangaId<1){if(message)message.textContent="Salve a obra primeiro.";return}

  resolving=true;clearCandidates();
  if(button){button.disabled=true;button.textContent=forcedId?"Confirmando perfil…":"Localizando perfil…"}
  if(message)message.textContent=forcedId?"Confirmando o perfil selecionado e salvando o vínculo…":"Busca ampliada: AniList, títulos alternativos, dados da scan e fontes de apoio…";

  try{
    const aniInput=$("mangaAniListUrlInput");
    const typedId=parseAniListId(aniInput?.value);
    const userEdited=aniInput?.dataset.userEdited==="1";
    const explicitId=Number(forcedId)||(userEdited?typedId:null);
    const {data}=await invokeResolver({manga_id:mangaId,...(explicitId?{anilist_id:explicitId}:{})});

    if(data?.needs_selection){
      renderCandidates(data.candidates||[]);
      if(message)message.textContent=data.error||"Encontrei perfis possíveis. Confirme o correto abaixo.";
      return;
    }
    if(!data?.ok)throw new Error(data?.error||"Não foi possível localizar a obra no AniList.");

    const {data:row,error:rowError}=await supabase.from("mangamorph_mangas")
      .select("id,type,country,original_language,author,artist,publisher,year,publication_status,alternative_titles,genres,tags,synopsis,cover_url,metadata_source,metadata_source_id,metadata_source_url")
      .eq("id",mangaId).maybeSingle();
    if(rowError)throw rowError;
    fillEditor(row);clearCandidates();

    if(message){const score=Number(data.match_score),certainty=Number.isFinite(score)?` · ${Math.round(score*100)}%`:"";message.textContent=`Pronto: ${data.anilist_title||"perfil encontrado"}${certainty}. Este vínculo ficou salvo para as próximas atualizações.`}
    setTimeout(()=>window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data})),80);
  }catch(error){
    const text=await readInvokeError(error);
    if(message)message.textContent=text||"Não foi possível sincronizar o perfil agora. A busca será tentada novamente quando você tocar no botão.";
  }finally{
    resolving=false;
    if(button){button.disabled=false;button.textContent="✨ Atualizar perfil pelo AniList"}
  }
}

document.addEventListener("click",event=>{
  const choice=event.target.closest?.("[data-anilist-choice]");
  if(choice){event.preventDefault();event.stopImmediatePropagation();const id=Number(choice.dataset.anilistChoice);const input=$("mangaAniListUrlInput");if(input&&Number.isInteger(id)){input.value=`https://anilist.co/manga/${id}`;input.dataset.userEdited="0";input.dispatchEvent(new Event("input",{bubbles:true}))}resolveProfile(id);return}
  const button=event.target.closest?.("#importAniListCover");
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();resolveProfile();
},true);

document.addEventListener("click",event=>{if(event.target.closest?.("[data-edit-manga],#newMangaButton"))clearCandidates()});