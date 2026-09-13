import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { unzipSync } from "https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm";

const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const BUCKET="mangamorph-content";
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);

const chapterNumberInput=$("chapterNumberInput");
if(chapterNumberInput){
  chapterNumberInput.min="0";
  chapterNumberInput.step="0.01";
  chapterNumberInput.inputMode="decimal";
}

function setMessage(text,error=false,node=$("chapterMessage")){
  if(!node)return;
  node.textContent=text||"";
  node.hidden=!text;
  node.classList.toggle("error",Boolean(error));
}

function friendly(error,fallback="Não foi possível concluir a operação."){
  const raw=String(error?.message||error||"");
  const code=String(error?.code||"");
  if(code==="23505"||/duplicate key|unique constraint/i.test(raw))return "Esse capítulo já existe para esta obra.";
  if(code==="42501"||/row-level security|permission denied|not authorized/i.test(raw))return "Sua sessão não possui permissão para esta operação.";
  if(/failed to fetch|network|load failed/i.test(raw))return "Falha de conexão. Verifique a internet e tente novamente.";
  return raw&&raw.length<220?raw:fallback;
}

function fmtChapter(value){
  const n=Number(value);
  return Number.isInteger(n)?String(n):String(n).replace(".",",");
}

function safeName(name){
  return String(name||"pagina")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9._-]+/g,"-")
    .replace(/^-+|-+$/g,"").slice(-140)||"pagina";
}

async function ensureAdmin(){
  const {data:{session}}=await db.auth.getSession();
  if(!session)throw new Error("Sua sessão expirou. Entre novamente no painel administrativo.");
  const {data,error}=await db.rpc("is_mangamorph_admin");
  if(error||data!==true)throw new Error("Esta conta não possui acesso administrativo.");
  return session;
}

function refreshChapterUi(chapterId=null){
  const mangaId=Number($("chapterMangaSelect")?.value)||null;
  window.dispatchEvent(new CustomEvent("mangamorph:chapters-imported",{detail:{mangaId}}));
  if(chapterId){
    let attempts=0;
    const focus=()=>{
      const row=document.querySelector(`[data-select-chapter="${chapterId}"]`);
      if(row){row.click();return}
      if(++attempts<12)setTimeout(focus,80);
    };
    setTimeout(focus,80);
  }
}

async function pageCount(chapterId){
  const {count,error}=await db.from("mangamorph_chapter_pages")
    .select("*",{count:"exact",head:true})
    .eq("chapter_id",chapterId);
  if(error)throw error;
  return count||0;
}

async function listStorageTree(prefix,depth=0){
  if(depth>5)return [];
  const out=[];
  let offset=0;
  for(;;){
    const {data,error}=await db.storage.from(BUCKET).list(prefix,{limit:100,offset});
    if(error)throw error;
    const rows=data||[];
    for(const item of rows){
      const path=prefix?`${prefix}/${item.name}`:item.name;
      if(item.id||item.metadata)out.push(path);
      else out.push(...await listStorageTree(path,depth+1));
    }
    if(rows.length<100)break;
    offset+=100;
  }
  return out;
}

async function removeStoragePaths(paths){
  for(let i=0;i<paths.length;i+=100){
    const {error}=await db.storage.from(BUCKET).remove(paths.slice(i,i+100));
    if(error)throw error;
  }
}

/* A chapter starts as a draft. Publishing is only allowed after at least one page exists. */
document.addEventListener("submit",async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=="chapterForm")return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const mangaId=Number($("chapterMangaSelect")?.value);
  const chapterNumber=Number($("chapterNumberInput")?.value);
  const title=String($("chapterTitleInput")?.value||"").trim();
  const wantedPublished=Boolean($("chapterPublishedInput")?.checked);
  const submit=form.querySelector('button[type="submit"]');

  if(!Number.isInteger(mangaId)||mangaId<1)return setMessage("Selecione uma obra antes de criar o capítulo.",true);
  if(!Number.isFinite(chapterNumber)||chapterNumber<0)return setMessage("Informe um número de capítulo válido. O capítulo 0 também é aceito.",true);

  if(submit)submit.disabled=true;
  setMessage("Criando capítulo com segurança…");
  try{
    const session=await ensureAdmin();
    const {data:duplicate,error:duplicateError}=await db.from("mangamorph_chapters")
      .select("id")
      .eq("manga_id",mangaId)
      .eq("chapter_number",chapterNumber)
      .maybeSingle();
    if(duplicateError)throw duplicateError;
    if(duplicate)throw new Error(`O capítulo ${fmtChapter(chapterNumber)} já existe nesta obra.`);

    const {data:created,error}=await db.from("mangamorph_chapters").insert({
      manga_id:mangaId,
      chapter_number:chapterNumber,
      title:title||null,
      published:false,
      published_at:null,
      created_by:session.user.id,
      updated_by:session.user.id
    }).select("id,chapter_number").single();
    if(error)throw error;

    form.reset();
    refreshChapterUi(created.id);
    setMessage(wantedPublished
      ? `Capítulo ${fmtChapter(chapterNumber)} criado como rascunho. Envie as páginas e depois publique.`
      : `Capítulo ${fmtChapter(chapterNumber)} criado como rascunho.`);
  }catch(error){
    setMessage(friendly(error),true);
  }finally{
    if(submit)submit.disabled=false;
  }
},true);

/* Prevent empty chapters from becoming public and clean Storage when deleting a chapter. */
document.addEventListener("click",async event=>{
  const toggle=event.target.closest?.("[data-toggle-chapter]");
  const remove=event.target.closest?.("[data-delete-chapter]");
  if(!toggle&&!remove)return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const button=toggle||remove;
  button.disabled=true;

  try{
    const session=await ensureAdmin();
    const id=Number((toggle?.dataset.toggleChapter)||(remove?.dataset.deleteChapter));
    const {data:chapter,error}=await db.from("mangamorph_chapters")
      .select("id,manga_id,chapter_number,title,published,published_at")
      .eq("id",id).maybeSingle();
    if(error)throw error;
    if(!chapter)throw new Error("Este capítulo não existe mais.");

    if(toggle){
      if(!chapter.published){
        const count=await pageCount(chapter.id);
        if(count<1){
          setMessage(`Capítulo ${fmtChapter(chapter.chapter_number)} continua como rascunho: envie ao menos uma página antes de publicar.`,true);
          return;
        }
      }
      const next=!chapter.published;
      const {error:updateError}=await db.from("mangamorph_chapters").update({
        published:next,
        published_at:next?(chapter.published_at||new Date().toISOString()):chapter.published_at,
        updated_by:session.user.id
      }).eq("id",chapter.id);
      if(updateError)throw updateError;
      refreshChapterUi(chapter.id);
      setMessage(`Capítulo ${fmtChapter(chapter.chapter_number)} ${next?"publicado":"movido para rascunho"}.`);
      return;
    }

    if(!confirm(`Excluir permanentemente o capítulo ${fmtChapter(chapter.chapter_number)} e todas as páginas dele?`))return;
    const paths=await listStorageTree(`mangas/${chapter.manga_id}/chapters/${chapter.id}`).catch(()=>[]);
    const {error:deleteError}=await db.from("mangamorph_chapters").delete().eq("id",chapter.id);
    if(deleteError)throw deleteError;

    let storageWarning="";
    if(paths.length){
      try{await removeStoragePaths(paths)}catch{storageWarning=" Os registros foram removidos, mas alguns arquivos antigos podem precisar de limpeza."}
    }
    const pagesGrid=$("chapterPagesGrid");
    if(pagesGrid)pagesGrid.innerHTML='<div class="empty-admin">Selecione um capítulo.</div>';
    if($("pagesPanelTitle"))$("pagesPanelTitle").textContent="Selecione um capítulo";
    refreshChapterUi();
    setMessage(`Capítulo ${fmtChapter(chapter.chapter_number)} excluído.${storageWarning}`,Boolean(storageWarning));
  }catch(error){
    setMessage(friendly(error),true);
  }finally{
    button.disabled=false;
  }
},true);

function chapterFromName(name){
  const base=String(name||"").replace(/\.(zip|cbz)$/i,"");
  const preferred=base.match(/(?:cap(?:i|í)tulo|cap|chapter|ch)\s*[.#_-]*\s*(\d+(?:[.,]\d+)?)/i);
  const fallback=base.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)(?:[^\d]|$)/);
  const raw=(preferred||fallback)?.[1];
  return raw?Number(raw.replace(",",".")):null;
}

function mimeFor(name){
  const ext=(String(name).split(".").pop()||"").toLowerCase();
  return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",avif:"image/avif"})[ext]||"application/octet-stream";
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

async function importArchive(file,mangaId,session,publishNow){
  if(file.size>250*1024*1024)throw new Error(`${file.name}: arquivo maior que 250 MB.`);
  const chapterNumber=chapterFromName(file.name);
  if(chapterNumber===null||!Number.isFinite(chapterNumber)||chapterNumber<0)throw new Error(`${file.name}: não consegui identificar o número do capítulo. Use um nome como Capitulo 0.zip ou Capitulo 12.zip.`);

  await new Promise(resolve=>requestAnimationFrame(resolve));
  let entries;
  try{entries=unzipSync(new Uint8Array(await file.arrayBuffer()))}catch{throw new Error(`${file.name}: ZIP/CBZ inválido ou corrompido.`)}
  const pages=imageEntries(entries);
  if(!pages.length)throw new Error(`${file.name}: nenhuma imagem compatível encontrada.`);
  if(pages.length>400)throw new Error(`${file.name}: limite de 400 páginas por capítulo.`);

  let {data:chapter,error:chapterError}=await db.from("mangamorph_chapters")
    .select("id,manga_id,chapter_number,published,published_at")
    .eq("manga_id",mangaId)
    .eq("chapter_number",chapterNumber)
    .maybeSingle();
  if(chapterError)throw chapterError;

  let created=false;
  if(chapter){
    if(await pageCount(chapter.id)>0)throw new Error(`Capítulo ${fmtChapter(chapterNumber)}: já possui páginas e foi ignorado.`);
  }else{
    const createdResult=await db.from("mangamorph_chapters").insert({
      manga_id:mangaId,
      chapter_number:chapterNumber,
      title:null,
      published:false,
      published_at:null,
      created_by:session.user.id,
      updated_by:session.user.id
    }).select("id,manga_id,chapter_number,published,published_at").single();
    if(createdResult.error)throw createdResult.error;
    chapter=createdResult.data;
    created=true;
  }

  const uploaded=[];
  let inserted=false;
  try{
    const rows=[];
    for(let i=0;i<pages.length;i++){
      const [entryName,data]=pages[i];
      const page=i+1;
      const original=entryName.replace(/\\/g,"/").split("/").pop()||`page-${page}.jpg`;
      const mime=mimeFor(original);
      if(data.byteLength>15*1024*1024)throw new Error(`Página ${page} passa do limite de 15 MB.`);
      const path=`mangas/${mangaId}/chapters/${chapter.id}/${String(page).padStart(4,"0")}-${safeName(original)}`;
      const blob=new Blob([data],{type:mime});
      const {error:uploadError}=await db.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:mime,cacheControl:"31536000"});
      if(uploadError)throw uploadError;
      uploaded.push(path);
      rows.push({chapter_id:chapter.id,page_number:page,image_url:db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl});
      setMessage(`Capítulo ${fmtChapter(chapterNumber)}: enviando ${page} de ${pages.length} páginas…`,false,$("chapterArchiveMessage"));
    }

    const {error:insertError}=await db.from("mangamorph_chapter_pages").insert(rows);
    if(insertError)throw insertError;
    inserted=true;

    const patch={updated_by:session.user.id};
    if(publishNow&&!chapter.published){
      patch.published=true;
      patch.published_at=chapter.published_at||new Date().toISOString();
    }
    const {error:updateError}=await db.from("mangamorph_chapters").update(patch).eq("id",chapter.id);
    if(updateError)throw updateError;

    return {chapterId:chapter.id,chapterNumber,pages:pages.length,published:publishNow||chapter.published};
  }catch(error){
    if(inserted)await db.from("mangamorph_chapter_pages").delete().eq("chapter_id",chapter.id);
    if(uploaded.length)await removeStoragePaths(uploaded).catch(()=>{});
    if(created)await db.from("mangamorph_chapters").delete().eq("id",chapter.id);
    throw error;
  }
}

/* Replace the legacy archive handler so a failed upload can never leave a newly published empty chapter. */
document.addEventListener("change",async event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.id!=="chapterArchiveInput")return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const files=[...(input.files||[])].filter(file=>/\.(zip|cbz)$/i.test(file.name));
  if(!files.length)return;
  const mangaId=Number($("chapterMangaSelect")?.value);
  const messageNode=$("chapterArchiveMessage");
  const label=$("chapterArchiveButtonLabel");

  if(!mangaId){input.value="";return setMessage("Selecione a obra antes de importar os capítulos.",true,messageNode)}
  input.disabled=true;
  if(label)label.textContent="Importando…";
  setMessage(`Preparando ${files.length}${files.length===1?" arquivo…":" arquivos…"}`,false,messageNode);

  try{
    const session=await ensureAdmin();
    const completed=[];
    const failures=[];
    const seen=new Set();
    const ordered=files.sort((a,b)=>(chapterFromName(a.name)??999999)-(chapterFromName(b.name)??999999));

    for(const file of ordered){
      const number=chapterFromName(file.name);
      if(number!==null&&seen.has(number)){
        failures.push(`${file.name}: outro arquivo deste envio já usa o capítulo ${fmtChapter(number)}.`);
        continue;
      }
      if(number!==null)seen.add(number);
      try{completed.push(await importArchive(file,mangaId,session,Boolean($("chapterArchivePublish")?.checked)))}
      catch(error){failures.push(friendly(error))}
    }

    refreshChapterUi(completed.at(-1)?.chapterId||null);
    const total=completed.reduce((sum,item)=>sum+item.pages,0);
    if(completed.length&&failures.length)setMessage(`${completed.length} capítulo(s) importado(s), ${total} páginas. ${failures.join(" ")}`,true,messageNode);
    else if(completed.length)setMessage(`${completed.length} capítulo(s) importado(s) com segurança, ${total} páginas.`,false,messageNode);
    else setMessage(failures.join(" ")||"Nenhum capítulo foi importado.",true,messageNode);
  }catch(error){
    setMessage(friendly(error,"Não foi possível importar os arquivos."),true,messageNode);
  }finally{
    input.value="";
    input.disabled=false;
    if(label)label.textContent="Importar ZIP/CBZ";
  }
},true);

/* The professional layer adds this view dynamically; keep its title consistent with the sidebar. */
document.addEventListener("click",event=>{
  if(!event.target.closest?.('[data-admin-view="activity"]'))return;
  setTimeout(()=>{if($("adminViewTitle"))$("adminViewTitle").textContent="Atividade"},0);
});
