import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const $=id=>document.querySelector("#"+id);
const status=$("mangaCoverStatus");
const coverInput=$("mangaCoverInput");

if(status&&coverInput){
  const tools=document.createElement("div");
  tools.className="anilist-cover-tools";
  tools.innerHTML=`
    <button id="importAniListCover" type="button">⬇ Importar capa do AniList</button>
    <span id="anilistCoverMessage">Salva uma cópia permanente no Storage do MangaMorph.</span>
    <img id="anilistCoverPreview" alt="Prévia da capa importada" hidden>
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

  button.addEventListener("click",async()=>{
    const mangaId=Number($("mangaIdInput")?.value);
    if(!Number.isInteger(mangaId)||mangaId<1){
      message.textContent="Salve a obra primeiro ou selecione uma obra existente.";
      return;
    }

    button.disabled=true;
    button.textContent="Importando…";
    message.textContent="Buscando a melhor capa no AniList…";

    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)throw new Error("Entre novamente no painel administrativo.");
      supabase.functions.setAuth(session.access_token);
      const {data,error}=await supabase.functions.invoke("mangamorph-import-anilist-cover",{body:{manga_id:mangaId}});
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||"Não foi possível importar a capa.");

      const url=String(data.cover_url||"");
      $("mangaImportedCoverUrl").value=url;
      status.textContent="Capa do AniList importada e armazenada no MangaMorph.";
      message.textContent="Pronto: "+(data.anilist_title||"capa encontrada")+". A imagem agora fica salva no Storage.";
      if(url){preview.src=url;preview.hidden=false;}
      window.dispatchEvent(new CustomEvent("mangamorph:admin-cover-imported",{detail:data}));
    }catch(error){
      let text=error?.message||"Falha ao importar a capa.";
      try{
        if(error?.context&&typeof error.context.clone==="function"){
          const payload=await error.context.clone().json();
          if(payload?.error)text=payload.error;
        }
      }catch{}
      message.textContent=String(text);
    }finally{
      button.disabled=false;
      button.textContent="⬇ Importar capa do AniList";
    }
  });
}
