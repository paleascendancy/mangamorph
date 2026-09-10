const boot=document.createElement("div");
boot.id="mangamorphMangaBoot";
boot.setAttribute("aria-hidden","true");
boot.style.cssText="position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#eef1f5;color:#171b22;transition:opacity .18s ease;pointer-events:none";
boot.innerHTML='<div style="display:grid;gap:12px;place-items:center;font:700 13px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase"><span style="font-size:18px;letter-spacing:-.03em;text-transform:none">MangaMorph</span><span style="width:34px;height:34px;border:3px solid rgba(20,27,37,.12);border-top-color:#587dad;border-radius:50%;animation:mmMangaBootSpin .7s linear infinite"></span></div>';
const bootStyle=document.createElement("style");
bootStyle.textContent='@keyframes mmMangaBootSpin{to{transform:rotate(360deg)}}';
document.head.append(bootStyle);
document.body.append(boot);

const cleanCoverStyle=document.createElement("style");
cleanCoverStyle.id="mangamorphCleanMangaCovers";
cleanCoverStyle.textContent=`
  .detail-cover-kicker,.compact-cover>strong,.compact-cover>small,.related-cover-title{display:none!important}
  .compact-cover::after{content:none!important;display:none!important}
  .compact-cover[style*="background-image"]{background-size:auto 178%!important;background-position:center top!important;background-repeat:no-repeat!important}
`;
document.head.append(cleanCoverStyle);

function finishBoot(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    boot.style.opacity="0";
    setTimeout(()=>{boot.remove();bootStyle.remove()},190);
  }));
}

const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const id=Number(new URLSearchParams(location.search).get("id"))||1;
const $=s=>document.querySelector(s);
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;")}
function flag(country,type){if(country==="Japão"||type==="Mangá")return"🇯🇵";if(country==="Coreia"||type==="Manhwa")return"🇰🇷";if(country==="China"||type==="Manhua")return"🇨🇳";return"🌐"}
function fmtDate(v){return v?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v)).replace(".",""):"—"}
function meta(name,content,property=false){let node=document.head.querySelector(property?'meta[property="'+name+'"]':'meta[name="'+name+'"]');if(!node){node=document.createElement("meta");node.setAttribute(property?"property":"name",name);document.head.appendChild(node)}node.content=content}
function compactNumber(value){return new Intl.NumberFormat("pt-BR",{notation:"compact"}).format(Number(value)||0)}

try{
  const [{data:manga,error:mangaError},{data:chapters,error:chaptersError},{data:catalog,error:catalogError}]=await Promise.all([
    db.from("mangamorph_mangas").select("*").eq("id",id).maybeSingle(),
    db.from("mangamorph_chapters").select("id,chapter_number,title,published_at").eq("manga_id",id).eq("published",true).order("chapter_number",{ascending:false}),
    db.rpc("get_mangamorph_catalog")
  ]);

  if(mangaError)throw mangaError;
  if(chaptersError)throw chaptersError;
  if(catalogError)throw catalogError;

  if(manga){
    const stats=(catalog||[]).find(x=>Number(x.id)===id)||{};
    const latest=chapters?.[0]?Number(chapters[0].chapter_number):Number(stats.latest_chapter)||0;
    const tags=[...(manga.genres||[]),...(manga.tags||[])];
    const altTitles=(manga.alternative_titles||[]).filter(Boolean);
    const localChapterCount=chapters?.length||0;
    const sourceChapterCount=Number(manga.source_chapter_count)||0;
    const communityRating=Number(stats.average_rating)||0;
    const displayedRating=communityRating||Number(manga.source_score)||0;
    const communityReads=Number(stats.reader_count)||0;
    const communityFavorites=Number(stats.favorite_count)||0;
    const sourceFavorites=Number(manga.source_favorites)||Number(manga.source_votes)||0;
    document.title="MangaMorph — "+manga.title;
    meta("description",manga.synopsis||("Leia "+manga.title+" no MangaMorph."));
    meta("og:title",manga.title,true);meta("og:description",manga.synopsis||"",true);
    if(manga.cover_url)meta("og:image",manga.cover_url,true);
    $("#mangaTitle").textContent=manga.title;
    $("#mangaAltTitle").textContent=altTitles.join(" · ")||tags.join(" · ")||manga.type;
    $("#coverTitle").textContent=manga.title.toUpperCase();
    $("#coverType").textContent=(manga.type||"OBRA").toUpperCase();
    $("#detailCover").style.setProperty("--detail-accent",manga.accent||"#3a4162");
    if(manga.cover_url){$("#detailCover").style.backgroundImage='url("'+manga.cover_url+'")';$("#detailCover").style.backgroundSize="auto 178%";$("#detailCover").style.backgroundPosition="center top";$("#detailCover").style.backgroundRepeat="no-repeat"}
    const country=manga.country||"";$("#mangaOriginBadge").textContent=flag(country,manga.type)+" "+manga.type+(country?" · "+country:"");
    $("#mangaTypeFact").textContent=manga.type+(country?" · "+country:"");
    $("#mangaDescription").textContent=manga.synopsis||"Sem sinopse cadastrada.";
    $("#mangaTags").innerHTML=tags.map(t=>"<span>"+esc(t)+"</span>").join("");
    $("#latestChapter").textContent=latest||"—";$("#readLatestLabel").textContent=latest?"Ler capítulo "+latest:"Sem capítulos";
    $("#tabChapterCount").textContent=localChapterCount;
    $("#chapterCount").textContent=localChapterCount+" capítulos publicados"+(sourceChapterCount>localChapterCount?" · "+sourceChapterCount+" na fonte":"");
    $("#mangaRating").textContent="★ "+displayedRating.toFixed(1).replace(".",",");
    $("#mangaReads").textContent="◉ "+(communityReads?compactNumber(communityReads):(manga.source_views||"0"));
    $("#mangaFavorites").textContent="☆ "+(communityFavorites?compactNumber(communityFavorites):(sourceFavorites?compactNumber(sourceFavorites):"0"));
    const statusFact=$("#mangaStatusFact");if(statusFact)statusFact.textContent=manga.publication_status||"Em lançamento";
    const yearFact=$("#mangaYearFact");if(yearFact)yearFact.textContent=manga.year||"—";
    const authorFact=$("#mangaAuthorFact");if(authorFact)authorFact.textContent=manga.author||"—";
    const artistFact=$("#mangaArtistFact");if(artistFact)artistFact.textContent=manga.artist||"—";

    if(chapters?.length){
      $("#chapterList").innerHTML=chapters.map((c,index)=>'<article class="chapter-row '+(index===0?'latest':'')+'" id="capitulo-'+Number(c.chapter_number)+'"><div class="chapter-copy"><div class="chapter-number"><strong>Capítulo '+Number(c.chapter_number)+'</strong><span class="chapter-meta-line"><span>◷ '+fmtDate(c.published_at)+'</span>'+(c.title?'<span>'+esc(c.title)+'</span>':'')+'</span></div>'+(index===0?'<span class="chapter-badge">NOVO</span>':'')+'</div><button class="chapter-read" type="button" data-read-chapter="'+Number(c.chapter_number)+'">Ler <span>›</span></button></article>').join("");
      $("#readLatest").dataset.liveChapter=String(latest);
    }else{
      $("#chapterList").innerHTML='<div class="chapter-empty">Nenhum capítulo publicado ainda.</div>';
    }

    const related=(catalog||[]).filter(x=>Number(x.id)!==id).slice(0,8);
    $("#relatedCount").textContent=related.length+" recomendações";
    $("#relatedGrid").innerHTML=related.map((r,index)=>'<article class="related-card related-card-premium" data-related="'+r.id+'" tabindex="0" role="link"><div class="related-cover" style="--accent:'+(r.accent||"#3a4162")+';'+(r.cover_url?'background-image:linear-gradient(180deg,transparent,rgba(4,7,12,.8)),url('+r.cover_url+');background-size:cover;background-position:center;':'')+'"><span class="related-rank">#'+String(index+1).padStart(2,"0")+'</span><span class="related-open">↗</span><strong class="related-cover-title">'+esc(r.title)+'</strong></div><div class="related-info"><strong>'+esc(r.title)+'</strong><span>'+flag(r.country,r.type)+' '+esc(r.type)+' · '+esc((r.genres||[])[0]||"Outros")+'</span><small><span>Cap. '+(Number(r.latest_chapter)||"—")+'</span><span>★ '+(Number(r.average_rating)||0).toFixed(1).replace(".",",")+'</span></small></div></article>').join("");

    finishBoot();

    let targetChapter=latest;
    const {data:{session}}=await db.auth.getSession();
    if(session?.user){
      const {data:progress}=await db.from("mangamorph_reading_progress").select("chapter_number,page_number,progress_percent").eq("user_id",session.user.id).eq("manga_id",id).maybeSingle();
      if(progress?.chapter_number!==null&&progress?.chapter_number!==undefined){
        targetChapter=Number(progress.chapter_number);
        $("#readLatestLabel").textContent="Continuar capítulo "+targetChapter;
      }
    }
    const read=$("#readLatest");
    if(targetChapter!==null&&targetChapter!==undefined&&Number.isFinite(Number(targetChapter))){
      read.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();location.href="reader.html?id="+id+"&chapter="+targetChapter},true);
    }

    window.dispatchEvent(new CustomEvent("mangamorph:history-open",{detail:{mangaId:id}}));
  }else{
    $("#mangaTitle").textContent="Obra não encontrada";
    $("#mangaAltTitle").textContent="Este título não está disponível no catálogo.";
    $("#mangaDescription").textContent="Volte ao catálogo e escolha outra obra.";
    $("#chapterList").innerHTML="";
    finishBoot();
  }
}catch(error){
  console.error("MangaMorph manga runtime:",error);
  const title=$("#mangaTitle");
  if(title)title.textContent="Não foi possível carregar a obra";
  const alt=$("#mangaAltTitle");
  if(alt)alt.textContent="Tente atualizar a página.";
  finishBoot();
}