(function(){
  const LEGACY_KEY="mangamorph:theme";
  const KEY="mangamorph:theme-v2";
  const CHANNEL="mangamorph-theme";
  const normalize=value=>value==="light"?"light":"gray";
  const channel="BroadcastChannel" in window?new BroadcastChannel(CHANNEL):null;
  let applying=false;

  function readTheme(){
    return normalize(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||"gray");
  }

  function setRootTheme(theme){
    const root=document.documentElement;
    root.classList.remove("mm-theme-dark","mm-theme-light","mm-boot-light","mm-boot-gray");
    root.classList.add(theme==="light"?"mm-theme-light":"mm-theme-dark");
    root.dataset.mmTheme=theme;
  }

  function setBodyTheme(theme){
    if(!document.body)return;
    document.body.classList.remove("light","dark","mm-theme-light","mm-theme-gray");
    document.body.classList.add(theme==="light"?"mm-theme-light":"mm-theme-gray");
    document.body.classList.toggle("light",theme==="light");
    if(document.body.classList.contains("reader-body")){
      document.body.classList.toggle("light-reader",theme==="light");
    }
  }

  function updateControls(theme){
    const label=document.querySelector("#themeValue");
    if(label)label.textContent=theme==="light"?"Branco":"Cinza";
    const readerLabel=document.querySelector("#readerThemeLabel");
    if(readerLabel)readerLabel.textContent=theme==="light"?"Claro":"Cinza";
    document.querySelectorAll("[data-theme]").forEach(button=>{
      const value=normalize(button.dataset.theme);
      button.classList.toggle("active",value===theme);
      button.setAttribute("aria-pressed",value===theme?"true":"false");
    });
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",theme==="light"?"#eef1f5":"#202329");
  }

  function apply(theme,{persist=false,broadcast=false}={}){
    if(applying)return;
    applying=true;
    theme=normalize(theme);
    setRootTheme(theme);
    setBodyTheme(theme);
    updateControls(theme);
    if(persist){
      localStorage.setItem(KEY,theme);
      localStorage.setItem(LEGACY_KEY,theme);
    }
    if(broadcast)channel?.postMessage({theme});
    applying=false;
    window.dispatchEvent(new CustomEvent("mangamorph:theme-change",{detail:{theme}}));
  }

  function persistTheme(theme){
    apply(theme,{persist:true,broadcast:true});
  }

  function adaptThemeMenu(){
    const old=document.querySelector('[data-theme="dark"]');
    if(old){old.dataset.theme="gray";old.textContent="Cinza";}
    const gray=document.querySelector('[data-theme="gray"]');
    if(gray)gray.textContent="Cinza";
    const light=document.querySelector('[data-theme="light"]');
    if(light)light.textContent="Branco";
    apply(readTheme());
  }

  setRootTheme(readTheme());
  if(document.body)setBodyTheme(readTheme());
  else document.addEventListener("DOMContentLoaded",()=>apply(readTheme()),{once:true});

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",adaptThemeMenu,{once:true});
  else adaptThemeMenu();

  document.addEventListener("click",event=>{
    const option=event.target.closest?.("[data-theme]");
    if(option){
      event.preventDefault();
      event.stopImmediatePropagation();
      persistTheme(option.dataset.theme);
      return;
    }
    const toggle=event.target.closest?.("#themeToggle,#readerThemeToggle");
    if(toggle){
      event.preventDefault();
      event.stopImmediatePropagation();
      persistTheme(readTheme()==="gray"?"light":"gray");
    }
  },true);

  window.addEventListener("storage",event=>{
    if(event.key===KEY||event.key===LEGACY_KEY)apply(readTheme());
  });

  channel?.addEventListener("message",event=>{
    if(event.data?.theme)apply(event.data.theme);
  });

  window.addEventListener("pageshow",()=>apply(readTheme()));
  window.MangaMorphTheme={apply:persistTheme,get:readTheme};
})();
