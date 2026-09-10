import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { unzipSync } from "https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const select=document.querySelector("#chapterMangaSelect");
const input=document.querySelector("#chapterArchiveInput");
const publish=document.querySelector("#chapterArchivePublish");
const messageNode=document.querySelector("#chapterArchiveMessage");
const buttonLabel=document.querySelector("#chapterArchiveButtonLabel");

function setMessage(text,error=false){
  messageNode.textContent=text||"";
  messageNode.hidden=!text;
  messageNode.classList.toggle("error",Boolean(error));
}

function setBusy(busy){
  input.disabled=busy;
  if(buttonLabel)buttonLabel.textContent=busy?"Importando…":"Importar ZIP/CBZ";
}

function safeName(name){
  return String(name||"page")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");
}

function chapterFromName(name){
  const base=String(name||"").replace(/\.(zip|cbz)$/i,"");
  const preferred=base.match(/(?:cap(?:i|í)tulo|cap|chapter|ch)\s*[.#_-]*\s*(\d+(?:[.,]\d+)?)/i);
  const fallback=base.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)(?:[^\d]|$)/);
  const raw=(preferred||fallback)?.[1];
  return raw?Number(raw.replace(",",".")):null;
}

function mimeFor(name){
  const ext=(name.split(".").pop()||"").toLowerCase();
  return ({
    jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",
    webp:"image/webp",avif:"image/avif"
  })[ext]||"application/octet-stream";
}

function imageEntries(entries){
  return Object.entries(entries)
    .filter(([name,data])=>{
      if(!data?.length)return false;
      const clean=name.replace(/\\/g,"/");
      if(clean.startsWith("__MACOSX/")||clean.split("/").some(part=>part.startsWith(".")))return false;
      return /\.(jpe?g|png|webp|avif)$/i.test(clean);
    })
    .sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"}));
}

async function ensureAdmin(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error("Entre novamente no painel administrativo.");
  const {data,error}=await supabase.rpc("is_mangamorph_admin");
  if(error||data!==true)throw new Error("Esta conta não possui acesso administrativo.");
  return session;
}

async function importArchive(file,mangaId,session,publishNow){
  if(file.size>250*1024*1024)throw new Error(file.name+": arquivo maior que 250 MB.");
  const chapterNumber=chapterFromName(file.name);
  if(!chapterNumber||chapterNumber<=0)throw new Error(file.name+": não consegui identificar o número do capítulo. Use um nome como Capitulo 12.zip.");

  const bytes=new Uint8Array(await file.arrayBuffer());
  let entries;
  try{entries=unzipSync(bytes);}catch{throw new Error(file.name+": ZIP/CBZ inválido ou corrompido.");}
  const pages=imageEntries(entries);
  if(!pages.length)throw new Error(file.name+": nenhuma imagem compatível encontrada.");
  if(pages.length>400)throw new Error(file.name+": limite de 400 páginas por capítulo.");

  let {data:chapter,error:chapterError}=await supabase
    .from("mangamorph_chapters")
    .select("*")
    .eq("manga_id",mangaId)
    .eq("chapter_number",chapterNumber)
    .maybeSingle();
  if(chapterError)throw chapterError;

  let created=false;
  if(chapter){
    const {count,error:countError}=await supabase
      .from("mangamorph_chapter_pages")
      .select("*",{count:"exact",head:true})
      .eq("chapter_id",chapter.id);
    if(countError)throw countError;
    if((count||0)>0)throw new Error("Capítulo "+chapterNumber+": já possui páginas e foi ignorado.");
    if(publishNow&&!chapter.published){
      const {data:updated,error:updateError}=await supabase
        .from("mangamorph_chapters")
        .update({published:true,published_at:chapter.published_at||new Date().toISOString(),updated_by:session.user.id})
        .eq("id",chapter.id)
        .select()
        .single();
      if(updateError)throw updateError;
      chapter=updated;
    }
  }else{
    const {data:createdChapter,error:createError}=await supabase
      .from("mangamorph_chapters")
      .insert({
        manga_id:mangaId,
        chapter_number:chapterNumber,
        title:null,
        published:publishNow,
        published_at:publishNow?new Date().toISOString():null,
        created_by:session.user.id,
        updated_by:session.user.id
      })
      .select()
      .single();
    if(createError)throw createError;
    chapter=createdChapter;
    created=true;
  }

  const uploaded=[];
  try{
    const rows=[];
    for(let i=0;i<pages.length;i++){
      const [entryName,data]=pages[i];
      const page=i+1;
      const original=entryName.replace(/\\/g,"/").split("/").pop()||("page-"+page+".jpg");
      const mime=mimeFor(original);
      if(data.byteLength>15*1024*1024)throw new Error("Página "+page+" passa do limite de 15 MB.");
      const path="mangas/"+mangaId+"/chapters/"+chapter.id+"/"+String(page).padStart(4,"0")+"-"+safeName(original);
      const blob=new Blob([data],{type:mime});
      const {error:uploadError}=await supabase.storage
        .from("mangamorph-content")
        .upload(path,blob,{upsert:true,contentType:mime,cacheControl:"31536000"});
      if(uploadError)throw uploadError;
      uploaded.push(path);
      const url=supabase.storage.from("mangamorph-content").getPublicUrl(path).data.publicUrl;
      rows.push({chapter_id:chapter.id,page_number:page,image_url:url});
      setMessage("Capítulo "+chapterNumber+": enviando "+page+" de "+pages.length+" páginas…");
    }

    const {error:insertError}=await supabase.from("mangamorph_chapter_pages").insert(rows);
    if(insertError)throw insertError;
    return {chapterNumber,pages:pages.length};
  }catch(error){
    if(uploaded.length)await supabase.storage.from("mangamorph-content").remove(uploaded);
    await supabase.from("mangamorph_chapter_pages").delete().eq("chapter_id",chapter.id);
    if(created)await supabase.from("mangamorph_chapters").delete().eq("id",chapter.id);
    throw error;
  }
}

input?.addEventListener("change",async()=>{
  const files=Array.from(input.files||[]).filter(file=>/\.(zip|cbz)$/i.test(file.name));
  if(!files.length)return;

  const mangaId=Number(select?.value);
  if(!mangaId){
    input.value="";
    return setMessage("Selecione a obra antes de importar os capítulos.",true);
  }

  setBusy(true);
  setMessage("Preparando "+files.length+(files.length===1?" arquivo…":" arquivos…"));

  try{
    const session=await ensureAdmin();
    const completed=[];
    const failures=[];
    const ordered=files.sort((a,b)=>(chapterFromName(a.name)||999999)-(chapterFromName(b.name)||999999));

    for(const file of ordered){
      try{
        const result=await importArchive(file,mangaId,session,Boolean(publish?.checked));
        completed.push(result);
      }catch(error){
        failures.push(error?.message||String(error));
      }
    }

    window.dispatchEvent(new CustomEvent("mangamorph:chapters-imported",{detail:{mangaId}}));

    const pageTotal=completed.reduce((sum,item)=>sum+item.pages,0);
    if(completed.length&&failures.length){
      setMessage(completed.length+" capítulo(s) importado(s), "+pageTotal+" páginas. "+failures.join(" "),true);
    }else if(completed.length){
      setMessage(completed.length+" capítulo(s) importado(s) automaticamente, "+pageTotal+" páginas.");
    }else{
      setMessage(failures.join(" ")||"Nenhum capítulo foi importado.",true);
    }
  }catch(error){
    setMessage(error?.message||"Não foi possível importar os arquivos.",true);
  }finally{
    input.value="";
    setBusy(false);
  }
});
