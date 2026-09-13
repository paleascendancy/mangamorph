import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import("./theme-system.js?v=110").catch(()=>{});
import("./profile-panel-cleanup.js?v=002").catch(()=>{});
import("./admin-access.js?v=001").catch(()=>{});
import("./global-header.js?v=001").catch(()=>{});

const db=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let session=null,valid=new Set(),syncTimer=null,liveChannel=null;

function arr(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v.map(Number):[]}catch{return[]}}
function queueInit(delay=120){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(session)init()},delay)}

async function init(){
  if(!session)return;
  const [{data:works},{data:rows},{data:history},{data:progress}]=await Promise.all([
    db.from("mangamorph_mangas").select("id"),
    db.from("mangamorph_library").select("*").eq("user_id",session.user.id),
    db.from("mangamorph_history").select("manga_id,last_opened_at").eq("user_id",session.user.id).order("last_opened_at",{ascending:false}).limit(30),
    db.from("mangamorph_reading_progress").select("manga_id,chapter_number,page_number,progress_percent,last_read_at").eq("user_id",session.user.id)
  ]);
  valid=new Set((works||[]).map(x=>Number(x.id)));
  let library=rows||[];

  if(!library.length){
    const favorites=new Set(arr("mangamorph:favorites")),marked=new Set(arr("mangamorph:marked"));
    const ids=[...new Set([...favorites,...marked])].filter(id=>valid.has(id));
    for(const id of ids){
      const row={user_id:session.user.id,manga_id:id,favorite:favorites.has(id),in_list:marked.has(id),reading_status:localStorage.getItem("mangamorph:status:"+id)||null};
      await db.from("mangamorph_library").upsert(row,{onConflict:"user_id,manga_id"});
      library.push(row);
    }
  }else{
    localStorage.setItem("mangamorph:favorites",JSON.stringify(library.filter(x=>x.favorite).map(x=>x.manga_id)));
    localStorage.setItem("mangamorph:marked",JSON.stringify(library.filter(x=>x.in_list).map(x=>x.manga_id)));
    library.forEach(x=>{if(x.reading_status)localStorage.setItem("mangamorph:status:"+x.manga_id,x.reading_status)});
  }

  if(history?.length)localStorage.setItem("mangamorph:history",JSON.stringify(history.map(x=>x.manga_id)));
  else{
    const localHistory=arr("mangamorph:history").filter(id=>valid.has(id)).slice(0,30);
    for(const id of localHistory)await db.from("mangamorph_history").upsert({user_id:session.user.id,manga_id:id,last_opened_at:new Date().toISOString()},{onConflict:"user_id,manga_id"});
  }

  (progress||[]).forEach(row=>{if(row.chapter_number&&row.page_number)localStorage.setItem("mangamorph:reader:"+row.manga_id+":"+Number(row.chapter_number),String(row.page_number))});
  window.dispatchEvent(new CustomEvent("mangamorph:library-loaded",{detail:{library,history:history||[],progress:progress||[]}}));
}

function startRealtime(){
  if(!session)return;
  if(liveChannel){try{db.removeChannel(liveChannel)}catch{}}
  const filter="user_id=eq."+session.user.id;
  liveChannel=db.channel("mangamorph-account-"+session.user.id)
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_library",filter},()=>queueInit())
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_history",filter},()=>queueInit())
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_reading_progress",filter},()=>queueInit())
    .subscribe();
}

window.addEventListener("mangamorph:library-change",async e=>{
  if(!session)return;
  const d=e.detail||{},id=Number(d.mangaId);if(!valid.has(id))return;
  const {data:old}=await db.from("mangamorph_library").select("*").eq("user_id",session.user.id).eq("manga_id",id).maybeSingle();
  const row=old||{favorite:false,in_list:false,reading_status:null,notifications_enabled:false};
  await db.from("mangamorph_library").upsert({user_id:session.user.id,manga_id:id,favorite:d.favorite===undefined?row.favorite:!!d.favorite,in_list:d.inList===undefined?row.in_list:!!d.inList,reading_status:d.readingStatus===undefined?row.reading_status:(d.readingStatus||null),notifications_enabled:d.notificationsEnabled===undefined?(d.favorite===true?localStorage.getItem("mangamorph:notifications")==="on":row.notifications_enabled):!!d.notificationsEnabled},{onConflict:"user_id,manga_id"});
});

window.addEventListener("mangamorph:notifications-global",async e=>{
  if(!session)return;const enabled=!!e.detail?.enabled;
  const {data:rows}=await db.from("mangamorph_library").select("manga_id,favorite").eq("user_id",session.user.id);
  await Promise.all((rows||[]).filter(x=>x.favorite).map(row=>db.from("mangamorph_library").update({notifications_enabled:enabled}).eq("user_id",session.user.id).eq("manga_id",row.manga_id)));
});

window.addEventListener("mangamorph:history-open",async e=>{if(!session)return;const id=Number(e.detail?.mangaId);if(!valid.has(id))return;await db.from("mangamorph_history").upsert({user_id:session.user.id,manga_id:id,last_opened_at:new Date().toISOString()},{onConflict:"user_id,manga_id"})});
window.addEventListener("mangamorph:progress",async e=>{if(!session)return;const d=e.detail||{},id=Number(d.mangaId),number=Number(d.chapterNumber);if(!valid.has(id)||!number)return;const {data:chapter}=await db.from("mangamorph_chapters").select("id").eq("manga_id",id).eq("chapter_number",number).maybeSingle();await db.from("mangamorph_reading_progress").upsert({user_id:session.user.id,manga_id:id,chapter_id:chapter?.id||null,chapter_number:number,page_number:Math.max(1,Number(d.pageNumber)||1),progress_percent:Math.max(0,Math.min(100,Number(d.percent)||0)),last_read_at:new Date().toISOString()},{onConflict:"user_id,manga_id"})});

db.auth.onAuthStateChange((event,next)=>{session=next;if(next&&(event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")){setTimeout(async()=>{await init();startRealtime()},0)}else if(event==="SIGNED_OUT"&&liveChannel){db.removeChannel(liveChannel);liveChannel=null}});
const {data:{session:s}}=await db.auth.getSession();session=s;if(session){await init();startRealtime()}
window.addEventListener("focus",()=>queueInit(50));