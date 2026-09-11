import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if(!window.__mangamorphAniListProfileLoaded){
  window.__mangamorphAniListProfileLoaded=true;

  const supabase=createClient(
    "https://fnyellunugdfesprmvzm.supabase.co",
    "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const $=id=>document.querySelector("#"+id);
  const form=$("mangaAdminForm");
  const status=$("mangaCoverStatus");
  const coverInput=$("mangaCoverInput");
  const metadataSource=$("mangaMetadataSource");
  const metadataSourceId=$("mangaMetadataSourceId");
  const metadataSourceUrl=$("mangaMetadataSourceUrl");
  const autoTried=new Set();
  let busy=false;

  function parseAniListLink(raw){
    const value=String(raw||"").trim();
    if(!value)return null;
    try{
      const url=new URL(value);
      const host=url.hostname.toLowerCase().replace(/^www\./,"");
      if(host!=="anilist.co")return false;
      const match=url.pathname.match(/^\/manga\/(\d+)(?:\/|$)/i);
      if(!match)return false;
      const id=Number(match[1]);
      if(!Number.isInteger(id)||id<1)return false;
      return {id,url:`https://anilist.co/manga/${id}`};
    }catch{return false}
  }

  function ensureAniListField(){
    if(!form||$("mangaAniListUrlInput"))return;
    const coverLabel=coverInput?.closest("label");
    const label=document.createElement("label");
    label.className="wide anilist-link-field";
    label.innerHTML=`
      <span class="anilist-link-title">AniList da obra <small>opcional</small></span>
      <div class="anilist-link-input-wrap">
        <span class="anilist-link-mark">AL</span>
        <input id="mangaAniListUrlInput" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://anilist.co/manga/12345/...">
      </div>
      <small id="mangaAniListUrlHint">Cole o link exato do AniList. O MangaMorph salva o ID e usa esse perfil para capa, sinopse, autor, artista, gêneros, ano e status.</small>`;
    if(coverLabel)coverLabel.insertAdjacentElement("beforebegin",label);
    else form.querySelector(".admin-form-grid")?.append(label);
  }

  ensureAniListField();
  const aniInput=$("mangaAniListUrlInput");
  const aniHint=$("mangaAniListUrlHint");

  const style=document.createElement("style");
  style.id="mangamorphAniListAdminStyles";
  style.textContent=`
    .anilist-link-field{padding:.78rem;border:1px solid rgba(79,140,255,.18);border-radius:.85rem;background:linear-gradient(135deg,rgba(79,140,255,.07),rgba(79,140,255,.025))}
    .anilist-link-title{display:flex;align-items:center;gap:.42rem;margin-bottom:.45rem}.anilist-link-title small{padding:.15rem .36rem;border-radius:999px;background:rgba(79,140,255,.12);color:#8db7ff;font-size:.58rem;font-weight:850;text-transform:uppercase;letter-spacing:.06em}
    .anilist-link-input-wrap{display:flex!important;align-items:center;gap:.48rem;padding:.15rem .16rem .15rem .5rem;border:1px solid rgba(116,169,255,.16);border-radius:.7rem;background:rgba(4,12,22,.35)}
    .anilist-link-input-wrap:focus-within{border-color:rgba(79,140,255,.55);box-shadow:0 0 0 3px rgba(79,140,255,.08)}
    .anilist-link-mark{display:grid;place-items:center;width:1.72rem;height:1.72rem;border-radius:.48rem;background:#4f8cff;color:white;font-size:.62rem;font-weight:950;letter-spacing:-.03em;flex:none}
    .anilist-link-input-wrap input{min-width:0!important;width:100%!important;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;padding:.55rem .2rem!important}
    #mangaAniListUrlHint{display:block;margin-top:.42rem;color:#7589a2;line-height:1.45}
    .anilist-link-field.invalid{border-color:rgba(239,124,138,.45);background:rgba(239,124,138,.05)}
    .anilist-link-field.valid{border-color:rgba(88,211,154,.34)}
    .anilist-cover-tools{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.55rem .7rem;align-items:center;margin-top:.6rem;padding:.65rem;border:1px solid rgba(79,140,255,.13);border-radius:.75rem;background:rgba(79,140,255,.035)}
    .anilist-cover-tools button{min-height:2.35rem;padding:0 .75rem;border:1px solid rgba(122,166,228,.24);border-radius:.65rem;background:#15243a;color:#eef6ff;font-size:.68rem;font-weight:850;cursor:pointer}
    .anilist-cover-tools button:disabled{opacity:.55;cursor:wait}.anilist-cover-tools span{color:#7e91aa;font-size:.62rem;line-height:1.4}
    .anilist-cover-tools img{grid-column:1/-1;width:72px;aspect-ratio:3/4;border-radius:.55rem;object-fit:cover;border:1px solid rgba(255,255,255,.08)}
    @media(max-width:620px){.anilist-cover-tools{grid-template-columns:1fr}.anilist-cover-tools img{grid-column:auto}}
  `;
  document.head.append(style);

  function showLinkState(){
    if(!aniInput)return true;
    const field=aniInput.closest(".anilist-link-field");
    const parsed=parseAniListLink(aniInput.value);
    field?.classList.toggle("invalid",parsed===false);
    field?.classList.toggle("valid",!!parsed&&parsed!==false);
    if(parsed===false){
      aniHint.textContent="Link inválido. Use um endereço no formato https://anilist.co/manga/12345/...";
      return false;
    }
    if(parsed){
      aniHint.textContent=`AniList ID ${parsed.id} detectado. Ao salvar, este perfil terá prioridade sobre a busca por nome.`;
    }else{
      aniHint.textContent="Cole o link exato do AniList. Se ficar vazio, o MangaMorph tentará localizar a obra automaticamente pelo título.";
    }
    return true;
  }

  function syncHiddenFromVisible({allowClear=true}={}){
    if(!aniInput)return true;
    const parsed=parseAniListLink(aniInput.value);
    if(parsed===false)return false;
    if(parsed){
      metadataSource.value="AniList API";
      metadataSourceId.value=String(parsed.id);
      metadataSourceUrl.value=parsed.url;
    }else if(allowClear&&/anilist/i.test(String(metadataSource.value||""))){
      metadataSource.value="";
      metadataSourceId.value="";
      metadataSourceUrl.value="";
    }
    return true;
  }

  function syncVisibleFromHidden(){
    if(!aniInput)return;
    const source=String(metadataSource?.value||"");
    const id=Number(metadataSourceId?.value);
    const url=String(metadataSourceUrl?.value||"").trim();
    const parsed=parseAniListLink(url);
    if(parsed&&parsed!==false)aniInput.value=parsed.url;
    else if(/anilist/i.test(source)&&Number.isInteger(id)&&id>0)aniInput.value=`https://anilist.co/manga/${id}`;
    else aniInput.value="";
    showLinkState();
  }

  aniInput?.addEventListener("input",showLinkState);
  aniInput?.addEventListener("change",()=>{showLinkState();syncHiddenFromVisible()});

  form?.addEventListener("submit",event=>{
    if(!syncHiddenFromVisible()){
      event.preventDefault();
      event.stopImmediatePropagation();
      showLinkState();
      aniInput?.focus();
      const msg=$("mangaFormMessage");
      if(msg){msg.hidden=false;msg.textContent="Corrija o link do AniList antes de salvar.";msg.classList.add("error")}
    }
  },true);

  document.addEventListener("click",event=>{
    if(event.target.closest("[data-edit-manga],#newMangaButton,.manga-import-results button,[data-import-manga]")){
      queueMicrotask(syncVisibleFromHidden);
      setTimeout(syncVisibleFromHidden,40);
    }
  });

  document.querySelectorAll(".anilist-cover-tools").forEach((node,index)=>{if(index>0)node.remove()});

  if(status&&coverInput&&!document.querySelector("#importAniListCover")){
    const tools=document.createElement("div");
    tools.className="anilist-cover-tools";
    tools.innerHTML=`
      <button id="importAniListCover" type="button">✨ Atualizar perfil pelo AniList</button>
      <span id="anilistCoverMessage">A Scan fornece capítulos. O perfil da obra é atualizado pelo AniList; com o link acima, a correspondência é exata.</span>
      <img id="anilistCoverPreview" alt="Prévia da capa do AniList" hidden>`;
    status.insertAdjacentElement("afterend",tools);

    const button=$("importAniListCover");
    const message=$("anilistCoverMessage");
    const preview=$("anilistCoverPreview");

    async function resolveProfile(mangaId,{automatic=false}={}){
      if(busy)return null;
      if(!Number.isInteger(mangaId)||mangaId<1){
        if(!automatic)message.textContent="Salve a obra primeiro.";
        return null;
      }
      if(!syncHiddenFromVisible()){
        showLinkState();
        if(!automatic)message.textContent="Corrija o link do AniList antes de atualizar.";
        return null;
      }

      busy=true;
      button.disabled=true;
      button.textContent=automatic?"Atualizando perfil…":"Atualizando…";
      message.textContent=automatic?"Atualizando capa e informações da obra pelo AniList…":"Consultando o perfil exato do AniList…";

      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)throw new Error("Entre novamente no painel administrativo.");

        const parsed=parseAniListLink(aniInput?.value);
        if(parsed&&parsed!==false){
          const {error:saveLinkError}=await supabase.from("mangamorph_mangas").update({
            metadata_source:"AniList API",
            metadata_source_id:String(parsed.id),
            metadata_source_url:parsed.url
          }).eq("id",mangaId);
          if(saveLinkError)throw saveLinkError;
        }

        supabase.functions.setAuth(session.access_token);
        const {data,error}=await supabase.functions.invoke("mangamorph-import-anilist-cover",{body:{manga_id:mangaId}});
        if(error)throw error;
        if(!data?.ok)throw new Error(data?.error||"Não foi possível atualizar o perfil pelo AniList.");

        const url=String(data.cover_url||"");
        const imported=$("mangaImportedCoverUrl");
        if(imported)imported.value=url;
        if(data.anilist_id){
          metadataSource.value="AniList API";
          metadataSourceId.value=String(data.anilist_id);
          metadataSourceUrl.value=data.anilist_url||`https://anilist.co/manga/${data.anilist_id}`;
          aniInput.value=metadataSourceUrl.value;
          showLinkState();
        }
        status.textContent="Perfil atualizado pelo AniList e capa salva no MangaMorph.";
        const score=Number(data.match_score);
        message.textContent=`Pronto: ${data.anilist_title||"perfil encontrado"}${Number.isFinite(score)?` · ${Math.round(score*100)}%`:""}.`;
        if(url){preview.src=url;preview.hidden=false}
        window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data}));
        return data;
      }catch(error){
        let text=error?.message||"Falha ao consultar o AniList.";
        try{
          if(error?.context&&typeof error.context.clone==="function"){
            const payload=await error.context.clone().json();
            if(payload?.error)text=payload.error;
          }
        }catch{}
        message.textContent=automatic?"Atualização automática: "+String(text):String(text);
        return null;
      }finally{
        busy=false;
        button.disabled=false;
        button.textContent="✨ Atualizar perfil pelo AniList";
      }
    }

    function tryAutomaticLookup(manga={}){
      const mangaId=Number(manga.id||$("mangaIdInput")?.value);
      const parsed=parseAniListLink(aniInput?.value);
      const existingCover=String(manga.cover_url||$("mangaImportedCoverUrl")?.value||"").trim();
      const shouldTry=!!parsed||!existingCover;
      if(!Number.isInteger(mangaId)||mangaId<1||!shouldTry||autoTried.has(mangaId))return;
      if(coverInput.files?.length&&!parsed)return;
      autoTried.add(mangaId);
      resolveProfile(mangaId,{automatic:true});
    }

    button.addEventListener("click",()=>resolveProfile(Number($("mangaIdInput")?.value),{automatic:false}));
    window.addEventListener("mangamorph:admin-manga-saved",event=>tryAutomaticLookup(event.detail||{}));

    const saveMessage=$("mangaFormMessage");
    if(saveMessage){
      let lastText="";
      const detectSaved=()=>{
        const text=String(saveMessage.textContent||"").trim();
        if(text===lastText)return;
        lastText=text;
        if(/obra salva com sucesso/i.test(text))queueMicrotask(()=>{
          syncVisibleFromHidden();
          tryAutomaticLookup();
        });
      };
      new MutationObserver(detectSaved).observe(saveMessage,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden"]});
    }
  }

  syncVisibleFromHidden();
}
