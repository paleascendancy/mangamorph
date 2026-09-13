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

function setValue(id,value){
  const node=$(id);
  if(node)node.value=value??"";
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

  const aniInput=$("mangaAniListUrlInput");
  const aniId=Number(row.metadata_source_id);
  if(aniInput&&/anilist/i.test(String(row.metadata_source||""))&&Number.isInteger(aniId)&&aniId>0){
    aniInput.value=`https://anilist.co/manga/${aniId}`;
    aniInput.dispatchEvent(new Event("input",{bubbles:true}));
  }

  const status=$("mangaCoverStatus");
  if(status)status.textContent=row.cover_url?"Capa salva no MangaMorph e perfil sincronizado pelo AniList.":"Perfil sincronizado; o AniList não retornou capa.";
  const preview=$("anilistCoverPreview");
  if(preview&&row.cover_url){preview.src=row.cover_url;preview.hidden=false;}
}

async function readInvokeError(error){
  try{
    if(error?.context&&typeof error.context.clone==="function"){
      const payload=await error.context.clone().json();
      return payload?.error||payload?.message||"";
    }
  }catch{}
  return error?.message||"";
}

async function resolveProfile(){
  if(resolving)return;
  const mangaId=Number($("mangaIdInput")?.value);
  const button=$("importAniListCover");
  const message=$("anilistCoverMessage");
  if(!Number.isInteger(mangaId)||mangaId<1){
    if(message)message.textContent="Salve a obra primeiro.";
    return;
  }

  resolving=true;
  if(button){button.disabled=true;button.textContent="Localizando perfil…";}
  if(message)message.textContent="Localizando a obra pelo AniList, títulos alternativos e dados da scan…";

  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("Entre novamente no painel administrativo.");

    const explicitId=parseAniListId($("mangaAniListUrlInput")?.value);
    supabase.functions.setAuth(session.access_token);
    const {data,error}=await supabase.functions.invoke("mangamorph-import-anilist-cover",{
      body:{manga_id:mangaId,...(explicitId?{anilist_id:explicitId}:{})}
    });
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"Não foi possível localizar a obra no AniList.");

    const {data:row,error:rowError}=await supabase.from("mangamorph_mangas")
      .select("id,type,country,original_language,author,artist,publisher,year,publication_status,alternative_titles,genres,tags,synopsis,cover_url,metadata_source,metadata_source_id,metadata_source_url")
      .eq("id",mangaId).maybeSingle();
    if(rowError)throw rowError;
    fillEditor(row);

    if(message){
      const score=Number(data.match_score);
      const certainty=Number.isFinite(score)?` · ${Math.round(score*100)}%`:"";
      message.textContent=`Pronto: ${data.anilist_title||"perfil encontrado"}${certainty}.`;
    }

    setTimeout(()=>window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data})),80);
  }catch(error){
    const text=await readInvokeError(error);
    if(message)message.textContent=text||"Não foi possível sincronizar o perfil agora.";
  }finally{
    resolving=false;
    if(button){button.disabled=false;button.textContent="✨ Atualizar perfil pelo AniList";}
  }
}

// This module loads before admin-anilist-direct-sync.js and owns the button first.
// The server resolver prevents stale translated titles and duplicate client matching.
document.addEventListener("click",event=>{
  const button=event.target.closest?.("#importAniListCover");
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolveProfile();
},true);
