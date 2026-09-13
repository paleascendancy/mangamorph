const panel=document.querySelector("#notificationsPanel");
const badge=document.querySelector("#notificationsBadge");
const list=document.querySelector("#notificationsList");
const empty=document.querySelector("#notificationsEmpty");
const markAll=document.querySelector("#notificationsMarkAll");
const adminLink=document.querySelector("#accountAdminLink");
const legacyToggle=document.querySelector("#notificationsToggle");
legacyToggle?.remove();

let db=null,session=null,items=[];
const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function time(v){const d=new Date(v),diff=Date.now()-d.getTime(),m=Math.floor(diff/60000);if(m<1)return"agora";if(m<60)return m+" min";const h=Math.floor(m/60);if(h<24)return h+" h";return d.toLocaleDateString("pt-BR")}
function close(){if(panel)panel.hidden=true;document.body.style.overflow=""}
function render(){
  const unread=items.filter(x=>!x.read_at).length;
  if(badge){badge.hidden=!unread;badge.textContent=unread>9?"9+":String(unread)}
  if(empty)empty.hidden=items.length>0;
  if(list)list.innerHTML=items.map(n=>'<button class="notification-row '+(!n.read_at?'unread':'')+'" type="button" data-notification-id="'+n.id+'" data-href="'+esc(n.href||"")+'"><span class="notification-dot"></span><span class="notification-copy"><strong>'+esc(n.title)+'</strong><small>'+esc(n.body||"")+'</small><time>'+time(n.created_at)+'</time></span><span class="notification-arrow">›</span></button>').join("");
}
async function load(){if(!db||!session){items=[];render();return}const {data}=await db.from("mangamorph_notifications").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(60);items=data||[];render()}
async function checkAdmin(){if(!adminLink)return;if(!db||!session){adminLink.hidden=true;return}const {data}=await db.rpc("is_mangamorph_admin");adminLink.hidden=data!==true}
async function openNotifications(){if(!db||!session){window.dispatchEvent(new CustomEvent("mangamorph:open-login"));return}await load();if(panel)panel.hidden=false;document.body.style.overflow="hidden"}
window.addEventListener("mangamorph:open-notifications",openNotifications);
document.querySelectorAll("[data-close-notifications]").forEach(x=>x.addEventListener("click",close));
markAll?.addEventListener("click",async()=>{if(!db||!session)return;await db.from("mangamorph_notifications").update({read_at:new Date().toISOString()}).eq("user_id",session.user.id).is("read_at",null);await load()});
list?.addEventListener("click",async e=>{const row=e.target.closest("[data-notification-id]");if(!row||!db||!session)return;await db.from("mangamorph_notifications").update({read_at:new Date().toISOString()}).eq("id",Number(row.dataset.notificationId)).eq("user_id",session.user.id);const href=row.dataset.href;if(href)location.href=href;else{await load();close()}});

(async()=>{
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    db.auth.onAuthStateChange((event,next)=>{session=next;setTimeout(()=>{load();checkAdmin()},0)});
    const {data:{session:s}}=await db.auth.getSession();session=s;await Promise.all([load(),checkAdmin()]);
  }catch(error){console.warn("MangaMorph notifications unavailable:",error);if(adminLink)adminLink.hidden=true}
})();
