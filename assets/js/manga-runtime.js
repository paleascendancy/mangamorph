import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const id=Number(new URLSearchParams(location.search).get("id"))||1;
const $=s=>document.querySelector(s);
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function flag(country,type){if(country==="Japão"||type==="Mangá")return"🇯🇵";if(country==="Coreia"||type==="Manhwa")return"🇰🇷";if(country==="China"||type==="Manhua")return"🇨🇳";return"🌐"}
function fmtDate(v){return v?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v)).replace(".",""):"—"}
function meta(name,content,property=false){let node=document.head.querySelector(property?'meta[property="'+name+'"]':'meta[name="'+name+'"]');if(!node){node=document.createElement("meta");node.setAttribute(property?"property":"name",name);document.head.appendChild(node)}node.content=content}
const [{data:manga},{data:chapters},{data:catalog}]=await Promise.all([
  db.from("mangamorph_mangas").select("*").eq("id",id).maybeSingle(),
  db.from("mangamorph_chapters").select("id,chapter_number,title,published_at").eq("manga_id",id).eq("published",true).order("chapter_number",{ascending:false}),
  db.rpc("get_mangamorph_catalog")
]);
if(manga){
  const stats=(catalog||[]).find(x=>Number(x.id)===id)||{};
  const latest=chapters?.[0]?Number(chapters[0].chapter_number):Number(stats.latest_chapter)||0;
  const tags=[...(manga.genres||[]),...(manga.tags||[])];
  document.title="MangaMorph — "+manga.title;
  meta("description",manga.synopsis||("Leia "+manga.title+" no MangaMorph."));
  meta("og:title",manga.title,true);meta("og:description",manga.synopsis||"",true);
  if(manga.cover_url)meta("og:image",manga.cover_url,true);
  $("#mangaTitle").textContent=manga.title;
  $("#mangaAltTitle").textContent=tags.join(" · ")||manga.type;
  $("#coverTitle").textContent=manga.title.toUpperCase();
  $("#coverType").textContent=(manga.type||"OBRA").toUpperCase();
  $("#detailCover").style.setProperty("--detail-accent",manga.accent||"#3a4162");
  if(manga.cover_url){$("#detailCover").style.backgroundImage='linear-gradient(180deg,transparent 45%,rgba(4,7,12,.72)),url("'+manga.cover_url+'")';$("#detailCover").style.backgroundSize="cover";$("#detailCover").style.backgroundPosition="center"}
  const country=manga.country||"";$("#mangaOriginBadge").textContent=flag(country,manga.type)+" "+manga.type+(country?" · "+country:"");
  $("#mangaTypeFact").textContent=manga.type+(country?" · "+country:"");
  $("#mangaDescription").textContent=manga.synopsis||"Sem sinopse cadastrada.";
  $("#mangaTags").innerHTML=tags.map(t=>"<span>"+esc(t)+"</span>").join("");
  $("#latestChapter").textContent=latest||"—";$("#readLatestLabel").textContent=latest?"Ler capítulo "+latest:"Sem capítulos";
  $("#tabChapterCount").textContent=chapters?.length||0;$("#chapterCount").textContent=(chapters?.length||0)+" capítulos publicados";
  $("#mangaRating").textContent="★ "+(Number(stats.average_rating)||0).toFixed(1).replace(".",",");
  $("#mangaReads").textContent="◉ "+new Intl.NumberFormat("pt-BR",{notation:"compact"}).format(Number(stats.reader_count)||0);
  $("#mangaFavorites").textContent="☆ "+new Intl.NumberFormat("pt-BR",{notation:"compact"}).format(Number(stats.favorite_count)||0);
  const statusFact=$("#mangaStatusFact");if(statusFact)statusFact.textContent=manga.publication_status||"Em lançamento";
  const yearFact=$("#mangaYearFact");if(yearFact)yearFact.textContent=manga.year||"—";
  const authorFact=$("#mangaAuthorFact");if(authorFact)authorFact.textContent=manga.author||"—";
  const artistFact=$("#mangaArtistFact");if(artistFact)artistFact.textContent=manga.artist||"—";

  if(chapters?.length){
    $("#chapterList").innerHTML=chapters.map((c,index)=>'<article class="chapter-row '+(index===0?'latest':'')+'" id="capitulo-'+Number(c.chapter_number)+'"><div class="chapter-copy"><div class="chapter-number"><strong>Capítulo '+Number(c.chapter_number)+'</strong><span class="chapter-meta-line"><span>◷ '+fmtDate(c.published_at)+'</span>'+(c.title?'<span>'+esc(c.title)+'</span>':'')+'</span></div>'+(index===0?'<span class="chapter-badge">NOVO</span>':'')+'</div><button class="chapter-read" type="button" data-read-chapter="'+Number(c.chapter_number)+'">Ler <span>›</span></button></article>').join("");
    const read=$("#readLatest");read.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();location.href="reader.html?id="+id+"&chapter="+latest},true);
  }

  const {data:{session}}=await db.auth.getSession();
  if(session?.user){
    const {data:progress}=await db.from("mangamorph_reading_progress").select("chapter_number,page_number,progress_percent").eq("user_id",session.user.id).eq("manga_id",id).maybeSingle();
    if(progress?.chapter_number){
      const read=$("#readLatest");
      const targetChapter=Number(progress.chapter_number);
      $("#readLatestLabel").textContent="Continuar capítulo "+targetChapter;
      read.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();location.href="reader.html?id="+id+"&chapter="+targetChapter},true);
    }
  }

  const related=(catalog||[]).filter(x=>Number(x.id)!==id).slice(0,8);
  $("#relatedCount").textContent=related.length+" recomendações";
  $("#relatedGrid").innerHTML=related.map((r,index)=>'<article class="related-card related-card-premium" data-related="'+r.id+'" tabindex="0" role="link"><div class="related-cover" style="--accent:'+(r.accent||"#3a4162")+';'+(r.cover_url?'background-image:linear-gradient(180deg,transparent,rgba(4,7,12,.8)),url('+r.cover_url+');background-size:cover;background-position:center;':'')+'"><span class="related-rank">#'+String(index+1).padStart(2,"0")+'</span><span class="related-open">↗</span><strong class="related-cover-title">'+esc(r.title)+'</strong></div><div class="related-info"><strong>'+esc(r.title)+'</strong><span>'+flag(r.country,r.type)+' '+esc(r.type)+' · '+esc((r.genres||[])[0]||"Outros")+'</span><small><span>Cap. '+(Number(r.latest_chapter)||"—")+'</span><span>★ '+(Number(r.average_rating)||0).toFixed(1).replace(".",",")+'</span></small></div></article>').join("");
  window.dispatchEvent(new CustomEvent("mangamorph:history-open",{detail:{mangaId:id}}));
}