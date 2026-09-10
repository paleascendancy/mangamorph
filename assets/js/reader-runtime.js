import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const p=new URLSearchParams(location.search);
const mangaId=Number(p.get("id"))||1;
const captured=window.__mangamorphRequestedChapter;
const rawChapter=captured!==undefined&&captured!==null?captured:p.get("chapter");
const parsedChapter=Number(rawChapter);
const chapterNumber=Number.isFinite(parsedChapter)&&parsedChapter>=0?parsedChapter:1;

const [{data:manga},{data:chapters}]=await Promise.all([
  db.from("mangamorph_mangas").select("id,title,accent,cover_url").eq("id",mangaId).maybeSingle(),
  db.from("mangamorph_chapters")
    .select("id,chapter_number,title,published_at,source_name,source_credit,source_url")
    .eq("manga_id",mangaId)
    .eq("published",true)
    .order("chapter_number",{ascending:false})
]);

function fmtDate(value){
  if(!value)return "Sem data";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Sem data";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
    .format(date)
    .replace(".","");
}

function safeText(value){
  return String(value??"").replace(/[<>]/g,"");
}

function injectReaderV3Styles(){
  if(document.querySelector("#readerV3Styles"))return;
  const style=document.createElement("style");
  style.id="readerV3Styles";
  style.textContent=`
    .reader-title-link{display:block;width:max-content;max-width:100%;color:inherit;text-decoration:none;border-radius:.3rem;transition:opacity .16s ease,color .16s ease}
    .reader-title-link:hover{color:#83aee8}.reader-title-link:active{opacity:.7}
    .reader-context-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.8rem;align-items:center;margin:.65rem clamp(.7rem,3vw,1.1rem);padding:.78rem;border:1px solid rgba(255,255,255,.065);border-radius:1rem;background:linear-gradient(145deg,#101923,#0a1018);box-shadow:0 12px 30px rgba(0,0,0,.16);overflow:hidden}
    .reader-context-card:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(180deg,#7ba9e8,#4e79ba)}
    .reader-context-number{width:3.2rem;height:3.2rem;display:grid;place-items:center;align-content:center;border:1px solid rgba(118,164,226,.14);border-radius:.82rem;background:linear-gradient(145deg,rgba(107,151,213,.16),rgba(79,108,151,.07));color:#dfe9f7}
    .reader-context-number span{font-size:.38rem;font-weight:850;letter-spacing:.14em;color:#7891b3}.reader-context-number strong{margin-top:.04rem;font-size:1.2rem;line-height:1;letter-spacing:-.04em}
    .reader-context-main{min-width:0}.reader-context-main>span{display:block;color:#7188a8;font-size:.42rem;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.reader-context-main>strong{display:block;margin-top:.08rem;font-size:.96rem;letter-spacing:-.025em}.reader-context-main>small{display:block;margin-top:.12rem;max-width:34rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7d8999;font-size:.51rem}
    .reader-context-stats{display:grid;grid-template-columns:repeat(2,minmax(5.2rem,auto));gap:.34rem;margin:0}.reader-context-stats>div{padding:.42rem .5rem;border:1px solid rgba(255,255,255,.05);border-radius:.68rem;background:rgba(255,255,255,.025)}.reader-context-stats dt{color:#68788e;font-size:.38rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.reader-context-stats dd{margin:.1rem 0 0;color:#e0e7f0;font-size:.52rem;font-weight:760;white-space:nowrap}
    .reader-main{padding-top:0!important}.reader-progress-shell{padding-top:.32rem!important}.reader-stage{padding-top:0!important;gap:0!important}.reader-real-page{width:100%;margin:0 auto}.reader-real-page img{display:block;width:100%;height:auto;margin:0 auto}
    .reader-width-comfortable .reader-stage{max-width:760px;margin-inline:auto;padding-inline:clamp(.35rem,2vw,1rem)!important}.reader-gap-soft .reader-stage{gap:.72rem!important}.reader-gap-soft .reader-real-page{overflow:hidden;border-radius:.28rem}
    .reader-settings-context{margin:0 0 .55rem;padding:.68rem .72rem;border:1px solid rgba(255,255,255,.055);border-radius:.8rem;background:#101821}.reader-settings-context>span{display:block;color:#6682a8;font-size:.44rem;font-weight:850;letter-spacing:.13em}.reader-settings-context>strong{display:block;margin-top:.12rem;font-size:.92rem}.reader-settings-context>small{display:block;margin-top:.08rem;color:#76859a;font-size:.52rem}
    .reader-setting-row.reader-setting-button{border:1px solid rgba(255,255,255,.055)}.reader-setting-chevron{color:#7588a2!important;font-size:.75rem!important}
    .reader-bottom-bar{grid-template-columns:2.5rem minmax(8rem,11rem) 2.5rem 2.5rem!important}
    .reader-scroll-top{font-size:1rem!important;font-weight:850;opacity:.48;transform:translateY(2px);transition:opacity .18s ease,transform .18s ease,background .18s ease}.reader-scroll-top.is-visible{opacity:1;transform:none;background:#1b2a3d!important;color:#eaf2ff!important}
    .light-reader .reader-title-link:hover{color:#2c5f99}.light-reader .reader-context-card{border-color:rgba(17,31,49,.07);background:linear-gradient(145deg,#ffffff,#f2f5f8);box-shadow:0 10px 28px rgba(32,48,68,.08)}.light-reader .reader-context-number{border-color:rgba(64,103,153,.12);background:linear-gradient(145deg,#edf4fd,#f7faff);color:#172233}.light-reader .reader-context-number span{color:#6580a3}.light-reader .reader-context-stats>div,.light-reader .reader-settings-context{border-color:rgba(0,0,0,.06);background:#f8fafc}.light-reader .reader-context-stats dd,.light-reader .reader-settings-context>strong{color:#1b2027}.light-reader .reader-context-main>small,.light-reader .reader-settings-context>small{color:#77808d}.light-reader .reader-scroll-top.is-visible{background:#e8f0fb!important;color:#234d7c!important}
    @media(max-width:700px){.reader-context-card{grid-template-columns:auto minmax(0,1fr);gap:.58rem;padding:.62rem .66rem}.reader-context-stats{grid-column:1/-1;grid-template-columns:1fr 1fr;width:100%}.reader-context-stats>div{padding:.38rem .45rem}.reader-context-number{width:2.8rem;height:2.8rem}.reader-context-main>strong{font-size:.86rem}}
    @media(max-width:560px){.reader-bottom-bar{grid-template-columns:2.3rem minmax(7.2rem,9rem) 2.3rem 2.3rem!important;gap:.3rem!important}.reader-bottom-bar>button:not(.reader-chapter-pill){width:2.3rem!important;height:2.3rem!important}}
  `;
  document.head.append(style);
}

function setupReaderSettings(current){
  const panel=document.querySelector(".reader-settings-panel");
  if(!panel)return;

  let context=panel.querySelector(".reader-settings-context");
  if(!context){
    context=document.createElement("div");
    context.className="reader-settings-context";
    const head=panel.querySelector(".reader-sheet-head");
    head?.insertAdjacentElement("afterend",context);
  }
  context.innerHTML='<span>CAPÍTULO ATUAL</span><strong>Capítulo '+chapterNumber+'</strong><small>'+
    (current?fmtDate(current.published_at):"Informações ainda não disponíveis")+'</small>';

  const rows=[...panel.querySelectorAll(".reader-setting-row")];
  if(rows[0]&&!rows[0].id){
    rows[0].innerHTML='<div><strong>Número do capítulo</strong><span>'+(current?.title||"Capítulo atual")+'</span></div><span class="reader-setting-value">Cap. '+chapterNumber+'</span>';
  }

  if(!document.querySelector("#readerWidthToggle")){
    const width=document.createElement("button");
    width.type="button";
    width.className="reader-setting-row reader-setting-button";
    width.id="readerWidthToggle";
    width.innerHTML='<div><strong>Largura das páginas</strong><span>Tela cheia ou leitura confortável</span></div><span class="reader-setting-value" id="readerWidthLabel">Tela cheia</span>';
    panel.append(width);

    const gap=document.createElement("button");
    gap.type="button";
    gap.className="reader-setting-row reader-setting-button";
    gap.id="readerGapToggle";
    gap.innerHTML='<div><strong>Espaçamento</strong><span>Separação entre as páginas</span></div><span class="reader-setting-value" id="readerGapLabel">Contínuo</span>';
    panel.append(gap);

    const chaptersButton=document.createElement("button");
    chaptersButton.type="button";
    chaptersButton.className="reader-setting-row reader-setting-button";
    chaptersButton.id="readerSettingsChapters";
    chaptersButton.innerHTML='<div><strong>Trocar capítulo</strong><span>Ir diretamente para outro capítulo</span></div><span class="reader-setting-chevron">›</span>';
    panel.append(chaptersButton);
  }

  let widthMode=localStorage.getItem("mangamorph:reader-width")||"full";
  let gapMode=localStorage.getItem("mangamorph:reader-gap")||"flush";
  const renderPrefs=()=>{
    document.body.classList.toggle("reader-width-comfortable",widthMode==="comfortable");
    document.body.classList.toggle("reader-gap-soft",gapMode==="soft");
    const widthLabel=document.querySelector("#readerWidthLabel");
    const gapLabel=document.querySelector("#readerGapLabel");
    if(widthLabel)widthLabel.textContent=widthMode==="comfortable"?"Confortável":"Tela cheia";
    if(gapLabel)gapLabel.textContent=gapMode==="soft"?"Separado":"Contínuo";
  };
  renderPrefs();

  document.querySelector("#readerWidthToggle")?.addEventListener("click",()=>{
    widthMode=widthMode==="comfortable"?"full":"comfortable";
    localStorage.setItem("mangamorph:reader-width",widthMode);
    renderPrefs();
  });
  document.querySelector("#readerGapToggle")?.addEventListener("click",()=>{
    gapMode=gapMode==="soft"?"flush":"soft";
    localStorage.setItem("mangamorph:reader-gap",gapMode);
    renderPrefs();
  });
  document.querySelector("#readerSettingsChapters")?.addEventListener("click",()=>{
    document.querySelector("[data-close-reader-settings]")?.click();
    setTimeout(()=>document.querySelector("#chapterPickerButton")?.click(),80);
  });
}

function renderChapterContext(current,pageCount=null){
  let card=document.querySelector("#readerChapterContext");
  if(!card){
    card=document.createElement("section");
    card.id="readerChapterContext";
    card.className="reader-context-card";
    const progress=document.querySelector(".reader-progress-shell");
    progress?.insertAdjacentElement("beforebegin",card);
  }
  const title=safeText(current?.title||"Leitura do capítulo");
  card.innerHTML='<div class="reader-context-number"><span>CAP</span><strong>'+chapterNumber+'</strong></div>'+
    '<div class="reader-context-main"><span>AGORA LENDO</span><strong>Capítulo '+chapterNumber+'</strong><small>'+title+'</small></div>'+
    '<dl class="reader-context-stats">'+
      '<div><dt>Lançamento</dt><dd>'+fmtDate(current?.published_at)+'</dd></div>'+
      '<div><dt>Páginas</dt><dd>'+(pageCount===null?"Carregando…":pageCount)+'</dd></div>'+
    '</dl>';
}

function setupScrollTop(){
  const button=document.querySelector("#readerScrollTop");
  if(!button)return;
  const render=()=>button.classList.toggle("is-visible",window.scrollY>320);
  button.addEventListener("click",event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    window.scrollTo({top:0,behavior:"smooth"});
  },true);
  window.addEventListener("scroll",render,{passive:true});
  render();
}

injectReaderV3Styles();
setupScrollTop();

if(manga){
  const current=(chapters||[]).find(c=>Number(c.chapter_number)===chapterNumber);
  p.set("id",String(mangaId));
  p.set("chapter",String(chapterNumber));
  history.replaceState(null,"","reader.html?"+p.toString());
  window.__mangamorphReaderChapter=chapterNumber;

  document.title="MangaMorph — "+manga.title+" · Capítulo "+chapterNumber;
  document.querySelector("#readerTitle").textContent=manga.title;
  document.querySelector("#readerChapterLabel").textContent="Capítulo "+chapterNumber;
  const titleLink=document.querySelector("#readerTitleLink");
  if(titleLink){
    titleLink.href="manga.html?id="+mangaId;
    titleLink.setAttribute("aria-label","Abrir "+manga.title);
  }
  renderChapterContext(current,null);
  setupReaderSettings(current);

  document.querySelector("#bottomChapterLabel").textContent=chapterNumber;
  document.querySelector("#finishChapterLabel").textContent="Capítulo "+chapterNumber+" concluído";
  document.querySelector("#readerBack").href="manga.html?id="+mangaId;

  const stage=document.querySelector("#readerStage");
  const progressText=document.querySelector("#readerProgressText");
  const progressPercent=document.querySelector("#readerProgressPercent");
  const progressBar=document.querySelector("#readerProgressBar");
  let hasPages=false;
  let sourceFailureShown=false;

  function hideReaderExtras(){
    document.querySelector("#readerFinish")?.setAttribute("hidden","");
    document.querySelector("#chapterCommunity")?.setAttribute("hidden","");
    document.querySelector(".reader-bottom-bar")?.setAttribute("hidden","");
  }

  function renderUnavailable(titleText,bodyText){
    if(sourceFailureShown)return;
    sourceFailureShown=true;
    stage.replaceChildren();
    const box=document.createElement("section");
    box.className="reader-empty-state reader-source-unavailable";
    const kicker=document.createElement("span");
    kicker.textContent="LEITURA";
    const title=document.createElement("strong");
    title.textContent=titleText;
    const body=document.createElement("p");
    body.textContent=bodyText;
    box.append(kicker,title,body);
    if(current?.source_url&&/^https:\/\//i.test(current.source_url)){
      const sourceLink=document.createElement("a");
      sourceLink.href=current.source_url;
      sourceLink.target="_blank";
      sourceLink.rel="noopener noreferrer";
      sourceLink.textContent="Verificar na fonte";
      box.append(sourceLink);
    }
    const back=document.createElement("a");
    back.href="manga.html?id="+mangaId;
    back.textContent="Voltar para a obra";
    box.append(back);
    stage.append(box);
    renderChapterContext(current,0);
    if(progressText)progressText.textContent="Fonte indisponível";
    if(progressPercent)progressPercent.textContent="—";
    if(progressBar)progressBar.style.width="0%";
    hideReaderExtras();
  }

  if(current){
    const {data:pages}=await db.from("mangamorph_chapter_pages")
      .select("id,page_number,image_url,width,height")
      .eq("chapter_id",current.id)
      .order("page_number");

    renderChapterContext(current,pages?.length||0);

    if(pages?.length){
      hasPages=true;
      stage.innerHTML=pages.map(pg=>'<figure class="reader-real-page" data-reader-page="'+pg.page_number+'"><img src="'+pg.image_url+'" alt="Página '+pg.page_number+' do capítulo '+chapterNumber+'" loading="'+(pg.page_number<=2?"eager":"lazy")+'" decoding="async"></figure>').join("");
      if(progressText)progressText.textContent="Página 1 de "+pages.length;

      let loaded=0,failed=0,initialFailures=0;
      const images=[...stage.querySelectorAll(".reader-real-page img")];
      images.forEach((img,index)=>{
        img.addEventListener("load",()=>{loaded++},{once:true});
        img.addEventListener("error",()=>{
          failed++;
          if(index<2)initialFailures++;
          const figure=img.closest(".reader-real-page");
          if(figure&&!sourceFailureShown){
            figure.classList.add("reader-real-page-failed");
            figure.replaceChildren();
            const note=document.createElement("div");
            note.className="reader-page-unavailable";
            note.innerHTML="<span>PÁGINA "+String(index+1).padStart(2,"0")+"</span><strong>Imagem indisponível</strong><small>A fonte não entregou esta página.</small>";
            figure.append(note);
          }
          if(loaded===0&&initialFailures>=Math.min(2,images.length)){
            renderUnavailable(
              "Capítulo temporariamente indisponível",
              "As imagens deste capítulo não estão carregando na fonte parceira. O MangaMorph tentará novamente automaticamente quando a fonte voltar."
            );
          }else if(failed===images.length&&loaded===0){
            renderUnavailable(
              "Capítulo temporariamente indisponível",
              "Nenhuma página pôde ser carregada agora. O MangaMorph tentará novamente automaticamente."
            );
          }
        },{once:true});
      });
      requestAnimationFrame(()=>window.dispatchEvent(new Event("scroll")));
    }
  }

  if(!hasPages){
    const hasAnyChapter=Array.isArray(chapters)&&chapters.length>0;
    const titleText=hasAnyChapter?"Páginas ainda não disponíveis":"Nenhum capítulo publicado";
    const bodyText=hasAnyChapter
      ?"Este capítulo existe, mas ainda não recebeu páginas para leitura."
      :"Esta obra foi adicionada ao catálogo, mas ainda não possui capítulos publicados.";
    renderUnavailable(titleText,bodyText);
  }

  const grid=document.querySelector("#readerChapterGrid");
  if(chapters?.length){
    grid.innerHTML=chapters.slice(0,80).map(c=>'<button type="button" data-live-chapter="'+Number(c.chapter_number)+'" class="'+(Number(c.chapter_number)===chapterNumber?"active":"")+'">Cap. '+Number(c.chapter_number)+'</button>').join("");
    grid.addEventListener("click",e=>{
      const b=e.target.closest("[data-live-chapter]");
      if(!b)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      location.href="reader.html?id="+mangaId+"&chapter="+b.dataset.liveChapter;
    },true);

    const ordered=chapters.map(c=>Number(c.chapter_number)).sort((a,b)=>a-b);
    const index=ordered.indexOf(chapterNumber);
    const previous=index>0?ordered[index-1]:null;
    const next=index>=0&&index<ordered.length-1?ordered[index+1]:null;
    [["#previousChapter",previous],["#finishPrevious",previous],["#nextChapter",next],["#finishNext",next]].forEach(([selector,target])=>{
      const button=document.querySelector(selector);
      if(!button)return;
      const hasTarget=target!==null&&target!==undefined;
      button.disabled=!hasTarget;
      button.addEventListener("click",e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        if(hasTarget)location.href="reader.html?id="+mangaId+"&chapter="+target;
      },true);
    });
  }
}