const home=document.querySelector("#readerBack");
if(home){
  home.href="./";
  home.textContent="M";
  home.classList.add("reader-home-mark");
  home.setAttribute("aria-label","MangaMorph — voltar à página inicial");
  home.setAttribute("title","Início");
}

const style=document.createElement("style");
style.id="readerHomeMarkStyle";
style.textContent=`
  .reader-home-mark{font-size:1.02rem!important;font-weight:950!important;letter-spacing:-.08em!important;text-decoration:none!important}
`;
document.head.append(style);

document.addEventListener("click",event=>{
  const target=event.target.closest("#readerBack.reader-home-mark");
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.href="./";
},true);

function loadCinematicHero(){
  if(document.querySelector('script[data-reader-hero]'))return;
  const script=document.createElement("script");
  script.src="assets/js/reader-hero.js?v=001";
  script.defer=true;
  script.dataset.readerHero="true";
  document.body.append(script);
}

if(!document.querySelector('link[data-reader-hero-style]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="assets/css/reader-hero.css?v=001";
  link.dataset.readerHeroStyle="true";
  link.onload=loadCinematicHero;
  link.onerror=loadCinematicHero;
  document.head.append(link);
}else{
  loadCinematicHero();
}
