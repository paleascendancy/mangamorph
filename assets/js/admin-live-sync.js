import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

let refreshTimer=null;
let partnerReloadPending=false;

function queueCoreRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
    const button=document.querySelector("#adminRefresh");
    if(button&&!button.disabled)button.click();
  },180);
}

function partnerViewOpen(){
  const view=document.querySelector("#viewPartners");
  return Boolean(view&&!view.hidden);
}

function editorBusy(){
  const active=document.activeElement;
  if(active&&["INPUT","TEXTAREA","SELECT"].includes(active.tagName))return true;
  const shell=document.querySelector("#partnerEditorShell");
  return Boolean(shell&&!shell.hidden);
}

function queuePartnerRefresh(){
  partnerReloadPending=true;
  setTimeout(flushPartnerRefresh,450);
}

function flushPartnerRefresh(){
  if(!partnerReloadPending||!partnerViewOpen()||editorBusy())return;
  partnerReloadPending=false;
  location.reload();
}

const channel=db.channel("mangamorph-admin-live")
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_mangas"},queueCoreRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_chapters"},queueCoreRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_reports"},queueCoreRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_partner_sources"},queuePartnerRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_partner_work_map"},queuePartnerRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_partner_chapter_map"},queuePartnerRefresh)
  .subscribe();

window.addEventListener("focus",()=>{queueCoreRefresh();flushPartnerRefresh()});
document.addEventListener("focusout",()=>setTimeout(flushPartnerRefresh,80));
window.addEventListener("beforeunload",()=>{try{db.removeChannel(channel)}catch{}});
