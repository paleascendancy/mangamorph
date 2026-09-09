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