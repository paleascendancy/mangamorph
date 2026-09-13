const favoriteButton=document.querySelector("#favoriteDetail");
const listButton=document.querySelector("#markDetail");
const readButton=document.querySelector("#readLatest");

if(favoriteButton){
  favoriteButton.setAttribute("title","Favoritar");
  favoriteButton.setAttribute("aria-label","Favoritar obra");
}
if(listButton){
  listButton.setAttribute("title","Adicionar à minha lista");
  listButton.setAttribute("aria-label","Adicionar à minha lista");
}
if(readButton){
  readButton.setAttribute("aria-label","Abrir leitura desta obra");
}

/*
  Navigation for the primary read button belongs exclusively to manga-runtime.js.
  Older code queried the first chapter again and intercepted the click in capture
  phase, which could override "continue reading" and send the reader backwards.
*/

import("./manga-chapter-source.js?v=003").catch(error=>console.error("MangaMorph chapter source:",error));
import("./manga-page-comments.js?v=002").catch(error=>console.error("MangaMorph page comments:",error));