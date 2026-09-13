const $=id=>document.querySelector("#"+id);
const form=$("mangaAdminForm");
const coverInput=$("mangaCoverInput");
const coverStatus=$("mangaCoverStatus");

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
      <small id="mangaAniListUrlHint">Cole o link exato apenas se quiser corrigir manualmente. O MangaMorph sempre verificará antes de salvar.</small>`;
    if(coverLabel)coverLabel.insertAdjacentElement("beforebegin",label);
    else form.querySelector(".admin-form-grid")?.append(label);
  }
  if(coverStatus&&!$("importAniListCover")){
    const tools=document.createElement("div");
    tools.className="anilist-cover-tools";
    tools.innerHTML=`
      <button id="importAniListCover" type="button">✨ Atualizar perfil pelo AniList</button>
      <span id="anilistCoverMessage">O perfil será validado antes de alterar a obra.</span>
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

function showLinkState(){
  const field=aniInput?.closest(".anilist-link-field");
  const parsed=parseAniListLink(aniInput?.value);
  field?.classList.toggle("invalid",parsed===false);
  field?.classList.toggle("valid",!!parsed&&parsed!==false);
  if(!aniHint)return parsed!==false;
  if(parsed===false)aniHint.textContent="Link inválido. Use https://anilist.co/manga/12345/...";
  else if(parsed&&aniInput?.dataset.userEdited==="1")aniHint.textContent=`AniList ID ${parsed.id} informado. Ele será verificado antes de substituir o perfil atual.`;
  else if(parsed)aniHint.textContent=`Perfil vinculado: AniList ID ${parsed.id}. O sistema usará o vínculo salvo, não uma nova busca cega.`;
  else aniHint.textContent="Sem link manual: o MangaMorph usará o vínculo verificado ou fará uma busca segura pelo título.";
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
  aniInput.dataset.userEdited="0";
  showLinkState();
}

aniInput?.addEventListener("input",event=>{
  if(event.isTrusted)aniInput.dataset.userEdited="1";
  showLinkState();
});

form?.addEventListener("submit",event=>{
  if(!showLinkState()){
    event.preventDefault();
    event.stopImmediatePropagation();
    const message=$("anilistCoverMessage");
    if(message)message.textContent="Corrija ou apague o link inválido do AniList antes de salvar.";
    aniInput?.focus();
  }
},true);

document.addEventListener("click",event=>{
  if(event.target.closest?.("[data-edit-manga],#newMangaButton,.manga-import-results button,[data-import-manga]")){
    queueMicrotask(syncVisibleFromHidden);
    setTimeout(syncVisibleFromHidden,80);
  }
});
setTimeout(syncVisibleFromHidden,0);

import("./admin-translate-ptbr.js?v=001").catch(error=>console.error("MangaMorph PT-BR translation:",error));