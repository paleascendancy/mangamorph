import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const $=id=>document.querySelector("#"+id);
let syncing=false;

function parseAniListId(raw){
  const match=String(raw||"").match(/anilist\.co\/manga\/(\d+)/i);
  const id=Number(match?.[1]);
  return Number.isInteger(id)&&id>0?id:null;
}

function uniq(values){
  return [...new Set((values||[]).filter(Boolean).map(v=>String(v).trim()).filter(Boolean))];
}

function stripAniText(value){
  return String(value||"")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<[^>]+>/g,"")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .trim();
}

function countryInfo(code,format){
  if(String(format||"").toUpperCase()==="NOVEL"){
    return {type:"Novel",country:code==="KR"?"Coreia do Sul":code==="CN"?"China":code==="TW"?"Taiwan":"Japão",language:code==="KR"?"Coreano":code==="CN"||code==="TW"?"Chinês":"Japonês"};
  }
  return ({
    JP:{type:"Mangá",country:"Japão",language:"Japonês"},
    KR:{type:"Manhwa",country:"Coreia do Sul",language:"Coreano"},
    CN:{type:"Manhua",country:"China",language:"Chinês",},
    TW:{type:"Manhua",country:"Taiwan",language:"Chinês"}
  })[code]||{type:"Mangá",country:code||"",language:""};
}

function publicationStatus(status){
  return ({
    RELEASING:"Em lançamento",
    FINISHED:"Concluído",
    HIATUS:"Pausado",
    CANCELLED:"Cancelado",
    NOT_YET_RELEASED:"Em breve"
  })[status]||"Em lançamento";
}

function people(media){
  const authors=[],artists=[];
  for(const edge of media?.staff?.edges||[]){
    const role=String(edge?.role||"").toLowerCase();
    const name=String(edge?.node?.name?.full||"").trim();
    if(!name)continue;
    if(role.includes("story")||role.includes("writer")||role.includes("original creator"))authors.push(name);
    if(role.includes("art")||role.includes("illustrat"))artists.push(name);
  }
  return {authors:uniq(authors),artists:uniq(artists)};
}

async function fetchAniListById(id){
  const query=`query($id:Int!){Media(id:$id,type:MANGA){
    id siteUrl countryOfOrigin format status startDate{year}
    title{romaji english native} synonyms
    coverImage{extraLarge large medium}
    description(asHtml:false) genres tags{name rank}
    staff(perPage:30){edges{role node{name{full}}}}
    averageScore favourites popularity
  }}`;
  const response=await fetch("https://graphql.anilist.co",{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({query,variables:{id}})
  });
  if(!response.ok)throw new Error(`AniList respondeu HTTP ${response.status} no navegador.`);
  const payload=await response.json();
  if(payload?.errors?.length)throw new Error(payload.errors[0]?.message||"AniList não retornou a obra.");
  if(!payload?.data?.Media)throw new Error("AniList não encontrou essa obra.");
  return payload.data.Media;
}

function setValue(id,value){
  const node=$(id);
  if(node)node.value=value??"";
}

function fillEditor(media,currentTitle){
  const info=countryInfo(media.countryOfOrigin,media.format);
  const staff=people(media);
  const titles=uniq([media?.title?.english,media?.title?.romaji,media?.title?.native,...(media?.synonyms||[])]);
  const alt=titles.filter(v=>v.toLowerCase()!==String(currentTitle||"").trim().toLowerCase());
  const genres=uniq(media?.genres||[]);
  const tags=uniq((media?.tags||[]).filter(t=>Number(t?.rank||0)>=60).slice(0,16).map(t=>t?.name));
  const cover=media?.coverImage?.extraLarge||media?.coverImage?.large||media?.coverImage?.medium||"";

  setValue("mangaTypeInput",info.type);
  setValue("mangaCountryInput",info.country);
  setValue("mangaLanguageInput",info.language);
  setValue("mangaAuthorInput",staff.authors.join(", "));
  setValue("mangaArtistInput",staff.artists.join(", "));
  setValue("mangaYearInput",media?.startDate?.year||"");
  setValue("mangaStatusInput",publicationStatus(media.status));
  setValue("mangaAltTitlesInput",alt.join(", "));
  setValue("mangaGenresInput",genres.join(", "));
  setValue("mangaTagsInput",tags.join(", "));
  setValue("mangaSynopsisInput",stripAniText(media.description));
  setValue("mangaImportedCoverUrl",cover);
  setValue("mangaMetadataSource","AniList API");
  setValue("mangaMetadataSourceId",String(media.id));
  setValue("mangaMetadataSourceUrl",media.siteUrl||`https://anilist.co/manga/${media.id}`);

  const aniInput=$("mangaAniListUrlInput");
  if(aniInput)aniInput.value=`https://anilist.co/manga/${media.id}`;
  return {info,staff,alt,genres,tags,cover};
}

async function syncExistingManga(){
  if(syncing)return;
  const button=$("importAniListCover");
  const message=$("anilistCoverMessage");
  const status=$("mangaCoverStatus");
  const preview=$("anilistCoverPreview");
  const mangaId=Number($("mangaIdInput")?.value);
  const aniId=parseAniListId($("mangaAniListUrlInput")?.value||$("mangaMetadataSourceUrl")?.value);

  if(!Number.isInteger(mangaId)||mangaId<1){
    if(message)message.textContent="Salve a obra primeiro.";
    return;
  }
  if(!aniId){
    if(message)message.textContent="Cole um link válido do AniList antes de atualizar.";
    return;
  }

  syncing=true;
  if(button){button.disabled=true;button.textContent="Atualizando dados…";}
  if(message)message.textContent="Buscando os mesmos dados exibidos em Importar obra…";

  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("Entre novamente no painel administrativo.");

    const media=await fetchAniListById(aniId);
    const currentTitle=$("mangaTitleInput")?.value||"";
    const normalized=fillEditor(media,currentTitle);

    const patch={
      alternative_titles:normalized.alt,
      type:normalized.info.type,
      country:normalized.info.country,
      original_language:normalized.info.language,
      author:normalized.staff.authors.join(", ")||null,
      artist:normalized.staff.artists.join(", ")||null,
      year:Number(media?.startDate?.year)||null,
      publication_status:publicationStatus(media.status),
      genres:normalized.genres,
      tags:normalized.tags,
      synopsis:stripAniText(media.description)||"",
      cover_url:normalized.cover||null,
      metadata_source:"AniList API",
      metadata_source_id:String(media.id),
      metadata_source_url:media.siteUrl||`https://anilist.co/manga/${media.id}`,
      source_score:Number(media.averageScore)?Number(media.averageScore)/10:null,
      source_favorites:Number(media.favourites)||null,
      source_views:Number(media.popularity)||null,
      source_metadata_synced_at:new Date().toISOString()
    };

    const {error}=await supabase.from("mangamorph_mangas").update(patch).eq("id",mangaId);
    if(error)throw error;

    if(status)status.textContent=normalized.cover?"Capa e informações carregadas diretamente do AniList.":"Informações carregadas do AniList; esta obra não retornou capa.";
    if(message)message.textContent="Pronto. Capa e informações do AniList foram aplicadas à obra.";
    if(preview&&normalized.cover){preview.src=normalized.cover;preview.hidden=false;}

    window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:{
      ok:true,manga_id:mangaId,provider:"anilist-browser",anilist_id:media.id,
      anilist_title:media?.title?.english||media?.title?.romaji||media?.title?.native||"AniList",
      anilist_url:patch.metadata_source_url,cover_url:normalized.cover,updated_fields:Object.keys(patch)
    }}));
  }catch(error){
    if(message)message.textContent=String(error?.message||error||"Falha ao consultar o AniList.");
  }finally{
    syncing=false;
    if(button){button.disabled=false;button.textContent="✨ Atualizar perfil pelo AniList";}
  }
}

document.addEventListener("click",event=>{
  const button=event.target.closest("#importAniListCover");
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  syncExistingManga();
},true);

import("./admin-translate-ptbr.js?v=001").catch(error=>console.error("MangaMorph PT-BR translation:",error));
