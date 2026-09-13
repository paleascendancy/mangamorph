const mangaId=Number(new URLSearchParams(location.search).get("id"))||1;
const chapterList=document.querySelector("#chapterList");

function readerUrl(chapter){
  return "reader.html?id="+mangaId+"&chapter="+encodeURIComponent(String(chapter));
}

function enhanceChapterRows(){
  if(!chapterList)return;
  chapterList.querySelectorAll(".chapter-row").forEach(row=>{
    const button=row.querySelector("[data-read-chapter]");
    if(button?.dataset.readChapter){
      row.dataset.chapterCard=button.dataset.readChapter;
      row.style.cursor="pointer";
    }
  });
}

/*
  Chapter data, filtering and sorting are owned by manga-runtime.js + manga.js.
  Work comments are owned by manga-page-comments.js. This file now only makes
  the visible chapter row clickable without issuing another database request
  or rendering a second competing copy of the same UI.
*/

enhanceChapterRows();
if(chapterList){
  new MutationObserver(enhanceChapterRows).observe(chapterList,{childList:true});
  chapterList.addEventListener("click",event=>{
    if(event.target.closest("button,a,input,select,textarea"))return;
    const row=event.target.closest(".chapter-row[data-chapter-card]");
    if(!row)return;
    location.href=readerUrl(row.dataset.chapterCard);
  });
}