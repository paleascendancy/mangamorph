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

/* Mobile layout repair: prevent the whole page from sliding sideways. */
html,body.mm-home{max-width:100%;overflow-x:hidden!important}
body.mm-home main,body.mm-home .topbar,body.mm-home .hero-feature,body.mm-home .catalog-section,body.mm-home .releases-section{width:100%;max-width:100%;min-width:0}
body.mm-home .catalog-section{overflow:hidden!important;min-height:0!important}
body.mm-home .catalog-section::before{display:none!important;content:none!important}
body.mm-home .section-heading,body.mm-home .section-heading>div:first-child{min-width:0;max-width:100%}
body.mm-home .section-heading h2,body.mm-home .section-description{overflow-wrap:anywhere}
body.mm-home .horizontal-rail{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-inline:contain!important;-webkit-overflow-scrolling:touch}

/* Compact card footer: only chapter + favorite are kept below the cover. */
body.mm-home .premium-manga-card .manga-info{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.38rem!important;min-height:0!important;padding:.42rem .48rem!important}
body.mm-home .premium-card-chips{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:.3rem!important;flex:1 1 auto!important;min-width:0!important}
body.mm-home .premium-card-chip:not(.chapter){display:none!important}
body.mm-home .premium-card-chip.chapter{height:1.34rem!important;min-width:0!important;max-width:100%!important;padding:0 .4rem!important;border-radius:999px!important;font-size:.49rem!important;font-weight:800!important;line-height:1!important}
body.mm-home .premium-card-footer{display:flex!important;align-items:center!important;justify-content:flex-end!important;grid-template-columns:none!important;gap:.26rem!important;flex:0 0 auto!important}
body.mm-home .premium-card-stat{display:none!important}
body.mm-home .premium-manga-card .favorite-button{width:1.48rem!important;height:1.48rem!important;min-width:1.48rem!important;border-radius:.48rem!important;font-size:.72rem!important}

/* Fix the thin broken rim above cards caused by layered legacy card styles. */
body.mm-home .premium-manga-card{position:relative!important;overflow:hidden!important;isolation:isolate!important;border:1px solid rgba(50,67,91,.08)!important;border-radius:1rem!important;background:#fff!important;background-clip:padding-box!important;box-shadow:0 10px 24px rgba(50,65,87,.09)!important;clip-path:inset(0 round 1rem)!important}
body.mm-home .premium-manga-card::before,body.mm-home .premium-manga-card::after{content:none!important;display:none!important}
body.mm-home .premium-manga-card .manga-cover{width:100%!important;margin:0!important;border:0!important;outline:0!important;border-radius:1rem 1rem 0 0!important;box-shadow:none!important;clip-path:inset(0 round 1rem 1rem 0 0)!important}
body.mm-home .premium-manga-card .manga-cover::after{inset:0!important;border:0!important;border-radius:inherit!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)!important}
body.mm-home .premium-manga-card .manga-info{margin:0!important;border:0!important;border-radius:0 0 1rem 1rem!important;box-shadow:none!important}

@media(max-width:620px){
 .catalog-section .section-heading>div:first-child{padding-left:2.7rem;min-height:2.35rem}
 .catalog-section .section-heading>div:first-child::before{width:2rem;height:2rem;border-radius:.7rem;font-size:.86rem}
 .catalog-section .section-heading h2,.releases-section .section-heading h2{font-size:clamp(1.42rem,6.9vw,1.92rem)!important;line-height:1.02!important}
 .catalog-section .section-description,.releases-section .section-description{font-size:.68rem!important;max-width:16rem!important}
 .rank-arrow-button{width:2.35rem!important;height:2.35rem!important;min-width:2.35rem!important;font-size:.78rem!important}
 body.mm-home .catalog-section{padding:1rem .78rem!important;margin:0!important}
 body.mm-home .catalog-section+.catalog-section{margin-top:0!important}
 body.mm-home .horizontal-rail{padding:.18rem 0 .32rem!important;gap:.62rem!important}
 body.mm-home .premium-manga-card{align-self:start!important;border-radius:1rem!important;clip-path:inset(0 round 1rem)!important;transform:translateZ(0)!important;-webkit-mask-image:-webkit-radial-gradient(white,black)!important}
 body.mm-home .premium-manga-card .manga-cover{border-radius:1rem 1rem 0 0!important;clip-path:inset(0 round 1rem 1rem 0 0)!important}
 body.mm-home .premium-manga-card .manga-info{padding:.38rem .42rem!important;gap:.28rem!important}
 body.mm-home .premium-card-chip.chapter{height:1.26rem!important;padding:0 .36rem!important;font-size:.46rem!important}
 body.mm-home .premium-manga-card .favorite-button{width:1.4rem!important;height:1.4rem!important;min-width:1.4rem!important;font-size:.68rem!important}
}
`;
document.head.append(style);
