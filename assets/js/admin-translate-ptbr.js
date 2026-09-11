import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if(!document.querySelector('link[data-mm-gray-theme]')){
  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='assets/css/system-gray.css?v=001';
  theme.dataset.mmGrayTheme='1';
  document.head.append(theme);
}
import("./theme-system.js?v=002").catch(()=>{});

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const $=id=>document.querySelector("#"+id);
let translating=false;

function setValue(id,value){
  const node=$(id);
  if(node)node.value=value??"";
}

async function translateCurrentProfile(mangaId){
  if(translating||!Number.isInteger(mangaId)||mangaId<1)return null;
  translating=true;
  const message=$("anilistCoverMessage");
  const button=$("importAniListCover");
  const oldText=button?.textContent||"✨ Atualizar perfil pelo AniList";
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error("Entre novamente no painel administrativo.");
    supabase.functions.setAuth(session.access_token);
    if(message)message.textContent="Traduzindo sinopse, gêneros e tags para português…";
    if(button){button.disabled=true;button.textContent="Traduzindo para PT-BR…";}

    const {data,error}=await supabase.functions.invoke("mangamorph-translate-profile-ptbr",{body:{manga_id:mangaId}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"Não foi possível traduzir o perfil.");

    setValue("mangaSynopsisInput",data.synopsis||"");
    setValue("mangaGenresInput",Array.isArray(data.genres)?data.genres.join(", "):"");
    setValue("mangaTagsInput",Array.isArray(data.tags)?data.tags.join(", "):"");
    if(message)message.textContent="Pronto. Sinopse, gêneros e tags foram traduzidos para PT-BR.";
    return data;
  }catch(error){
    let text=error?.message||"Falha ao traduzir o perfil.";
    try{
      if(error?.context&&typeof error.context.clone==="function"){
        const payload=await error.context.clone().json();
        if(payload?.error)text=payload.error;
      }
    }catch{}
    if(message)message.textContent="Dados do AniList salvos. Tradução automática não concluída: "+text;
    return null;
  }finally{
    translating=false;
    if(button){button.disabled=false;button.textContent=oldText;}
  }
}

window.addEventListener("mangamorph:admin-cover-imported",event=>{
  const mangaId=Number(event.detail?.manga_id||$("mangaIdInput")?.value);
  setTimeout(()=>translateCurrentProfile(mangaId),50);
});

window.addEventListener("mangamorph:admin-manga-saved",event=>{
  const source=String($("mangaMetadataSource")?.value||event.detail?.metadata_source||"");
  const mangaId=Number(event.detail?.id||$("mangaIdInput")?.value);
  if(/anilist/i.test(source))setTimeout(()=>translateCurrentProfile(mangaId),120);
});
