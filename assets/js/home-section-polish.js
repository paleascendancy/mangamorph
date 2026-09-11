(()=>{
  if(!document.querySelector('link[data-account-menu-style]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/css/account-menu.css?v=001';
    link.dataset.accountMenuStyle='true';
    document.head.appendChild(link);
  }
})();
