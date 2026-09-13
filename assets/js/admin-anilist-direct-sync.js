import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const $=id=>document.querySelector("#"+id);
const form=$("mangaAdminForm");
const coverInput=$("mangaCoverInput");
const coverStatus=$("mangaCoverStatus");
let busy=false;

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
function norm(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g," ").replace(/\s+/g," ").trim();
}
function titleScore(query,title){
  const a=norm(query),b=norm(title);
  if(!a||!b)return 0;
  if(a===b)return 1;
  if(a.length>=4&&b.includes(a))return .9;
  if(b.length>=4&&a.includes(b))return .84;
  const A=new Set(a.split(" ")),B=new Set(b.split(" "));
  let hit=0; for(const t of A)if(B.has(t))hit++;
  return A.size&&B.size?(2*hit)/(A.size+B.size):0;
}
function parseAniListLink(raw){
  const value=String(raw||"").trim();
  if(!value)return null;
  try{
    const url=new URL(value);
    if(url.hostname.toLowerCase().replace(/^www\./,"")!=="anilist.co")return false;
    const match=url.pathname.match(/^\/manga\/(\d+)(?:\/|$)/i);
    const id=Number(match?.[1]);
    return Number.isInteger(id)&&id>0?{id,url:`https://anilist.co/manga/${id}`}:false;
  }catch{return false}
}
function countryInfo(code,format){
  if(String(format||"").toUpperCase()==="NOVEL"){
    return {type:"Novel",country:code==="KR"?"Coreia do Sul":code==="CN"?"China":code==="TW"?"Taiwan":"Japão",language:code==="KR"?"Coreano":code==="CN"||code==="TW"?"Chinês":"Japonês"};
  }
  return ({
    JP:{type:"Mangá",country:"Japão",language:"Japonês"},
    KR:{type:"Manhwa",country:"Coreia do Sul",language:"Coreano"},
    CN:{type:"Manhua",country:"China",language:"Chinês"},
    TW:{type:"Manhua",country:"Taiwan",language:"Chinês"}
  })[code]||{type:"Mangá",country:code||"",language:""};
}
function publicationStatus(status){
  return ({RELEASING:"Em lançamento",FINISHED:"Concluído",HIATUS:"Pausado",CANCELLED:"Cancelado",NOT_YET_RELEASED:"Em breve"})[status]||"Em lançamento";
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

function ensureUi(){
  if(!form)return;
  if(!$("mangaAniListUrlInput")){
    const coverLabel=coverInput?.closest("label");
    const label=document.createElement("label");
    label.className="wide anilist-link-field";
    label.innerHTML=`
      <span class="anilist-link-title">AniList da obra <small>opcional</small></span>
      <div class="anilist-link-input-wrap">
        <span class="anilist-link-mark">AL</span>
        <input id="mangaAniListUrlInput" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://anilist.co/manga/12345/...">
      </div>
      <small id="mangaAniListUrlHint">Cole o link exato do AniList. Se ficar vazio, o MangaMorph procurará a obra pelo título.</small>`;
    if(coverLabel)coverLabel.insertAdjacentElement("beforebegin",label);
    else form.querySelector(".admin-form-grid")?.append(label);
  }
  if(coverStatus&&!$("importAniListCover")){
    const tools=document.createElement("div");
    tools.className="anilist-cover-tools";
    tools.innerHTML=`
      <button id="importAniListCover" type="button">✨ Atualizar perfil pelo AniList</button>
      <span id="anilistCoverMessage">Use um link exato ou deixe vazio para buscar automaticamente pelo título.</span>
      <img id="anilistCoverPreview" alt="Prévia da capa do AniList" hidden>`;
    coverStatus.insertAdjacentElement("afterend",tools);
  }
  if(!document.getElementById("mangamorphAniDirectStyles")){
    const style=document.createElement("style");
    style.id="mangamorphAniDirectStyles";
    style.textContent=`
      .anilist-link-field{padding:.78rem;border:1px solid rgba(79,140,255,.18);border-radius:.85rem;background:linear-gradient(135deg,rgba(79,140,255,.07),rgba(79,140,255,.025))}
      .anilist-link-title{display:flex;align-items:center;gap:.42rem;margin-bottom:.45rem}.anilist-link-title small{padding:.15rem .36rem;border-radius:999px;background:rgba(79,140,255,.12);color:#8db7ff;font-size:.58rem;font-weight:850;text-transform:uppercase;letter-spacing:.06em}
      .anilist-link-input-wrap{display:flex!important;align-items:center;gap:.48rem;padding:.15rem .16rem .15rem .5rem;border:1px solid rgba(116,169,255,.16);border-radius:.7rem;background:rgba(4,12,22,.35)}
      .anilist-link-input-wrap:focus-within{border-color:rgba(79,140,255,.55);box-shadow:0 0 0 3px rgba(79,140,255,.08)}
      .anilist-link-mark{display:grid;place-items:center;width:1.72rem;height:1.72rem;border-radius:.48rem;background:#4f8cff;color:#fff;font-size:.62rem;font-weight:950;flex:none}
      .anilist-link-input-wrap input{min-width:0!important;width:100%!important;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;padding:.55rem .2rem!important}
      #mangaAniListUrlHint{display:block;margin-top:.42rem;color:#7589a2;line-height:1.45}.anilist-link-field.invalid{border-color:rgba(239,124,138,.45)}.anilist-link-field.valid{border-color:rgba(88,211,154,.34)}
      .anilist-cover-tools{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.55rem .7rem;align-items:center;margin-top:.6rem;padding:.65rem;border:1px solid rgba(79,140,255,.13);border-radius:.75rem;background:rgba(79,140,255,.035)}
      .anilist-cover-tools button{min-height:2.35rem;padding:0 .75rem;border:1px solid rgba(122,166,228,.24);border-radius:.65rem;background:#15243a;color:#eef6ff;font-size:.68rem;font-weight:850;cursor:pointer}.anilist-cover-tools button:disabled{opacity:.55;cursor:wait}.anilist-cover-tools span{color:#7e91aa;font-size:.62rem;line-height:1.4}.anilist-cover-tools img{grid-column:1/-1;width:72px;aspect-ratio:3/4;border-radius:.55rem;object-fit:cover;border:1px solid rgba(255,255,255,.08)}
      @media(max-width:620px){.anilist-cover-tools{grid-template-columns:1fr}.anilist-cover-tools img{grid-column:auto}}
    `;
    document.head.append(style);
  }
}
ensureUi();

const aniInput=$("mangaAniListUrlInput");
const aniHint=$("mangaAniListUrlHint");
const message=$("anilistCoverMessage");
const button=$("importAniListCover");
const preview=$("anilistCoverPreview");

function showLinkState(){
  const field=aniInput?.closest(".anilist-link-field");
  const parsed=parseAniListLink(aniInput?.value);
  field?.classList.toggle("invalid",parsed===false);
  field?.classList.toggle("valid",!!parsed&&parsed!==false);
  if(!aniHint)return parsed!==false;
  if(parsed===false)aniHint.textContent="Link inválido. Use https://anilist.co/manga/12345/...";
  else if(parsed)aniHint.textContent=`AniList ID ${parsed.id} detectado. Esse perfil terá prioridade.`;
  else aniHint.textContent="Sem link: o MangaMorph procurará automaticamente pelo título da obra.";
  return parsed!==false;
}
function syncVisibleFromHidden(){
  if(!aniInput)return;
  const source=String($("mangaMetadataSource")?.value||"");
  const id=Number($("mangaMetadataSourceId")?.value);
  const raw=String($("mangaMetadataSourceUrl")?.value||"");
  const parsed=parseAniListLink(raw);
  if(parsed&&parsed!==false)aniInput.value=parsed.url;
  else if(/anilist/i.test(source)&&Number.isInteger(id)&&id>0)aniInput.value=`https://anilist.co/manga/${id}`;
  else aniInput.value="";
  showLinkState();
}
function syncHiddenFromVisible(){
  const parsed=parseAniListLink(aniInput?.value);
  if(parsed===false)return false;
  if(parsed){
    $("mangaMetadataSource").value="AniList API";
    $("mangaMetadataSourceId").value=String(parsed.id);
    $("mangaMetadataSourceUrl").value=parsed.url;
  }
  return true;
}
aniInput?.addEventListener("input",showLinkState);
aniInput?.addEventListener("change",syncHiddenFromVisible);

const FIELDS=`id siteUrl countryOfOrigin format status startDate{year} title{romaji english native} synonyms coverImage{extraLarge large medium} description(asHtml:false) genres tags{name rank} staff(perPage:30){edges{role node{name{full}}}} averageScore favourites popularity`;
async function aniRequest(query,variables){
  const response=await fetch("https://graphql.anilist.co",{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify({query,variables})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.errors?.length)throw new Error(payload?.errors?.[0]?.message||`AniList respondeu HTTP ${response.status}.`);
  return payload?.data||{};
}
async function fetchAniListById(id){
  const data=await aniRequest(`query($id:Int!){Media(id:$id,type:MANGA){${FIELDS}}}`,{id});
  if(!data?.Media)throw new Error("AniList não encontrou essa obra.");
  return data.Media;
}
async function fetchAniListByTitle(title,alternatives=[]){
  const search=String(title||"").trim();
  if(!search)throw new Error("A obra não possui título para buscar no AniList.");
  const data=await aniRequest(`query($search:String!){Page(page:1,perPage:10){media(search:$search,type:MANGA,sort:SEARCH_MATCH){${FIELDS}}}}`,{search});
  const items=data?.Page?.media||[];
  if(!items.length)throw new Error("Não encontrei essa obra no AniList. Tente colar o link exato.");
  const terms=uniq([search,...alternatives]);
  let best=items[0],bestScore=-1;
  for(const item of items){
    const titles=uniq([item?.title?.english,item?.title?.romaji,item?.title?.native,...(item?.synonyms||[])]);
    let score=0;
    for(const term of terms)for(const candidate of titles)score=Math.max(score,titleScore(term,candidate));
    if(score>bestScore){best=item;bestScore=score;}
  }
  if(bestScore<.38)throw new Error("A busca encontrou resultados, mas nenhum parece corresponder com segurança. Cole o link exato do AniList.");
  return best;
}
function setValue(id,value){const node=$(id);if(node)node.value=value??"";}
function normalizeMedia(media,currentTitle){
  const info=countryInfo(media.countryOfOrigin,media.format);
  const staff=people(media);
  const titles=uniq([media?.title?.english,media?.title?.romaji,media?.title?.native,...(media?.synonyms||[])]);
  const alt=titles.filter(v=>norm(v)!==norm(currentTitle));
  const genres=uniq(media?.genres||[]);
  const tags=uniq((media?.tags||[]).filter(t=>Number(t?.rank||0)>=60).slice(0,16).map(t=>t?.name));
  const cover=media?.coverImage?.extraLarge||media?.coverImage?.large||media?.coverImage?.medium||"";
  return {info,staff,alt,genres,tags,cover};
}
function fillEditor(media,normalized){
  setValue("mangaTypeInput",normalized.info.type);
  setValue("mangaCountryInput",normalized.info.country);
  setValue("mangaLanguageInput",normalized.info.language);
  setValue("mangaAuthorInput",normalized.staff.authors.join(", "));
  setValue("mangaArtistInput",normalized.staff.artists.join(", "));
  setValue("mangaYearInput",media?.startDate?.year||"");
  setValue("mangaStatusInput",publicationStatus(media.status));
  setValue("mangaAltTitlesInput",normalized.alt.join(", "));
  setValue("mangaGenresInput",normalized.genres.join(", "));
  setValue("mangaTagsInput",normalized.tags.join(", "));
  setValue("mangaSynopsisInput",stripAniText(media.description));
  setValue("mangaImportedCoverUrl",normalized.cover);
  setValue("mangaMetadataSource","AniList API");
  setValue("mangaMetadataSourceId",String(media.id));
  setValue("mangaMetadataSourceUrl",media.siteUrl||`https://anilist.co/manga/${media.id}`);
  if(aniInput)aniInput.value=`https://anilist.co/manga/${media.id}`;
  showLinkState();
}

async function updateFromAniList(){
  if(busy)return;
  const mangaId=Number($("mangaIdInput")?.value);
  if(!Number.isInteger(mangaId)||mangaId<1){if(message)message.textContent="Salve a obra primeiro.";return;}
  if(!showLinkState()){if(message)message.textContent="Corrija o link do AniList antes de atualizar.";return;}

  busy=true;
  if(button){button.disabled=true;button.textContent="Atualizando…";}
  if(message)message.textContent="Buscando dados no AniList…";
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("Entre novamente no painel administrativo.");

    const parsed=parseAniListLink(aniInput?.value);
    const title=$("mangaTitleInput")?.value||"";
    const alternatives=String($("mangaAltTitlesInput")?.value||"").split(",").map(v=>v.trim()).filter(Boolean);
    const media=parsed&&parsed!==false?await fetchAniListById(parsed.id):await fetchAniListByTitle(title,alternatives);
    const normalized=normalizeMedia(media,title);
    fillEditor(media,normalized);

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

    if(coverStatus)coverStatus.textContent=normalized.cover?"Capa carregada do AniList.":"Dados atualizados; o AniList não retornou capa.";
    if(preview&&normalized.cover){preview.src=normalized.cover;preview.hidden=false;}
    if(message)message.textContent=`Pronto: ${media?.title?.english||media?.title?.romaji||media?.title?.native||"obra encontrada"}.`;

    window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:{
      ok:true,manga_id:mangaId,provider:"anilist-browser",anilist_id:media.id,
      anilist_title:media?.title?.english||media?.title?.romaji||media?.title?.native||"AniList",
      anilist_url:patch.metadata_source_url,cover_url:normalized.cover,updated_fields:Object.keys(patch)
    }}));
  }catch(error){
    if(message)message.textContent=String(error?.message||error||"Falha ao consultar o AniList.");
  }finally{
    busy=false;
    if(button){button.disabled=false;button.textContent="✨ Atualizar perfil pelo AniList";}
  }
}

// This module is the single owner of the AniList update button.
document.addEventListener("click",event=>{
  const target=event.target.closest?.("#importAniListCover");
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  updateFromAniList();
},true);

form?.addEventListener("submit",event=>{
  if(!syncHiddenFromVisible()){
    event.preventDefault();
    event.stopImmediatePropagation();
    if(message)message.textContent="Corrija o link do AniList antes de salvar.";
    aniInput?.focus();
  }
},true);

document.addEventListener("click",event=>{
  if(event.target.closest?.("[data-edit-manga],#newMangaButton,.manga-import-results button,[data-import-manga]")){
    queueMicrotask(syncVisibleFromHidden);
    setTimeout(syncVisibleFromHidden,60);
  }
});
setTimeout(syncVisibleFromHidden,0);

import("./admin-translate-ptbr.js?v=001").catch(error=>console.error("MangaMorph PT-BR translation:",error));
