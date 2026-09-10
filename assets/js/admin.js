import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const el=id=>document.querySelector("#"+id);
const authBox=el("adminAuth"),app=el("adminApp"),loginForm=el("adminLoginForm"),loginMessage=el("adminLoginMessage");
let session=null,mangas=[],selectedManga=null,chapters=[],selectedChapter=null;

function message(node,text,error=false){node.textContent=text||"";node.hidden=!text;node.classList.toggle("error",error)}
function slugify(value){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140)}
function list(value){return String(value||"").split(",").map(x=>x.trim()).filter(Boolean)}
function fmtChapter(value){const n=Number(value);return Number.isInteger(n)?String(n):String(n).replace(".",",")}
function safeFileName(name){return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9._-]+/g,"-")}

async function isAdmin(){
  const {data,error}=await supabase.rpc("is_mangamorph_admin");
  return !error && data===true;
}

async function bootstrap(){
  const {data:{session:current}}=await supabase.auth.getSession();
  session=current;
  if(!session){authBox.hidden=false;app.hidden=true;return}
  if(!(await isAdmin())){authBox.hidden=false;app.hidden=true;message(loginMessage,"Esta conta não possui acesso administrativo.",true);return}
  authBox.hidden=true;app.hidden=false;
  await refreshAll();
}

loginForm.addEventListener("submit",async event=>{
  event.preventDefault();message(loginMessage,"");
  const {data,error}=await supabase.auth.signInWithPassword({email:el("adminEmail").value.trim(),password:el("adminPassword").value});
  if(error)return message(loginMessage,error.message,true);
  session=data.session;
  await bootstrap();
});

el("adminSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload()});

const viewTitles={dashboard:"Visão geral",mangas:"Obras",chapters:"Capítulos",moderation:"Moderação"};
function setView(name){
  document.querySelectorAll(".admin-view").forEach(v=>{v.hidden=true;v.classList.remove("active")});
  el("view"+name[0].toUpperCase()+name.slice(1)).hidden=false;
  document.querySelectorAll("[data-admin-view]").forEach(b=>b.classList.toggle("active",b.dataset.adminView===name));
  el("adminViewTitle").textContent=viewTitles[name]||"Administração";
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-admin-view]");if(b)setView(b.dataset.adminView)});

async function refreshAll(){
  await Promise.all([loadMangas(),loadStats(),loadReports()]);
  renderDashboardMangas();
}
el("adminRefresh").addEventListener("click",refreshAll);

async function loadStats(){
  const [{count:mangaCount},{count:pubCount},{count:chapterCount},{count:reportCount}]=await Promise.all([
    supabase.from("mangamorph_mangas").select("*",{count:"exact",head:true}),
    supabase.from("mangamorph_mangas").select("*",{count:"exact",head:true}).eq("published",true),
    supabase.from("mangamorph_chapters").select("*",{count:"exact",head:true}),
    supabase.from("mangamorph_reports").select("*",{count:"exact",head:true}).eq("status","pending")
  ]);
  el("statMangas").textContent=mangaCount||0;el("statPublished").textContent=pubCount||0;el("statChapters").textContent=chapterCount||0;el("statReports").textContent=reportCount||0;
}

async function loadMangas(){
  const {data,error}=await supabase.from("mangamorph_mangas").select("*").order("updated_at",{ascending:false});
  if(error)return;
  mangas=data||[];
  renderMangas();fillMangaSelect();
}
function renderDashboardMangas(){
  el("dashboardMangas").innerHTML=mangas.slice(0,6).map(m=>rowManga(m)).join("")||'<div class="empty-admin">Nenhuma obra cadastrada.</div>';
}
function rowManga(m){
  return '<div class="admin-list-row clickable" data-edit-manga="'+m.id+'"><div><strong>'+escapeHtml(m.title)+'</strong><span>'+escapeHtml(m.type)+' · '+(m.published?"Publicada":"Rascunho")+'</span></div><span>'+escapeHtml(m.slug)+'</span></div>';
}
function renderMangas(){
  const q=el("mangaAdminSearch").value.trim().toLowerCase();
  const items=mangas.filter(m=>!q||(m.title+" "+m.slug+" "+m.type).toLowerCase().includes(q));
  el("mangaAdminList").innerHTML=items.map(rowManga).join("")||'<div class="empty-admin">Nenhuma obra encontrada.</div>';
}
el("mangaAdminSearch").addEventListener("input",renderMangas);
document.addEventListener("click",e=>{const row=e.target.closest("[data-edit-manga]");if(row){const m=mangas.find(x=>x.id===Number(row.dataset.editManga));if(m)editManga(m)}});

function resetMangaForm(){
  selectedManga=null;el("mangaAdminForm").reset();el("mangaIdInput").value="";el("mangaImportedCoverUrl").value="";el("mangaMetadataSource").value="";el("mangaMetadataSourceId").value="";el("mangaMetadataSourceUrl").value="";el("mangaAccentInput").value="#3a4162";el("mangaRatingInput").value="Livre";el("mangaFormTitle").textContent="Nova obra";el("mangaDraftBadge").textContent="Rascunho";el("deleteMangaButton").disabled=true;el("mangaCoverStatus").textContent="Nenhuma nova capa selecionada.";message(el("mangaFormMessage"),"");
}
el("newMangaButton").addEventListener("click",resetMangaForm);
el("mangaTitleInput").addEventListener("input",()=>{if(!el("mangaIdInput").value)el("mangaSlugInput").value=slugify(el("mangaTitleInput").value)});

function editManga(m){
  selectedManga=m;setView("mangas");
  el("mangaIdInput").value=m.id;el("mangaImportedCoverUrl").value=m.cover_url||"";el("mangaMetadataSource").value=m.metadata_source||"";el("mangaMetadataSourceId").value=m.metadata_source_id||"";el("mangaMetadataSourceUrl").value=m.metadata_source_url||"";el("mangaTitleInput").value=m.title||"";el("mangaSlugInput").value=m.slug||"";el("mangaTypeInput").value=m.type||"Mangá";
  el("mangaCountryInput").value=m.country||"";el("mangaLanguageInput").value=m.original_language||"";el("mangaAuthorInput").value=m.author||"";el("mangaArtistInput").value=m.artist||"";el("mangaPublisherInput").value=m.publisher||"";
  el("mangaYearInput").value=m.year||"";el("mangaStatusInput").value=m.publication_status||"Em lançamento";el("mangaRatingInput").value=m.content_rating||"Livre";el("mangaAccentInput").value=m.accent||"#3a4162";
  el("mangaAltTitlesInput").value=(m.alternative_titles||[]).join(", ");el("mangaGenresInput").value=(m.genres||[]).join(", ");el("mangaTagsInput").value=(m.tags||[]).join(", ");el("mangaSynopsisInput").value=m.synopsis||"";
  el("mangaFeaturedInput").checked=!!m.featured;el("mangaPublishedInput").checked=!!m.published;el("mangaFormTitle").textContent="Editar "+m.title;el("mangaDraftBadge").textContent=m.published?"Publicada":"Rascunho";
  el("deleteMangaButton").disabled=false;el("mangaCoverStatus").textContent=m.cover_url?"Capa atual cadastrada.":"Sem capa.";
}

async function uploadCover(mangaId,file){
  if(!file)return el("mangaImportedCoverUrl").value||selectedManga?.cover_url||null;
  const ext=(file.name.split(".").pop()||"webp").toLowerCase();
  const path="covers/"+mangaId+"/cover."+ext;
  const {error}=await supabase.storage.from("mangamorph-content").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
  if(error)throw error;
  return supabase.storage.from("mangamorph-content").getPublicUrl(path).data.publicUrl+"?v="+Date.now();
}

el("mangaAdminForm").addEventListener("submit",async event=>{
  event.preventDefault();message(el("mangaFormMessage"),"Salvando...");
  const id=Number(el("mangaIdInput").value)||null;
  const payload={
    title:el("mangaTitleInput").value.trim(),slug:slugify(el("mangaSlugInput").value),type:el("mangaTypeInput").value,
    country:el("mangaCountryInput").value.trim()||null,original_language:el("mangaLanguageInput").value.trim()||null,
    author:el("mangaAuthorInput").value.trim()||null,artist:el("mangaArtistInput").value.trim()||null,publisher:el("mangaPublisherInput").value.trim()||null,
    year:Number(el("mangaYearInput").value)||null,publication_status:el("mangaStatusInput").value,content_rating:el("mangaRatingInput").value.trim()||"Livre",
    accent:el("mangaAccentInput").value,alternative_titles:list(el("mangaAltTitlesInput").value),genres:list(el("mangaGenresInput").value),tags:list(el("mangaTagsInput").value),
    synopsis:el("mangaSynopsisInput").value.trim(),metadata_source:el("mangaMetadataSource").value||null,metadata_source_id:el("mangaMetadataSourceId").value||null,metadata_source_url:el("mangaMetadataSourceUrl").value||null,featured:el("mangaFeaturedInput").checked,published:el("mangaPublishedInput").checked,
    published_at:el("mangaPublishedInput").checked?(selectedManga?.published_at||new Date().toISOString()):null,updated_by:session.user.id
  };
  let result;
  if(id) result=await supabase.from("mangamorph_mangas").update(payload).eq("id",id).select().single();
  else result=await supabase.from("mangamorph_mangas").insert({...payload,created_by:session.user.id}).select().single();
  if(result.error)return message(el("mangaFormMessage"),result.error.message,true);
  const saved=result.data;
  try{
    const cover=await uploadCover(saved.id,el("mangaCoverInput").files[0]);
    if(cover){const updated=await supabase.from("mangamorph_mangas").update({cover_url:cover}).eq("id",saved.id).select().single();if(!updated.error)result.data=updated.data}
  }catch(error){return message(el("mangaFormMessage"),"Obra salva, mas a capa falhou: "+error.message,true)}
  await loadMangas();editManga(result.data);message(el("mangaFormMessage"),"Obra salva com sucesso.");
});

el("deleteMangaButton").addEventListener("click",async()=>{
  if(!selectedManga||!confirm("Excluir "+selectedManga.title+" e todos os capítulos?"))return;
  const {error}=await supabase.from("mangamorph_mangas").delete().eq("id",selectedManga.id);
  if(error)return message(el("mangaFormMessage"),error.message,true);
  resetMangaForm();await loadMangas();
});

function fillMangaSelect(){
  const select=el("chapterMangaSelect"),current=select.value;
  select.innerHTML='<option value="">Selecione uma obra</option>'+mangas.map(m=>'<option value="'+m.id+'">'+escapeHtml(m.title)+'</option>').join("");
  if(current&&mangas.some(m=>String(m.id)===current))select.value=current;
}
el("chapterMangaSelect").addEventListener("change",async()=>{selectedManga=mangas.find(m=>m.id===Number(el("chapterMangaSelect").value))||null;selectedChapter=null;await loadChapters()});

async function loadChapters(){
  if(!selectedManga){chapters=[];renderChapters();return}
  const {data}=await supabase.from("mangamorph_chapters").select("*").eq("manga_id",selectedManga.id).order("chapter_number",{ascending:false});
  chapters=data||[];renderChapters();
}
function renderChapters(){
  el("chapterAdminList").innerHTML=chapters.map(c=>'<div class="admin-list-row clickable" data-select-chapter="'+c.id+'"><div><strong>Capítulo '+fmtChapter(c.chapter_number)+'</strong><span>'+(c.title?escapeHtml(c.title)+" · ":"")+(c.published?"Publicado":"Rascunho")+'</span></div><div class="row-actions"><button data-toggle-chapter="'+c.id+'">'+(c.published?"Despublicar":"Publicar")+'</button><button data-delete-chapter="'+c.id+'">Excluir</button></div></div>').join("")||'<div class="empty-admin">Nenhum capítulo.</div>';
}
el("chapterForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!selectedManga)return message(el("chapterMessage"),"Selecione uma obra.",true);
  const {error}=await supabase.from("mangamorph_chapters").insert({manga_id:selectedManga.id,chapter_number:Number(el("chapterNumberInput").value),title:el("chapterTitleInput").value.trim()||null,published:el("chapterPublishedInput").checked,published_at:el("chapterPublishedInput").checked?new Date().toISOString():null,created_by:session.user.id,updated_by:session.user.id});
  if(error)return message(el("chapterMessage"),error.message,true);
  event.target.reset();await loadChapters();
});

document.addEventListener("click",async e=>{
  const select=e.target.closest("[data-select-chapter]"),toggle=e.target.closest("[data-toggle-chapter]"),remove=e.target.closest("[data-delete-chapter]");
  if(toggle){e.stopPropagation();const c=chapters.find(x=>x.id===Number(toggle.dataset.toggleChapter));if(!c)return;await supabase.from("mangamorph_chapters").update({published:!c.published,published_at:!c.published?(c.published_at||new Date().toISOString()):c.published_at,updated_by:session.user.id}).eq("id",c.id);await loadChapters();return}
  if(remove){e.stopPropagation();const c=chapters.find(x=>x.id===Number(remove.dataset.deleteChapter));if(!c||!confirm("Excluir capítulo "+fmtChapter(c.chapter_number)+"?"))return;await supabase.from("mangamorph_chapters").delete().eq("id",c.id);if(selectedChapter?.id===c.id){selectedChapter=null;renderPages([])}await loadChapters();return}
  if(select){selectedChapter=chapters.find(x=>x.id===Number(select.dataset.selectChapter));await loadPages()}
});

async function loadPages(){
  if(!selectedChapter)return renderPages([]);
  el("pagesPanelTitle").textContent="Capítulo "+fmtChapter(selectedChapter.chapter_number);
  const {data}=await supabase.from("mangamorph_chapter_pages").select("*").eq("chapter_id",selectedChapter.id).order("page_number");
  renderPages(data||[]);
}
function renderPages(pages){
  el("chapterPagesGrid").innerHTML=pages.map(p=>'<div class="admin-page-card"><img src="'+escapeHtml(p.image_url)+'" alt=""><span>'+p.page_number+'</span><button data-delete-page="'+p.id+'">×</button></div>').join("")||'<div class="empty-admin">Envie as páginas deste capítulo.</div>';
}
el("chapterPagesInput").addEventListener("change",async()=>{
  if(!selectedChapter||!selectedManga)return message(el("chapterMessage"),"Selecione um capítulo.",true);
  const files=Array.from(el("chapterPagesInput").files).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  if(!files.length)return;
  message(el("chapterMessage"),"Enviando "+files.length+" páginas...");
  const {data:existing}=await supabase.from("mangamorph_chapter_pages").select("page_number").eq("chapter_id",selectedChapter.id).order("page_number",{ascending:false}).limit(1);
  let page=(existing?.[0]?.page_number||0)+1;
  for(const file of files){
    const path="mangas/"+selectedManga.id+"/chapters/"+selectedChapter.id+"/"+String(page).padStart(4,"0")+"-"+safeFileName(file.name);
    const {error:uploadError}=await supabase.storage.from("mangamorph-content").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"31536000"});
    if(uploadError){message(el("chapterMessage"),uploadError.message,true);break}
    const url=supabase.storage.from("mangamorph-content").getPublicUrl(path).data.publicUrl;
    const {error:insertError}=await supabase.from("mangamorph_chapter_pages").insert({chapter_id:selectedChapter.id,page_number:page,image_url:url});
    if(insertError){message(el("chapterMessage"),insertError.message,true);break}
    page++;
  }
  el("chapterPagesInput").value="";await loadPages();message(el("chapterMessage"),"Páginas atualizadas.");
});
document.addEventListener("click",async e=>{const b=e.target.closest("[data-delete-page]");if(!b)return;await supabase.from("mangamorph_chapter_pages").delete().eq("id",Number(b.dataset.deletePage));await loadPages()});

async function loadReports(){
  const filter=el("reportFilter").value;
  let q=supabase.from("mangamorph_reports").select("*").order("created_at",{ascending:false}).limit(100);
  if(filter!=="all")q=q.eq("status",filter);
  const {data}=await q;renderReports(data||[]);
}
function renderReports(items){
  el("reportList").innerHTML=items.map(r=>'<div class="admin-list-row"><div><strong>'+escapeHtml(r.target_type)+' · '+escapeHtml(r.reason)+'</strong><span class="report-reason">'+escapeHtml(r.details||"Sem detalhes")+'</span><span>'+new Date(r.created_at).toLocaleString("pt-BR")+' · '+escapeHtml(r.status)+'</span></div><div class="row-actions">'+(r.status==="pending"?'<button data-report-status="'+r.id+'" data-status="actioned">Resolver</button><button data-report-status="'+r.id+'" data-status="dismissed">Descartar</button>':'')+'</div></div>').join("")||'<div class="empty-admin">Nenhuma denúncia.</div>';
}
el("reportFilter").addEventListener("change",loadReports);
document.addEventListener("click",async e=>{const b=e.target.closest("[data-report-status]");if(!b)return;await supabase.from("mangamorph_reports").update({status:b.dataset.status,reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",Number(b.dataset.reportStatus));await loadReports();await loadStats()});

function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}

resetMangaForm();
await bootstrap();