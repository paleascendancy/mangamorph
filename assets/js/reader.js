if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function forceReaderTop(){
  window.scrollTo({top:0,left:0,behavior:"auto"});
}
forceReaderTop();
window.addEventListener("pageshow",forceReaderTop);

const params=new URLSearchParams(location.search);
const requestedChapter=Number(params.get("chapter"));
const chapter=Number.isFinite(requestedChapter)&&requestedChapter>=0?requestedChapter:1;
const mangaId=Number(params.get("id"))||1;

const readerStage=document.querySelector("#readerStage");
const chapterPicker=document.querySelector("#chapterPicker");
const readerSettings=document.querySelector("#readerSettings");
const readerThemeLabel=document.querySelector("#readerThemeLabel");
const controlsSwitch=document.querySelector("#readerControlsSwitch");
const progressText=document.querySelector("#readerProgressText");
const progressPercent=document.querySelector("#readerProgressPercent");
const progressBar=document.querySelector("#readerProgressBar");
const toast=document.querySelector("#readerToast");

// Never render the old demo reader. Show a tiny loading state until live data arrives.
if(readerStage && !readerStage.children.length){
  readerStage.innerHTML='<div class="reader-live-loading" role="status" aria-live="polite"><span></span><strong>Carregando capítulo '+chapter+'</strong></div>';
}
const loadingStyle=document.createElement("style");
loadingStyle.id="readerLiveLoadingStyle";
loadingStyle.textContent=`
.reader-live-loading{min-height:42vh;display:grid;place-items:center;align-content:center;gap:.7rem;color:#66758a;font-size:.72rem;font-weight:750}
.reader-live-loading span{width:1.8rem;height:1.8rem;border:3px solid rgba(83,111,148,.16);border-top-color:#5b7ea9;border-radius:50%;animation:mmReaderSpin .7s linear infinite}
@keyframes mmReaderSpin{to{transform:rotate(360deg)}}
`;
document.head.append(loadingStyle);

function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.hidden=false;
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>{toast.hidden=true},1800);
}
function openSheet(sheet){if(!sheet)return;sheet.hidden=false;document.body.style.overflow="hidden"}
function closeSheet(sheet){if(!sheet)return;sheet.hidden=true;document.body.style.overflow=""}

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

function updateProgress(){
  const pages=[...document.querySelectorAll("[data-reader-page]")];
  if(!pages.length)return;
  const viewportMid=window.scrollY+window.innerHeight*.48;
  let current=1;
  pages.forEach((page,index)=>{if(viewportMid>=page.offsetTop)current=index+1});
  const percent=pages.length>1?Math.round(((current-1)/(pages.length-1))*100):100;
  if(progressText)progressText.textContent="Página "+current+" de "+pages.length;
  if(progressPercent)progressPercent.textContent=percent+"%";
  if(progressBar)progressBar.style.width=percent+"%";
  localStorage.setItem("mangamorph:reader:"+mangaId+":"+chapter,String(current));
  window.dispatchEvent(new CustomEvent("mangamorph:progress",{detail:{mangaId,chapterNumber:chapter,pageNumber:current,percent}}));
}
window.addEventListener("scroll",updateProgress,{passive:true});
window.addEventListener("mangamorph:library-loaded",forceReaderTop);
window.addEventListener("storage",event=>{
  if(event.key!=="mangamorph:theme")return;
  const light=event.newValue==="light";
  document.body.classList.toggle("light-reader",light);
  if(readerThemeLabel)readerThemeLabel.textContent=light?"Claro":"Escuro";
});

if(progressText)progressText.textContent="Preparando capítulo "+chapter;
if(progressPercent)progressPercent.textContent="…";
if(progressBar)progressBar.style.width="0%";
