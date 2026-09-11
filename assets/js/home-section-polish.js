const old=document.querySelector('#mangamorphHomeSectionPolish');
if(old)old.remove();
const style=document.createElement('style');
style.id='mangamorphHomeSectionPolish';
style.textContent=`
/* Premium section headers */
.catalog-section .section-heading>div:first-child{position:relative;padding-left:3.15rem;min-height:2.7rem;display:flex;flex-direction:column;justify-content:center}
.catalog-section .section-heading>div:first-child::before{content:"";position:absolute;left:0;top:50%;width:2.35rem;height:2.35rem;transform:translateY(-50%);display:grid;place-items:center;border-radius:.82rem;border:1px solid rgba(103,132,176,.14);background:linear-gradient(145deg,rgba(112,144,193,.12),rgba(255,255,255,.035));box-shadow:0 8px 20px rgba(25,41,66,.08),inset 0 1px 0 rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#6584ad;font:700 1rem/1 'Inter',system-ui,sans-serif}
#favoritadas .section-heading>div:first-child::before{content:"★"}
#populares .section-heading>div:first-child::before{content:"↗"}
#novas .section-heading>div:first-child::before{content:"＋"}
#recentes .section-heading>div:first-child::before{content:"◷"}
.catalog-section .section-heading h2,.releases-section .section-heading h2{font-family:'Manrope','Inter',system-ui,sans-serif!important;font-size:clamp(1.55rem,3.2vw,2.35rem)!important;line-height:1.02!important;letter-spacing:-.045em!important;font-weight:760!important}
.catalog-section .section-heading .eyebrow,.releases-section .section-heading .eyebrow{font-size:.55rem!important;letter-spacing:.18em!important}
.catalog-section .section-description,.releases-section .section-description{font-size:.76rem!important;line-height:1.45!important;margin-top:.28rem!important}
.rank-arrow-button{width:2.65rem!important;height:2.65rem!important;min-width:2.65rem!important;border-radius:999px!important;font-size:.88rem!important;display:grid!important;place-items:center!important;padding:0!important}
.rank-arrow-button:hover{transform:translateY(-1px) scale(1.02)!important}
body.light .catalog-section .section-heading>div:first-child::before{background:linear-gradient(145deg,#fff,#eef3f9);border-color:rgba(55,84,124,.10);color:#5d79a1;box-shadow:0 7px 18px rgba(53,72,99,.08),inset 0 1px 0 #fff}
body:not(.light) .catalog-section .section-heading>div:first-child::before{background:linear-gradient(145deg,rgba(95,129,182,.14),rgba(255,255,255,.025));border-color:rgba(126,158,207,.14);color:#9bb7dd}
@media(max-width:620px){
 .catalog-section .section-heading>div:first-child{padding-left:2.7rem;min-height:2.35rem}
 .catalog-section .section-heading>div:first-child::before{width:2rem;height:2rem;border-radius:.7rem;font-size:.86rem}
 .catalog-section .section-heading h2,.releases-section .section-heading h2{font-size:clamp(1.42rem,6.9vw,1.92rem)!important;line-height:1.02!important}
 .catalog-section .section-description,.releases-section .section-description{font-size:.68rem!important;max-width:16rem!important}
 .rank-arrow-button{width:2.35rem!important;height:2.35rem!important;min-width:2.35rem!important;font-size:.78rem!important}
}
`;
document.head.append(style);
