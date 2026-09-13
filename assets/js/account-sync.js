import("./nav-stability.js?v=001").catch(()=>{});
import("./theme-system.js?v=111").catch(()=>{});
import("./global-header.js?v=006").catch(()=>{});
import("./profile-panel-cleanup.js?v=002").catch(()=>{});
import("./admin-access.js?v=001").catch(()=>{});

const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const CACHE_USER_KEY="mangamorph:cache-user";
const LEGACY_MIGRATION_KEY="mangamorph:legacy-library-migrated";
let db=null,session=null,valid=new Set(),syncTimer=null,liveChannel=null;

function arr(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v.map(Number).filter(Number.isFinite):[]}catch{return[]}}
function queueInit(delay=120){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(session&&db)init()},delay)}
function removeKeys(prefix){for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(prefix))localStorage.removeItem(key)}}
function clearLibraryCache(){
  localStorage.setItem("mangamorph:favorites","[]");
  localStorage.setItem("mangamorph:marked","[]");
  localStorage.setItem("mangamorph:history","[]");
  removeKeys("mangamorph:status:");
  removeKeys("mangamorph:reader:");
}
function clearSignedOutIdentity(){
  clearLibraryCache();
  localStorage.removeItem(CACHE_USER_KEY);
  localStorage.removeItem("mangamorph:profile");
  localStorage.setItem("mangamorph:profile-session","off");
  window.dispatchEvent(new CustomEvent("mangamorph:library-loaded",{detail:{library:[],history:[],progress:[]}}));
}
function mirrorLibrary(library){
  const rows=library||[];
  localStorage.setItem("mangamorph:favorites",JSON.stringify(rows.filter(x=>x.favorite).map(x=>Number(x.manga_id))));
  localStorage.setItem("mangamorph:marked",JSON.stringify(rows.filter(x=>x.in_list).map(x=>Number(x.manga_id))));
  removeKeys("mangamorph:status:");
  rows.forEach(x=>{if(x.reading_status)localStorage.setItem("mangamorph:status:"+x.manga_id,x.reading_status)});
}

async function ensureDb(){
  if(db)return db;
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return db;
}

async function init(){
  if(!session||!db)return;
  const userId=session.user.id;
  const previousCacheUser=localStorage.getItem(CACHE_USER_KEY);
  const sameUser=previousCacheUser===userId;
  const canMigrateLegacy=!previousCacheUser&&localStorage.getItem(LEGACY_MIGRATION_KEY)!=="1";
  const localFavorites=arr("mangamorph:favorites");
  const localMarked=arr("mangamorph:marked");
  const localHistoryBefore=arr("mangamorph:history");

  if(previousCacheUser&&previousCacheUser!==userId)clearLibraryCache();
  localStorage.setItem(CACHE_USER_KEY,userId);

  const [{data:works},{data:rows},{data:history},{data:progress}]=await Promise.all([
    db.from("mangamorph_mangas").select("id"),
    db.from("mangamorph_library").select("*").eq("user_id",userId),
    db.from("mangamorph_history").select("manga_id,last_opened_at").eq("user_id",userId).order("last_opened_at",{ascending:false}).limit(30),
    db.from("mangamorph_reading_progress").select("manga_id,chapter_number,page_number,progress_percent,last_read_at").eq("user_id",userId)
  ]);
  valid=new Set((works||[]).map(x=>Number(x.id)));
  let library=rows||[];
  let historyRows=history||[];

  if(!library.length&&canMigrateLegacy){
    const favorites=new Set(localFavorites),marked=new Set(localMarked);
    const ids=[...new Set([...favorites,...marked])].filter(id=>valid.has(id));
    for(const id of ids){
      const row={user_id:userId,manga_id:id,favorite:favorites.has(id),in_list:marked.has(id),reading_status:localStorage.getItem("mangamorph:status:"+id)||null};
      const {data,error}=await db.from("mangamorph_library").upsert(row,{onConflict:"user_id,manga_id"}).select().single();
      if(!error)library.push(data||row);
    }
  }
  mirrorLibrary(library);

  if(canMigrateLegacy){
    const legacyHistory=localHistoryBefore.filter(id=>valid.has(id)).slice(0,30);
    const base=Date.now();
    for(let index=0;index<legacyHistory.length;index++){
      const id=legacyHistory[index];
      await db.from("mangamorph_history").upsert({user_id:userId,manga_id:id,last_opened_at:new Date(base-index*1000).toISOString()},{onConflict:"user_id,manga_id"});
    }
    if(legacyHistory.length){
      historyRows=legacyHistory.map((manga_id,index)=>({manga_id,last_opened_at:new Date(base-index*1000).toISOString()}));
    }
    localStorage.setItem(LEGACY_MIGRATION_KEY,"1");
  }else if(sameUser){
    const newestLocal=localHistoryBefore.find(id=>valid.has(id));
    const newestRemote=Number(historyRows?.[0]?.manga_id)||null;
    if(newestLocal&&newestLocal!==newestRemote){
      const now=new Date().toISOString();
      const {error}=await db.from("mangamorph_history").upsert({user_id:userId,manga_id:newestLocal,last_opened_at:now},{onConflict:"user_id,manga_id"});
      if(!error)historyRows=[{manga_id:newestLocal,last_opened_at:now},...historyRows.filter(row=>Number(row.manga_id)!==newestLocal)].slice(0,30);
    }
  }
  localStorage.setItem("mangamorph:history",JSON.stringify(historyRows.map(x=>Number(x.manga_id)).filter(id=>valid.has(id))));

  (progress||[]).forEach(row=>{
    const hasChapter=row.chapter_number!==null&&row.chapter_number!==undefined&&Number.isFinite(Number(row.chapter_number));
    if(hasChapter&&row.page_number)localStorage.setItem("mangamorph:reader:"+row.manga_id+":"+Number(row.chapter_number),String(row.page_number));
  });
  window.dispatchEvent(new CustomEvent("mangamorph:library-loaded",{detail:{library,history:historyRows,progress:progress||[]}}));
}

function startRealtime(){
  if(!session||!db)return;
  if(liveChannel){try{db.removeChannel(liveChannel)}catch{}}
  const filter="user_id=eq."+session.user.id;
  liveChannel=db.channel("mangamorph-account-"+session.user.id)
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_library",filter},()=>queueInit())
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_history",filter},()=>queueInit())
    .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_reading_progress",filter},()=>queueInit())
    .subscribe();
}

window.addEventListener("mangamorph:library-change",async e=>{
  if(!session||!db)return;
  const d=e.detail||{},id=Number(d.mangaId);if(!valid.has(id))return;
  const {data:old}=await db.from("mangamorph_library").select("*").eq("user_id",session.user.id).eq("manga_id",id).maybeSingle();
  const row=old||{favorite:false,in_list:false,reading_status:null,notifications_enabled:false};
  await db.from("mangamorph_library").upsert({user_id:session.user.id,manga_id:id,favorite:d.favorite===undefined?row.favorite:!!d.favorite,in_list:d.inList===undefined?row.in_list:!!d.inList,reading_status:d.readingStatus===undefined?row.reading_status:(d.readingStatus||null),notifications_enabled:d.notificationsEnabled===undefined?(d.favorite===true?localStorage.getItem("mangamorph:notifications")==="on":row.notifications_enabled):!!d.notificationsEnabled},{onConflict:"user_id,manga_id"});
});

window.addEventListener("mangamorph:notifications-global",async e=>{
  if(!session||!db)return;const enabled=!!e.detail?.enabled;
  const {data:rows}=await db.from("mangamorph_library").select("manga_id,favorite").eq("user_id",session.user.id);
  await Promise.all((rows||[]).filter(x=>x.favorite).map(row=>db.from("mangamorph_library").update({notifications_enabled:enabled}).eq("user_id",session.user.id).eq("manga_id",row.manga_id)));
});

window.addEventListener("mangamorph:profile-save",async e=>{
  if(!session||!db)return;
  const profile=e.detail||{};
  const {error}=await db.from("mangamorph_profiles").update({
    is_public:profile.isPublic!==false,
    show_activity:profile.showActivity!==false,
    show_favorites:profile.showFavorites!==false
  }).eq("id",session.user.id);
  if(error)console.warn("MangaMorph profile privacy sync unavailable:",error);
});

window.addEventListener("mangamorph:history-open",async e=>{
  if(!session||!db)return;
  const id=Number(e.detail?.mangaId);if(!valid.has(id))return;
  const now=new Date().toISOString();
  await db.from("mangamorph_history").upsert({user_id:session.user.id,manga_id:id,last_opened_at:now},{onConflict:"user_id,manga_id"});
});
window.addEventListener("mangamorph:progress",async e=>{
  if(!session||!db)return;
  const d=e.detail||{},id=Number(d.mangaId),number=Number(d.chapterNumber);
  if(!valid.has(id)||!Number.isFinite(number)||number<0)return;
  const {data:chapter}=await db.from("mangamorph_chapters").select("id").eq("manga_id",id).eq("chapter_number",number).maybeSingle();
  await db.from("mangamorph_reading_progress").upsert({user_id:session.user.id,manga_id:id,chapter_id:chapter?.id||null,chapter_number:number,page_number:Math.max(1,Number(d.pageNumber)||1),progress_percent:Math.max(0,Math.min(100,Number(d.percent)||0)),last_read_at:new Date().toISOString()},{onConflict:"user_id,manga_id"})
});

try{
  await ensureDb();
  db.auth.onAuthStateChange((event,next)=>{
    session=next;
    if(next&&(event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")){
      setTimeout(async()=>{await init();startRealtime()},0);
    }else if(event==="SIGNED_OUT"){
      if(liveChannel){db.removeChannel(liveChannel);liveChannel=null}
      clearSignedOutIdentity();
    }
  });
  const {data:{session:s}}=await db.auth.getSession();session=s;if(session){await init();startRealtime()}
  window.addEventListener("focus",()=>queueInit(50));
}catch(error){
  console.warn("MangaMorph account sync unavailable:",error);
}