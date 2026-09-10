import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const panel=document.querySelector("#notificationsPanel");
const toggle=document.querySelector("#notificationsToggle");
const badge=document.querySelector("#notificationsBadge");
const list=document.querySelector("#notificationsList");
const empty=document.querySelector("#notificationsEmpty");
const markAll=document.querySelector("#notificationsMarkAll");
const adminLink=document.querySelector("#accountAdminLink");
let session=null,items=[];

function fixHeaderAvatarShape(){
  if(document.querySelector("#mangamorphCircularAvatarStyles"))return;
  const style=document.createElement("style");
  style.id="mangamorphCircularAvatarStyles";
  style.textContent=`
    #accountToggle.account-button{
      position:relative!important;
      display:block!important;
      flex:0 0 66px!important;
      width:66px!important;
      min-width:66px!important;
      max-width:66px!important;
      height:66px!important;
      min-height:66px!important;
      max-height:66px!important;
      padding:4px!important;
      border-radius:50%!important;
      overflow:hidden!important;
      aspect-ratio:1/1!important;
      box-sizing:border-box!important;
    }
    #accountToggle .header-profile-image,
    #accountToggle .header-profile-initials{
      position:absolute!important;
      inset:4px!important;
      width:calc(100% - 8px)!important;
      height:calc(100% - 8px)!important;
      margin:0!important;
      padding:0!important;
      border-radius:50%!important;
      overflow:hidden!important;
    }
    #accountToggle .header-profile-image{
      display:block!important;
      object-fit:cover!important;
      object-position:center!important;
      z-index:3!important;
    }
    #accountToggle .header-profile-initials{
      display:grid!important;
      place-items:center!important;
      z-index:2!important;
    }
    #accountToggle #headerGuestIcon{
      position:absolute!important;
      left:50%!important;
      top:50%!important;
      width:27px!important;
      height:27px!important;
      margin:0!important;
      transform:translate(-50%,-50%)!important;
      z-index:1!important;
    }
    #accountToggle .header-profile-image[hidden],
    #accountToggle .header-profile-initials[hidden],
    #accountToggle #headerGuestIcon[hidden]{
      display:none!important;
    }
    @media(max-width:760px){
      #accountToggle.account-button{
        flex-basis:48px!important;
        width:48px!important;
        min-width:48px!important;
        max-width:48px!important;
        height:48px!important;
        min-height:48px!important;
        max-height:48px!important;
        padding:3px!important;
      }
      #accountToggle .header-profile-image,
      #accountToggle .header-profile-initials{
        inset:3px!important;
        width:calc(100% - 6px)!important;
        height:calc(100% - 6px)!important;
      }
      #accountToggle #headerGuestIcon{
        width:23px!important;
        height:23px!important;
      }
    }
    @media(max-width:480px){
      #accountToggle.account-button{
        flex-basis:40px!important;
        width:40px!important;
        min-width:40px!important;
        max-width:40px!important;
        height:40px!important;
        min-height:40px!important;
        max-height:40px!important;
        padding:3px!important;
      }
      #accountToggle #headerGuestIcon{
        width:20px!important;
        height:20px!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function mountNotificationsInMenu(){
  const nav=document.querySelector(".side-menu-nav");
  if(!toggle||!nav)return;

  toggle.className="side-menu-item side-menu-notifications";
  toggle.removeAttribute("title");
  toggle.setAttribute("aria-label","Abrir notificações");

  const bell=toggle.querySelector(".notification-bell");
  if(bell){
    bell.className="side-menu-icon";
    bell.textContent="◇";
  }

  if(!toggle.querySelector(".side-menu-notification-label")){
    const label=document.createElement("span");
    label.className="side-menu-notification-label";
    label.textContent="Notificações";
    toggle.insertBefore(label,badge||null);
  }

  if(badge)badge.classList.add("side-menu-notification-badge");

  if(!toggle.querySelector(".side-menu-notification-arrow")){
    const arrow=document.createElement("span");
    arrow.className="side-menu-notification-arrow";
    arrow.setAttribute("aria-hidden","true");
    arrow.textContent="›";
    toggle.appendChild(arrow);
  }

  nav.appendChild(toggle);

  if(!document.querySelector("#mangamorphNotificationMenuStyles")){
    const style=document.createElement("style");
    style.id="mangamorphNotificationMenuStyles";
    style.textContent=`
      .side-menu-notifications{justify-content:flex-start!important;position:relative!important}
      .side-menu-notifications .side-menu-notification-label{flex:1;min-width:0;text-align:left;font-weight:700}
      .side-menu-notifications .side-menu-notification-badge{position:static!important;top:auto!important;right:auto!important;flex:0 0 auto;min-width:1.35rem;height:1.35rem;padding:0 .3rem;margin-left:auto;border:0!important;border-radius:999px;background:#171d27;color:#fff;font-size:.62rem;font-weight:900;line-height:1.35rem;text-align:center}
      .side-menu-notifications .side-menu-notification-arrow{flex:0 0 auto;margin-left:.15rem;color:#778195;font-size:1.15rem;line-height:1}
      body:not(.light) .side-menu-notifications .side-menu-notification-badge{background:#f2f5f9;color:#111722}
    `;
    document.head.appendChild(style);
  }
}

function closeSideMenu(){
  const menu=document.querySelector("#sideMenu");
  if(!menu||menu.hidden)return;
  const closeButton=menu.querySelector(".side-menu-close");
  if(closeButton)closeButton.click();
  else{
    menu.hidden=true;
    document.querySelector("#menuToggle")?.setAttribute("aria-expanded","false");
  }
}

fixHeaderAvatarShape();
mountNotificationsInMenu();

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function time(v){const d=new Date(v),diff=Date.now()-d.getTime(),m=Math.floor(diff/60000);if(m<1)return"agora";if(m<60)return m+" min";const h=Math.floor(m/60);if(h<24)return h+" h";return d.toLocaleDateString("pt-BR")}
function close(){panel.hidden=true;document.body.style.overflow=""}
function render(){
  const unread=items.filter(x=>!x.read_at).length;
  badge.hidden=!unread;badge.textContent=unread>9?"9+":String(unread);
  empty.hidden=items.length>0;
  list.innerHTML=items.map(n=>'<button class="notification-row '+(!n.read_at?'unread':'')+'" type="button" data-notification-id="'+n.id+'" data-href="'+esc(n.href||"")+'"><span class="notification-dot"></span><span class="notification-copy"><strong>'+esc(n.title)+'</strong><small>'+esc(n.body||"")+'</small><time>'+time(n.created_at)+'</time></span><span class="notification-arrow">›</span></button>').join("");
}
async function load(){
  if(!session){items=[];render();return}
  const {data}=await db.from("mangamorph_notifications").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(60);
  items=data||[];render();
}
async function checkAdmin(){
  if(!session||!adminLink)return adminLink&&(adminLink.hidden=true);
  const {data}=await db.rpc("is_mangamorph_admin");
  adminLink.hidden=data!==true;
}
toggle?.addEventListener("click",async()=>{
  closeSideMenu();
  if(!session){window.dispatchEvent(new CustomEvent("mangamorph:open-login"));return}
  await load();panel.hidden=false;document.body.style.overflow="hidden";
});
document.querySelectorAll("[data-close-notifications]").forEach(x=>x.addEventListener("click",close));
markAll?.addEventListener("click",async()=>{
  if(!session)return;
  await db.from("mangamorph_notifications").update({read_at:new Date().toISOString()}).eq("user_id",session.user.id).is("read_at",null);
  await load();
});
list?.addEventListener("click",async e=>{
  const row=e.target.closest("[data-notification-id]");if(!row||!session)return;
  await db.from("mangamorph_notifications").update({read_at:new Date().toISOString()}).eq("id",Number(row.dataset.notificationId)).eq("user_id",session.user.id);
  const href=row.dataset.href;if(href)location.href=href;else{await load();close()}
});
db.auth.onAuthStateChange((event,next)=>{session=next;setTimeout(()=>{load();checkAdmin()},0)});
const {data:{session:s}}=await db.auth.getSession();session=s;await Promise.all([load(),checkAdmin()]);