(function(){
  const KEY='mangamorph:theme';
  const normalize=value=>value==='light'?'light':'gray';
  function ensureStyles(){
    if(!document.querySelector('link[data-mm-theme-v2]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='assets/css/system-theme-v2.css?v=002';
      link.dataset.mmThemeV2='1';
      document.head.append(link);
    }
  }
  function apply(theme,persist=true){
    theme=normalize(theme);
    ensureStyles();
    document.body.classList.remove('light','dark','mm-theme-light','mm-theme-gray');
    document.body.classList.add(theme==='light'?'mm-theme-light':'mm-theme-gray');
    if(theme==='light')document.body.classList.add('light');
    if(document.body.classList.contains('reader-body')){
      document.body.classList.toggle('light-reader',theme==='light');
    }
    if(persist)localStorage.setItem(KEY,theme);
    const label=document.querySelector('#themeValue');
    if(label)label.textContent=theme==='light'?'Branco':'Cinza';
    document.querySelectorAll('[data-theme]').forEach(btn=>{
      const value=normalize(btn.dataset.theme);
      btn.classList.toggle('active',value===theme);
    });
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='light'?'#e4e7eb':'#1b1d21');
    document.documentElement.dataset.mmTheme=theme;
    window.dispatchEvent(new CustomEvent('mangamorph:theme-change',{detail:{theme}}));
  }
  function adaptThemeMenu(){
    const old=document.querySelector('[data-theme="dark"]');
    if(old){old.dataset.theme='gray';old.textContent='Cinza';}
    const light=document.querySelector('[data-theme="light"]');
    if(light)light.textContent='Branco';
    const value=document.querySelector('#themeValue');
    if(value)value.textContent=normalize(localStorage.getItem(KEY))==='light'?'Branco':'Cinza';
  }
  function handleThemeClick(event){
    const option=event.target.closest('[data-theme]');
    if(option){
      event.preventDefault();
      event.stopImmediatePropagation();
      apply(option.dataset.theme,true);
      return;
    }
    const toggle=event.target.closest('#themeToggle,#readerThemeToggle');
    if(toggle){
      event.preventDefault();
      event.stopImmediatePropagation();
      const current=normalize(localStorage.getItem(KEY));
      apply(current==='gray'?'light':'gray',true);
    }
  }
  ensureStyles();
  const initial=normalize(localStorage.getItem(KEY)||'gray');
  if(localStorage.getItem(KEY)==='dark')localStorage.setItem(KEY,'gray');
  if(document.body)apply(initial,false);
  else document.addEventListener('DOMContentLoaded',()=>apply(initial,false),{once:true});
  document.addEventListener('DOMContentLoaded',adaptThemeMenu,{once:true});
  document.addEventListener('click',handleThemeClick,true);
  window.addEventListener('storage',e=>{if(e.key===KEY)apply(e.newValue,false)});
  window.MangaMorphTheme={apply,get:()=>normalize(localStorage.getItem(KEY)||'gray')};
})();
