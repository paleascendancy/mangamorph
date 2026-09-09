const catalog = [
  {id:1,title:"Neon Ronin",chapter:127,accent:"#3a4162"},
  {id:2,title:"Astral Bloom",chapter:91,accent:"#523b64"},
  {id:3,title:"Zero District",chapter:68,accent:"#294b52"},
  {id:4,title:"Crimson Archive",chapter:143,accent:"#64363c"},
  {id:5,title:"Moon Relay",chapter:82,accent:"#354561"},
  {id:6,title:"Silent Frame",chapter:74,accent:"#494b55"},
  {id:7,title:"Vector Hearts",chapter:112,accent:"#593c4f"},
  {id:8,title:"Glass Kingdom",chapter:105,accent:"#36545e"},
  {id:9,title:"Night Protocol",chapter:57,accent:"#31384a"},
  {id:10,title:"Afterlight",chapter:49,accent:"#5a4650"},
  {id:11,title:"Morrow Gate",chapter:36,accent:"#3e4e66"},
  {id:12,title:"Black Signal",chapter:28,accent:"#52383d"},
  {id:13,title:"Lucid Crown",chapter:19,accent:"#3a5661"},
  {id:14,title:"Echo Garden",chapter:16,accent:"#50455f"},
  {id:15,title:"Iron Chapel",chapter:11,accent:"#4c4b50"}
];

const params = new URLSearchParams(location.search);
const mangaId = Number(params.get("id")) || 1;
const manga = catalog.find(function(item){ return item.id === mangaId; }) || catalog[0];
let chapter = Math.max(1, Math.min(Number(params.get("chapter")) || manga.chapter, manga.chapter));

const readerTitle = document.querySelector("#readerTitle");
const readerChapterLabel = document.querySelector("#readerChapterLabel");
const bottomChapterLabel = document.querySelector("#bottomChapterLabel");
const finishChapterLabel = document.querySelector("#finishChapterLabel");
const readerStage = document.querySelector("#readerStage");
const progressText = document.querySelector("#readerProgressText");
const progressPercent = document.querySelector("#readerProgressPercent");
const progressBar = document.querySelector("#readerProgressBar");
const chapterPicker = document.querySelector("#chapterPicker");
const readerSettings = document.querySelector("#readerSettings");
const chapterGrid = document.querySelector("#readerChapterGrid");
const readerThemeLabel = document.querySelector("#readerThemeLabel");
const controlsSwitch = document.querySelector("#readerControlsSwitch");
const toast = document.querySelector("#readerToast");

document.querySelector("#readerBack").href = "manga.html?id=" + manga.id;

function showToast(message){
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function(){ toast.hidden = true; },2200);
}

function pageCopy(page){
  const lines = [
    "A leitura real será exibida aqui quando os arquivos das páginas forem conectados.",
    "Este espaço já está preparado para imagens verticais em alta resolução.",
    "O MangaMorph preservará a largura da página e o progresso do leitor.",
    "Controles desaparecem durante a leitura para reduzir distrações.",
    "O progresso é atualizado conforme você avança pelo capítulo.",
    "Ao final, você pode seguir direto para o próximo capítulo."
  ];
  return lines[(page-1)%lines.length];
}

function renderPages(){
  const pageCount = 6;
  readerStage.innerHTML = Array.from({length:pageCount},function(_,index){
    const page = index + 1;
    return '<article class="reader-page" data-reader-page="' + page + '" style="--page-accent:' + manga.accent + '">' +
      '<div class="reader-page-copy"><span>PÁGINA ' + String(page).padStart(2,"0") + '</span><strong>' + manga.title + '</strong><small>' + pageCopy(page) + '</small></div>' +
    '</article>';
  }).join("");
}

function updateLabels(){
  document.title = "MangaMorph — " + manga.title + " · Capítulo " + chapter;
  readerTitle.textContent = manga.title;
  readerChapterLabel.textContent = "Capítulo " + chapter;
  bottomChapterLabel.textContent = chapter;
  finishChapterLabel.textContent = "Capítulo " + chapter + " concluído";
  params.set("id",manga.id);
  params.set("chapter",chapter);
  history.replaceState(null,"","reader.html?" + params.toString());
}

function renderChapterGrid(){
  const start = Math.max(1,manga.chapter-29);
  const values = [];
  for(let value=manga.chapter;value>=start;value--) values.push(value);
  chapterGrid.innerHTML = values.map(function(value){
    return '<button type="button" data-reader-chapter="' + value + '" class="' + (value===chapter?'active':'') + '">Cap. ' + value + '</button>';
  }).join("");
}

function changeChapter(nextChapter){
  if(nextChapter < 1 || nextChapter > manga.chapter){
    showToast(nextChapter > manga.chapter ? "Este é o capítulo mais recente." : "Não há capítulo anterior.");
    return;
  }
  chapter = nextChapter;
  updateLabels();
  renderChapterGrid();
  renderPages();
  window.dispatchEvent(new CustomEvent("mangamorph:reader-chapter-change",{detail:{mangaId:manga.id,chapter:chapter}}));
  window.scrollTo({top:0,behavior:"smooth"});
}

function openSheet(sheet){
  sheet.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSheet(sheet){
  sheet.hidden = true;
  document.body.style.overflow = "";
}

document.querySelector("#chapterPickerButton").addEventListener("click",function(){ openSheet(chapterPicker); });
document.querySelector("#readerSettingsButton").addEventListener("click",function(){ openSheet(readerSettings); });
document.querySelectorAll("[data-close-reader-sheet]").forEach(function(button){
  button.addEventListener("click",function(){ closeSheet(chapterPicker); });
});
document.querySelectorAll("[data-close-reader-settings]").forEach(function(button){
  button.addEventListener("click",function(){ closeSheet(readerSettings); });
});

chapterGrid.addEventListener("click",function(event){
  const button = event.target.closest("[data-reader-chapter]");
  if(!button) return;
  closeSheet(chapterPicker);
  changeChapter(Number(button.dataset.readerChapter));
});

document.querySelector("#previousChapter").addEventListener("click",function(){ changeChapter(chapter-1); });
document.querySelector("#finishPrevious").addEventListener("click",function(){ changeChapter(chapter-1); });
document.querySelector("#nextChapter").addEventListener("click",function(){ changeChapter(chapter+1); });
document.querySelector("#finishNext").addEventListener("click",function(){ changeChapter(chapter+1); });

function updateProgress(){
  const pages = Array.from(document.querySelectorAll("[data-reader-page]"));
  if(!pages.length) return;
  const viewportMid = window.scrollY + window.innerHeight * .48;
  let current = 1;
  pages.forEach(function(page,index){
    const top = page.offsetTop;
    if(viewportMid >= top) current = index + 1;
  });
  const percent = Math.round(((current-1)/(pages.length-1))*100);
  progressText.textContent = "Página " + current + " de " + pages.length;
  progressPercent.textContent = percent + "%";
  progressBar.style.width = percent + "%";
  localStorage.setItem("mangamorph:reader:" + manga.id + ":" + chapter, String(current));
}
window.addEventListener("scroll",updateProgress,{passive:true});

const savedReaderTheme = localStorage.getItem("mangamorph:reader-theme") || "dark";
if(savedReaderTheme === "light"){
  document.body.classList.add("light-reader");
  readerThemeLabel.textContent = "Claro";
}
document.querySelector("#readerThemeToggle").addEventListener("click",function(){
  document.body.classList.toggle("light-reader");
  const light = document.body.classList.contains("light-reader");
  localStorage.setItem("mangamorph:reader-theme",light?"light":"dark");
  readerThemeLabel.textContent = light?"Claro":"Escuro";
});

let controlsVisible = localStorage.getItem("mangamorph:reader-controls") !== "hidden";
function renderControls(){
  document.body.classList.toggle("controls-hidden",!controlsVisible);
  controlsSwitch.classList.toggle("active",controlsVisible);
}
document.querySelector("#readerControlsToggle").addEventListener("click",function(){
  controlsVisible = !controlsVisible;
  localStorage.setItem("mangamorph:reader-controls",controlsVisible?"visible":"hidden");
  renderControls();
});
readerStage.addEventListener("click",function(){
  controlsVisible = !controlsVisible;
  renderControls();
});

updateLabels();
renderPages();
renderChapterGrid();
renderControls();
updateProgress();

const savedPage = Number(localStorage.getItem("mangamorph:reader:" + manga.id + ":" + chapter) || "1");
if(savedPage > 1){
  requestAnimationFrame(function(){
    const target = document.querySelector('[data-reader-page="' + savedPage + '"]');
    if(target) target.scrollIntoView({block:"start"});
  });
}