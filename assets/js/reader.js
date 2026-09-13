(()=>{
  "use strict";

  if(window.__MANGAMORPH_READER_CORE_V11__)return;
  window.__MANGAMORPH_READER_CORE_V11__=true;

  if("scrollRestoration" in history)history.scrollRestoration="manual";

  const params=new URLSearchParams(location.search);
  const mangaId=Number(params.get("id"));
  const chapterRaw=params.get("chapter");
  const chapter=chapterRaw===null||chapterRaw===""?1:Number(chapterRaw);

  if(!Number.isInteger(mangaId)||mangaId<1){
    location.replace("index.html");
    return;
  }
  if(!Number.isFinite(chapter)||chapter<0){
    location.replace(`manga.html?id=${mangaId}`);
    return;
  }

  const readerStage=document.querySelector("#readerStage");
  const chapterPicker=document.querySelector("#chapterPicker");
  const readerSettings=document.querySelector("#readerSettings");
  const readerThemeLabel=document.querySelector("#readerThemeLabel");
  const controlsSwitch=document.querySelector("#readerControlsSwitch");
  const progressText=document.querySelector("#readerProgressText");
  const progressPercent=document.querySelector("#readerProgressPercent");
  const progressBar=document.querySelector("#readerProgressBar");
  const toast=document.querySelector("#readerToast");

  let readerTopLocked=true;
  let pages=[];
  let progressFrame=0;
  let lastProgressPage=0;

  function forceReaderTop(){
    if(readerTopLocked)window.scrollTo({top:0,left:0,behavior:"auto"});
  }

  function unlockReaderScroll(){
    if(!readerTopLocked)return;
    readerTopLocked=false;
    document.documentElement.classList.add("reader-scroll-unlocked");
  }

  function injectLoadingStyle(){
    if(document.querySelector("#readerLiveLoadingStyle"))return;
    const style=document.createElement("style");
    style.id="readerLiveLoadingStyle";
    style.textContent=`
      .reader-live-loading{min-height:42vh;display:grid;place-items:center;align-content:center;gap:.7rem;color:#66758a;font-size:.72rem;font-weight:750}
      .reader-live-loading span{width:1.8rem;height:1.8rem;border:3px solid rgba(83,111,148,.16);border-top-color:#5b7ea9;border-radius:50%;animation:mmReaderSpin .7s linear infinite}
      .reader-stage{overflow-anchor:auto}
      .reader-real-page{content-visibility:auto;contain-intrinsic-size:auto 1400px;overflow-anchor:auto}
      .reader-real-page img{display:block;max-width:100%;height:auto}
      .reader-real-page:not(.is-loaded):not(.mm-reader-page-failed){background:rgba(105,124,148,.035)}
      @media(max-width:560px){.reader-real-page{contain-intrinsic-size:auto 1150px}}
      @media(prefers-reduced-motion:reduce){.reader-live-loading span{animation-duration:1.5s}}
      @keyframes mmReaderSpin{to{transform:rotate(360deg)}}
    `;
    document.head.append(style);
  }

  function showToast(message){
    if(!toast)return;
    toast.textContent=message;
    toast.hidden=false;
    clearTimeout(showToast.timer);
    showToast.timer=setTimeout(()=>{toast.hidden=true},1800);
  }

  function openSheet(sheet){
    if(!sheet)return;
    sheet.hidden=false;
    document.body.style.overflow="hidden";
  }

  function closeSheet(sheet){
    if(!sheet)return;
    sheet.hidden=true;
    document.body.style.overflow="";
  }

  function refreshPages(){
    if(!readerStage)return;
    pages=[...readerStage.querySelectorAll("[data-reader-page]")];
    if(pages.length)unlockReaderScroll();
    scheduleProgress();
  }

  function updateProgress(){
    progressFrame=0;
    if(!pages.length)return;

    const target=window.scrollY+window.innerHeight*.48;
    let low=0;
    let high=pages.length-1;
    let currentIndex=0;
    while(low<=high){
      const mid=(low+high)>>1;
      if(target>=pages[mid].offsetTop){
        currentIndex=mid;
        low=mid+1;
      }else{
        high=mid-1;
      }
    }

    const current=currentIndex+1;
    const percent=pages.length>1?Math.round((currentIndex/(pages.length-1))*100):100;
    if(progressText)progressText.textContent=`Página ${current} de ${pages.length}`;
    if(progressPercent)progressPercent.textContent=percent+"%";
    if(progressBar)progressBar.style.width=percent+"%";

    if(current===lastProgressPage)return;
    lastProgressPage=current;
    localStorage.setItem(`mangamorph:reader:${mangaId}:${chapter}`,String(current));
    window.dispatchEvent(new CustomEvent("mangamorph:progress",{detail:{mangaId,chapterNumber:chapter,pageNumber:current,percent}}));
  }

  function scheduleProgress(){
    if(progressFrame)return;
    progressFrame=requestAnimationFrame(updateProgress);
  }

  forceReaderTop();
  window.addEventListener("pageshow",forceReaderTop,{once:true});
  injectLoadingStyle();

  if(readerStage&&!readerStage.children.length){
    readerStage.innerHTML=`<div class="reader-live-loading" role="status" aria-live="polite"><span></span><strong>Carregando capítulo ${chapter}</strong></div>`;
  }

  if(readerStage){
    const observer=new MutationObserver(refreshPages);
    observer.observe(readerStage,{childList:true,subtree:true});
    refreshPages();
  }

  document.querySelector("#chapterPickerButton")?.addEventListener("click",()=>openSheet(chapterPicker));
  document.querySelector("#readerSettingsButton")?.addEventListener("click",()=>openSheet(readerSettings));
  document.querySelectorAll("[data-close-reader-sheet]").forEach(button=>button.addEventListener("click",()=>closeSheet(chapterPicker)));
  document.querySelectorAll("[data-close-reader-settings]").forEach(button=>button.addEventListener("click",()=>closeSheet(readerSettings)));

  const savedReaderTheme=localStorage.getItem("mangamorph:theme")||localStorage.getItem("mangamorph:reader-theme")||"light";
  document.body.classList.toggle("light-reader",savedReaderTheme==="light");
  if(readerThemeLabel)readerThemeLabel.textContent=savedReaderTheme==="light"?"Claro":"Escuro";

  document.querySelector("#readerThemeToggle")?.addEventListener("click",()=>{
    document.body.classList.toggle("light-reader");
    const light=document.body.classList.contains("light-reader");
    const value=light?"light":"dark";
    localStorage.setItem("mangamorph:theme",value);
    localStorage.setItem("mangamorph:reader-theme",value);
    if(readerThemeLabel)readerThemeLabel.textContent=light?"Claro":"Escuro";
  });

  let controlsVisible=localStorage.getItem("mangamorph:reader-controls")!=="hidden";
  function renderControls(){
    document.body.classList.toggle("controls-hidden",!controlsVisible);
    controlsSwitch?.classList.toggle("active",controlsVisible);
  }

  document.querySelector("#readerControlsToggle")?.addEventListener("click",()=>{
    controlsVisible=!controlsVisible;
    localStorage.setItem("mangamorph:reader-controls",controlsVisible?"visible":"hidden");
    renderControls();
  });
  renderControls();

  window.addEventListener("scroll",scheduleProgress,{passive:true});
  window.addEventListener("resize",scheduleProgress,{passive:true});
  window.addEventListener("storage",event=>{
    if(event.key!=="mangamorph:theme")return;
    const light=event.newValue==="light";
    document.body.classList.toggle("light-reader",light);
    if(readerThemeLabel)readerThemeLabel.textContent=light?"Claro":"Escuro";
  });

  if(progressText)progressText.textContent=`Preparando capítulo ${chapter}`;
  if(progressPercent)progressPercent.textContent="…";
  if(progressBar)progressBar.style.width="0%";

  window.__mangamorphReaderToast=showToast;
})();