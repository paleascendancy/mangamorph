import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

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

if(status&&coverInput){
  const tools=document.createElement("div");
  tools.className="anilist-cover-tools";
  tools.innerHTML=`
    <button id="importAniListCover" type="button">✨ Buscar capa automaticamente</button>
    <span id="anilistCoverMessage">Se a obra for salva sem capa, o MangaMorph procura sozinho por títulos equivalentes.</span>
    <img id="anilistCoverPreview" alt="Prévia da capa encontrada" hidden>
  `;
  status.insertAdjacentElement("afterend",tools);

  const style=document.createElement("style");
  style.textContent=`
    .anilist-cover-tools{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.55rem .7rem;align-items:center;margin-top:.6rem;padding:.65rem;border:1px solid rgba(255,255,255,.07);border-radius:.75rem;background:rgba(255,255,255,.025)}
    .anilist-cover-tools button{min-height:2.35rem;padding:0 .75rem;border:1px solid rgba(122,166,228,.2);border-radius:.65rem;background:#172234;color:#eaf2ff;font-size:.68rem;font-weight:800;cursor:pointer}
    .anilist-cover-tools button:disabled{opacity:.55;cursor:wait}.anilist-cover-tools span{color:#7e8b9d;font-size:.62rem;line-height:1.4}
    .anilist-cover-tools img{grid-column:1/-1;width:72px;aspect-ratio:3/4;border-radius:.55rem;object-fit:cover;border:1px solid rgba(255,255,255,.08)}
    @media(max-width:620px){.anilist-cover-tools{grid-template-columns:1fr}.anilist-cover-tools img{grid-column:auto}}
  `;
  document.head.append(style);

  const button=$("importAniListCover");
  const message=$("anilistCoverMessage");
  const preview=$("anilistCoverPreview");

  async function resolveCover(mangaId,{automatic=false}={}){
    if(busy)return null;
    if(!Number.isInteger(mangaId)||mangaId<1){
      if(!automatic)message.textContent="Salve a obra primeiro ou selecione uma obra existente.";
      return null;
    }

    busy=true;
    button.disabled=true;
    button.textContent=automatic?"Buscando capa…":"Buscando…";
    message.textContent=automatic
      ?"A obra ficou sem capa. Procurando pelo nome em português, títulos alternativos, AniList e MyAnimeList…"
      :"Comparando títulos e procurando a melhor capa…";

    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)throw new Error("Entre novamente no painel administrativo.");
      supabase.functions.setAuth(session.access_token);
      const {data,error}=await supabase.functions.invoke("mangamorph-import-anilist-cover",{body:{manga_id:mangaId}});
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||"Não foi possível encontrar uma capa segura.");

      const url=String(data.cover_url||"");
      const imported=$("mangaImportedCoverUrl");
      if(imported)imported.value=url;
      status.textContent="Capa encontrada automaticamente e salva no MangaMorph.";
      const source=data.provider==="jikan"?"MyAnimeList":"AniList";
      const score=Number(data.match_score);
      message.textContent=`Pronto: ${data.matched_title||"correspondência encontrada"} · ${source}${Number.isFinite(score)?` · ${Math.round(score*100)}%`:""}.`;
      if(url){preview.src=url;preview.hidden=false;}
      window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data}));
      return data;
    }catch(error){
      let text=error?.message||"Falha ao buscar a capa.";
      try{
        if(error?.context&&typeof error.context.clone==="function"){
          const payload=await error.context.clone().json();
          if(payload?.error)text=payload.error;
        }
      }catch{}
      message.textContent=automatic
        ?"Busca automática: "+String(text)
        :String(text);
      return null;
    }finally{
      busy=false;
      button.disabled=false;
      button.textContent="✨ Buscar capa automaticamente";
    }
  }

  function tryAutomaticLookup(manga={}){
    const mangaId=Number(manga.id||$("mangaIdInput")?.value);
    const existing=String(manga.cover_url||$("mangaImportedCoverUrl")?.value||"").trim();
    if(!Number.isInteger(mangaId)||mangaId<1||existing||autoTried.has(mangaId))return;
    if(coverInput.files?.length)return;
    autoTried.add(mangaId);
    resolveCover(mangaId,{automatic:true});
  }

  button.addEventListener("click",()=>{
    const mangaId=Number($("mangaIdInput")?.value);
    resolveCover(mangaId,{automatic:false});
  });

  window.addEventListener("mangamorph:admin-manga-saved",event=>{
    tryAutomaticLookup(event.detail||{});
  });

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
