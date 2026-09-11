import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const mangaId=Number(new URLSearchParams(location.search).get("id"))||1;

const style=document.createElement("style");
style.id="mangamorphChapterSourceStyles";
style.textContent=`
  .chapter-source-line{display:flex;align-items:center;gap:.38rem;flex-wrap:wrap;margin-top:.28rem}
  .chapter-source-badge{display:inline-flex;align-items:center;gap:.28rem;max-width:100%;padding:.2rem .42rem;border:1px solid rgba(76,139,255,.2);border-radius:999px;background:rgba(76,139,255,.08);color:#4f83d4;font-size:.68rem;font-weight:750;line-height:1.25}
  .chapter-source-badge::before{content:"SCAN";font-size:.52rem;font-weight:900;letter-spacing:.08em;opacity:.65}
  .chapter-source-credit{color:#7d8796;font-size:.66rem;line-height:1.35}
  body:not(.light) .chapter-source-badge{color:#8db7ff;background:rgba(76,139,255,.12);border-color:rgba(115,167,255,.24)}
  body:not(.light) .chapter-source-credit{color:#8291a6}
  @media(max-width:560px){.chapter-source-line{gap:.3rem}.chapter-source-badge{font-size:.62rem}.chapter-source-credit{font-size:.6rem}}
`;
document.head.append(style);

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function chapterKey(value){const n=Number(value);return Number.isFinite(n)?String(n):String(value||"")}

try{
  const {data,error}=await db.from("mangamorph_chapters")
    .select("chapter_number,source_name,source_credit,source_url")
    .eq("manga_id",mangaId)
    .eq("published",true);
  if(error)throw error;

  const byChapter=new Map((data||[]).map(row=>[chapterKey(row.chapter_number),row]));

  const apply=()=>{
    document.querySelectorAll(".chapter-row").forEach(row=>{
      if(row.querySelector(".chapter-source-line"))return;
      const id=String(row.id||"");
      const match=id.match(/^capitulo-(.+)$/);
      if(!match)return;
      const source=byChapter.get(chapterKey(match[1]));
      if(!source?.source_name)return;
      const numberBox=row.querySelector(".chapter-number");
      if(!numberBox)return;
      const line=document.createElement("span");
      line.className="chapter-source-line";
      const url=String(source.source_url||"");
      const label='<span class="chapter-source-badge">'+esc(source.source_name)+'</span>';
      const credit=source.source_credit?'<span class="chapter-source-credit">'+esc(source.source_credit)+'</span>':'';
      line.innerHTML=label+credit;
      if(/^https:\/\//i.test(url)){
        line.title="Capítulo fornecido por "+source.source_name;
      }
      numberBox.append(line);
    });
  };

  apply();
  const list=document.querySelector("#chapterList");
  if(list)new MutationObserver(apply).observe(list,{childList:true,subtree:true});
}catch(error){
  console.error("MangaMorph chapter source:",error);
}
