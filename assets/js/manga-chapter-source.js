import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK"
);

const mangaId=Number(new URLSearchParams(location.search).get("id"))||1;

const style=document.createElement("style");
style.id="mangamorphChapterSourceStyles";
style.textContent=`
  .chapter-list{gap:.56rem!important}
  .chapter-row{grid-template-columns:minmax(0,1fr) auto!important;gap:.85rem!important;align-items:center!important;min-height:5.35rem;padding:.78rem .82rem!important;border-radius:1rem!important}
  .chapter-copy{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:.55rem!important;min-width:0!important}
  .chapter-number{min-width:0!important;width:100%!important}
  .chapter-number>strong{display:block!important;font-size:.82rem!important;line-height:1.25!important;letter-spacing:-.015em}
  .chapter-number .chapter-meta-line{display:flex!important;align-items:center!important;gap:.42rem!important;min-width:0!important;margin-top:.28rem!important;color:#758195!important;font-size:.62rem!important;line-height:1.35!important}
  .chapter-number .chapter-meta-line>span{display:inline-flex!important;align-items:center!important;min-width:0!important;margin:0!important;color:inherit!important;font-size:inherit!important}
  .chapter-number .chapter-meta-line>span:first-child{flex:0 0 auto;white-space:nowrap}
  .chapter-number .chapter-meta-line>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chapter-badge{align-self:start!important;margin-top:.02rem!important}
  .chapter-read{min-width:4.6rem!important;min-height:2.65rem!important;padding:0 .78rem!important;border-radius:.72rem!important;font-size:.68rem!important;white-space:nowrap!important}
  .chapter-source-line{display:flex!important;align-items:center!important;gap:.38rem!important;flex-wrap:wrap!important;margin-top:.42rem!important;min-width:0!important}
  .chapter-number .chapter-source-line>.chapter-source-badge{display:inline-flex!important;width:auto!important;max-width:100%!important;align-items:center!important;gap:.3rem!important;margin:0!important;padding:.25rem .5rem!important;border:1px solid rgba(76,139,255,.2)!important;border-radius:999px!important;background:rgba(76,139,255,.08)!important;color:#4f83d4!important;font-size:.63rem!important;font-weight:800!important;line-height:1.2!important;white-space:nowrap!important}
  .chapter-source-badge::before{content:"SCAN";font-size:.48rem;font-weight:900;letter-spacing:.08em;opacity:.62}
  .chapter-number .chapter-source-line>.chapter-source-credit{display:inline!important;margin:0!important;color:#7d8796!important;font-size:.61rem!important;line-height:1.35!important}
  body:not(.light) .chapter-number .chapter-source-line>.chapter-source-badge{color:#8db7ff!important;background:rgba(76,139,255,.12)!important;border-color:rgba(115,167,255,.24)!important}
  body:not(.light) .chapter-number .chapter-source-line>.chapter-source-credit{color:#8291a6!important}
  @media(max-width:560px){
    .chapter-list{gap:.5rem!important}
    .chapter-row{gap:.58rem!important;min-height:5rem;padding:.72rem .72rem!important;border-radius:.92rem!important}
    .chapter-copy{gap:.4rem!important}
    .chapter-number>strong{font-size:.78rem!important}
    .chapter-number .chapter-meta-line{gap:.34rem!important;font-size:.58rem!important}
    .chapter-number .chapter-meta-line>span:nth-child(2){max-width:38vw}
    .chapter-source-line{gap:.3rem!important;margin-top:.36rem!important}
    .chapter-number .chapter-source-line>.chapter-source-badge{font-size:.59rem!important;padding:.23rem .44rem!important}
    .chapter-number .chapter-source-line>.chapter-source-credit{font-size:.57rem!important}
    .chapter-read{min-width:4.25rem!important;min-height:2.55rem!important;padding:0 .68rem!important}
  }
  @media(min-width:900px){
    .chapter-row{padding:.88rem 1rem!important;min-height:5.65rem}
    .chapter-number>strong{font-size:.88rem!important}
    .chapter-number .chapter-meta-line{font-size:.66rem!important}
    .chapter-read{min-width:5.2rem!important}
  }
`;
document.head.append(style);

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function chapterKey(value){const n=Number(value);return Number.isFinite(n)?String(n):String(value||"")}
function norm(value){return String(value||"").trim().toLocaleLowerCase("pt-BR").replace(/[^a-z0-9áàâãéêíóôõúç]+/gi,"")}
function shortDate(value){
  if(!value)return"";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return"";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(date).replace(/\./g,"");
}

try{
  const {data,error}=await db.from("mangamorph_chapters")
    .select("chapter_number,published_at,source_name,source_credit,source_url")
    .eq("manga_id",mangaId)
    .eq("published",true);
  if(error)throw error;

  const byChapter=new Map((data||[]).map(row=>[chapterKey(row.chapter_number),row]));

  const apply=()=>{
    document.querySelectorAll(".chapter-row").forEach(row=>{
      const id=String(row.id||"");
      const match=id.match(/^capitulo-(.+)$/);
      if(!match)return;
      const source=byChapter.get(chapterKey(match[1]));
      const numberBox=row.querySelector(".chapter-number");
      if(!numberBox)return;

      const dateNode=numberBox.querySelector(".chapter-meta-line>span:first-child");
      const dateText=shortDate(source?.published_at);
      if(dateNode&&dateText)dateNode.textContent="◷ "+dateText;

      if(row.querySelector(".chapter-source-line")||!source?.source_name)return;
      const line=document.createElement("span");
      line.className="chapter-source-line";
      const url=String(source.source_url||"");
      const duplicateCredit=norm(source.source_credit)===norm(source.source_name);
      const label='<span class="chapter-source-badge">'+esc(source.source_name)+'</span>';
      const credit=source.source_credit&&!duplicateCredit?'<span class="chapter-source-credit">'+esc(source.source_credit)+'</span>':'';
      line.innerHTML=label+credit;
      if(/^https:\/\//i.test(url))line.title="Capítulo fornecido por "+source.source_name;
      numberBox.append(line);
    });
  };

  apply();
  const list=document.querySelector("#chapterList");
  if(list)new MutationObserver(apply).observe(list,{childList:true,subtree:true});
}catch(error){
  console.error("MangaMorph chapter source:",error);
}

import("./manga-page-comments.js?v=001").catch(error=>console.error("MangaMorph comments:",error));
