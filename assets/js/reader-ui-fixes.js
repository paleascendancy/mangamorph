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
  .light-reader .reader-home-mark{color:#111722!important;background:#fff!important}
`;
document.head.append(style);

document.addEventListener("click",event=>{
  const target=event.target.closest("#readerBack.reader-home-mark");
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.href="./";
},true);