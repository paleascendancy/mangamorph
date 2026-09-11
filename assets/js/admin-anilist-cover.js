import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if(!window.__mangamorphAniListProfileLoaded){
  window.__mangamorphAniListProfileLoaded=true;

  const supabase=createClient(
    "https://fnyellunugdfesprmvzm.supabase.co",
    "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const $=id=>document.querySelector("#"+id);
  const status=$("mangaCoverStatus");
  const coverInput=$("mangaCoverInput");
  const autoTried=new Set();
  let busy=false;

  document.querySelectorAll(".anilist-cover-tools").forEach((node,index)=>{if(index>0)node.remove()});

  if(status&&coverInput&&!document.querySelector("#importAniListCover")){
    const tools=document.createElement("div");
    tools.className="anilist-cover-tools";
    tools.innerHTML=`
      <button id="importAniListCover" type="button">✨ Atualizar perfil pelo AniList</button>
      <span id="anilistCoverMessage">A Scan fornece capítulos. Capa, sinopse, gêneros, autor, artista, ano, status e títulos extras vêm do AniList.</span>
      <img id="anilistCoverPreview" alt="Prévia da capa do AniList" hidden>
    `;
    status.insertAdjacentElement("afterend",tools);

    const style=document.createElement("style");
    style.id="mangamorphAniListProfileStyles";
    style.textContent=`
      .anilist-cover-tools{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.55rem .7rem;align-items:center;margin-top:.6rem;padding:.68rem;border:1px solid rgba(81,145,255,.18);border-radius:.78rem;background:linear-gradient(135deg,rgba(49,112,225,.11),rgba(10,20,34,.42))}
      .anilist-cover-tools button{min-height:2.45rem;padding:0 .8rem;border:1px solid rgba(115,167,255,.28);border-radius:.66rem;background:#12284a;color:#eaf3ff;font-size:.68rem;font-weight:850;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.04)}
      .anilist-cover-tools button:hover{background:#17325b}.anilist-cover-tools button:disabled{opacity:.55;cursor:wait}.anilist-cover-tools span{color:#8fa4c1;font-size:.61rem;line-height:1.45}
      .anilist-cover-tools img{grid-column:1/-1;width:72px;aspect-ratio:3/4;border-radius:.55rem;object-fit:cover;border:1px solid rgba(115,167,255,.22)}
      @media(max-width:620px){.anilist-cover-tools{grid-template-columns:1fr}.anilist-cover-tools img{grid-column:auto}}
    `;
    document.head.append(style);

    const button=$("importAniListCover");
    const message=$("anilistCoverMessage");
    const preview=$("anilistCoverPreview");

    function setField(id,value){const node=$(id);if(node&&value!==undefined&&value!==null)node.value=Array.isArray(value)?value.join(", "):value}

    async function refreshEditor(mangaId){
      const {data}=await supabase.from("mangamorph_mangas").select("*").eq("id",mangaId).maybeSingle();
      if(!data)return;
      setField("mangaImportedCoverUrl",data.cover_url||"");
      setField("mangaMetadataSource",data.metadata_source||"");
      setField("mangaMetadataSourceId",data.metadata_source_id||"");
      setField("mangaMetadataSourceUrl",data.metadata_source_url||"");
      setField("mangaTypeInput",data.type||"Mangá");
      setField("mangaCountryInput",data.country||"");
      setField("mangaLanguageInput",data.original_language||"");
      setField("mangaAuthorInput",data.author||"");
      setField("mangaArtistInput",data.artist||"");
      setField("mangaYearInput",data.year||"");
      setField("mangaStatusInput",data.publication_status||"Em lançamento");
      setField("mangaAltTitlesInput",data.alternative_titles||[]);
      setField("mangaGenresInput",data.genres||[]);
      setField("mangaTagsInput",data.tags||[]);
      setField("mangaSynopsisInput",data.synopsis||"");
      if(data.cover_url){status.textContent="Capa oficial do AniList salva no MangaMorph.";preview.src=data.cover_url;preview.hidden=false;}
    }

    async function resolveProfile(mangaId,{automatic=false}={}){
      if(busy)return null;
      if(!Number.isInteger(mangaId)||mangaId<1){if(!automatic)message.textContent="Salve a obra primeiro ou selecione uma obra existente.";return null;}

      busy=true;
      button.disabled=true;
      button.textContent=automatic?"Atualizando perfil…":"Atualizando…";
      message.textContent=automatic
        ?"Obra da Scan detectada. Buscando o perfil correspondente no AniList…"
        :"Buscando a correspondência no AniList e atualizando os dados da obra…";

      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)throw new Error("Entre novamente no painel administrativo.");
        supabase.functions.setAuth(session.access_token);
        const {data,error}=await supabase.functions.invoke("mangamorph-import-anilist-cover",{body:{manga_id:mangaId}});
        if(error)throw error;
        if(!data?.ok)throw new Error(data?.error||"Não foi possível localizar essa obra no AniList.");

        await refreshEditor(mangaId);
        const score=Number(data.match_score);
        message.textContent=`Perfil atualizado: ${data.anilist_title||"AniList"}${Number.isFinite(score)?` · ${Math.round(score*100)}% de correspondência`:""}.`;
        window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data}));
        return data;
      }catch(error){
        let text=error?.message||"Falha ao atualizar o perfil pelo AniList.";
        try{if(error?.context&&typeof error.context.clone==="function"){const payload=await error.context.clone().json();if(payload?.error)text=payload.error}}catch{}
        message.textContent=(automatic?"AniList: ":"")+String(text);
        return null;
      }finally{
        busy=false;
        button.disabled=false;
        button.textContent="✨ Atualizar perfil pelo AniList";
      }
    }

    function tryAutomaticLookup(manga={}){
      const mangaId=Number(manga.id||$("mangaIdInput")?.value);
      const source=String(manga.metadata_source||$("mangaMetadataSource")?.value||"");
      const existing=String(manga.cover_url||$("mangaImportedCoverUrl")?.value||"").trim();
      const fromPartner=/^Parceiro:/i.test(source);
      if(!Number.isInteger(mangaId)||mangaId<1||autoTried.has(mangaId))return;
      if(coverInput.files?.length)return;
      if(existing&&!fromPartner)return;
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
        if(/obra salva com sucesso/i.test(text))queueMicrotask(()=>tryAutomaticLookup());
      };
      new MutationObserver(detectSaved).observe(saveMessage,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden"]});
    }
  }
}
