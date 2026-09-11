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
  body.reader-body .reader-header{min-height:4rem!important;padding:.5rem .75rem!important;gap:.6rem!important;background:rgba(245,247,250,.97)!important;border-bottom:1px solid rgba(31,43,58,.09)!important;box-shadow:0 6px 20px rgba(30,42,58,.06)!important;backdrop-filter:blur(14px) saturate(120%)!important;-webkit-backdrop-filter:blur(14px) saturate(120%)!important}
  body.reader-body .reader-heading{min-width:0!important;display:grid!important;align-content:center!important;gap:.08rem!important}
  body.reader-body .reader-brand{color:#6f7f94!important;opacity:1!important;font-size:.5rem!important;font-weight:900!important;letter-spacing:.18em!important}
  body.reader-body .reader-title-link{display:block!important;min-width:0!important;color:#111827!important;text-decoration:none!important}
  body.reader-body .reader-heading strong{display:block!important;margin:0!important;color:#111827!important;opacity:1!important;font-size:.82rem!important;font-weight:850!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  body.reader-body .reader-heading small{display:block!important;margin:0!important;color:#66758a!important;opacity:1!important;font-size:.58rem!important;font-weight:700!important}
  body.reader-body .reader-back,body.reader-body .reader-icon-button{width:2.55rem!important;height:2.55rem!important;min-width:2.55rem!important;border-radius:.8rem!important;background:#1f2937!important;color:#fff!important;border:1px solid rgba(17,24,39,.08)!important;box-shadow:0 5px 14px rgba(17,24,39,.14)!important}
  body.reader-body .reader-icon-button{font-size:1rem!important}
  @media(max-width:560px){body.reader-body .reader-header{grid-template-columns:2.45rem minmax(0,1fr) 2.45rem!important;min-height:3.7rem!important;padding:.42rem .6rem!important;gap:.5rem!important}body.reader-body .reader-back,body.reader-body .reader-icon-button{width:2.45rem!important;height:2.45rem!important;min-width:2.45rem!important;border-radius:.74rem!important}body.reader-body .reader-brand{font-size:.44rem!important;letter-spacing:.15em!important}body.reader-body .reader-heading strong{font-size:.76rem!important}body.reader-body .reader-heading small{font-size:.52rem!important}body.reader-body .reader-progress-shell{top:3.7rem!important}}
`;
document.head.append(style);

function installReaderControlFixes(){
  document.querySelector("#readerControlLayoutFix")?.remove();
  const controlStyle=document.createElement("style");
  controlStyle.id="readerControlLayoutFix";
  controlStyle.textContent=`
    body.reader-body .reader-bottom-bar{display:grid!important;grid-template-columns:2.5rem minmax(8rem,11rem) 2.5rem 2.5rem!important;grid-template-rows:2.5rem!important;grid-auto-flow:column!important;grid-auto-rows:2.5rem!important;align-items:center!important;justify-items:center!important;gap:.4rem!important;width:max-content!important;max-width:calc(100vw - 1.2rem)!important;min-height:0!important;height:auto!important;padding:.38rem!important;box-sizing:border-box!important;overflow:visible!important}
    body.reader-body .reader-bottom-bar>button{position:relative!important;inset:auto!important;float:none!important;margin:0!important;flex:none!important;grid-row:1!important;min-width:0!important;box-sizing:border-box!important}
    body.reader-body .reader-bottom-bar #previousChapter{grid-column:1!important}body.reader-body .reader-bottom-bar #chapterPickerButton{grid-column:2!important;width:100%!important;min-width:0!important;max-width:none!important;white-space:nowrap!important}body.reader-body .reader-bottom-bar #nextChapter{grid-column:3!important}body.reader-body .reader-bottom-bar #readerScrollTop{grid-column:4!important}
    @media(max-width:560px){body.reader-body .reader-bottom-bar{grid-template-columns:2.3rem minmax(7rem,8.8rem) 2.3rem 2.3rem!important;grid-template-rows:2.3rem!important;grid-auto-rows:2.3rem!important;gap:.28rem!important;padding:.32rem!important;max-width:calc(100vw - .8rem)!important}body.reader-body .reader-bottom-bar>button:not(.reader-chapter-pill){width:2.3rem!important;height:2.3rem!important}body.reader-body .reader-bottom-bar .reader-chapter-pill{min-height:2.3rem!important;height:2.3rem!important}}
    @media(max-width:390px){body.reader-body .reader-bottom-bar{grid-template-columns:2.15rem minmax(6.6rem,8rem) 2.15rem 2.15rem!important;grid-template-rows:2.15rem!important;grid-auto-rows:2.15rem!important;gap:.22rem!important}body.reader-body .reader-bottom-bar>button:not(.reader-chapter-pill){width:2.15rem!important;height:2.15rem!important}body.reader-body .reader-bottom-bar .reader-chapter-pill{min-height:2.15rem!important;height:2.15rem!important}}
  `;
  document.head.append(controlStyle);
}
installReaderControlFixes();

document.addEventListener("click",event=>{
  const target=event.target.closest("#readerBack.reader-home-mark");
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.href="./";
},true);

function loadCinematicHero(){
  if(document.querySelector('script[data-reader-hero]')){
    requestAnimationFrame(installReaderControlFixes);
    return;
  }
  const script=document.createElement("script");
  script.src="assets/js/reader-hero.js?v=002";
  script.defer=true;
  script.dataset.readerHero="true";
  script.onload=()=>requestAnimationFrame(installReaderControlFixes);
  document.body.append(script);
}

if(!document.querySelector('link[data-reader-hero-style]')){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="assets/css/reader-hero.css?v=002";
  link.dataset.readerHeroStyle="true";
  link.onload=()=>{
    loadCinematicHero();
    requestAnimationFrame(installReaderControlFixes);
  };
  link.onerror=()=>{
    loadCinematicHero();
    requestAnimationFrame(installReaderControlFixes);
  };
  document.head.append(link);
}else{
  loadCinematicHero();
  requestAnimationFrame(installReaderControlFixes);
}

window.addEventListener("resize",()=>requestAnimationFrame(installReaderControlFixes),{passive:true});
