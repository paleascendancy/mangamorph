(() => {
  "use strict";

  if (window.__MANGAMORPH_READER_RELIABILITY_V1__) return;
  window.__MANGAMORPH_READER_RELIABILITY_V1__ = true;

  const params = new URLSearchParams(location.search);
  const mangaId = Number(params.get("id"));
  const chapterRaw = params.get("chapter");
  const chapterNumber = chapterRaw === null || chapterRaw === "" ? 1 : Number(chapterRaw);

  if (!Number.isInteger(mangaId) || mangaId < 1) {
    location.replace("index.html");
    return;
  }
  if (!Number.isFinite(chapterNumber) || chapterNumber < 0) {
    location.replace(`manga.html?id=${mangaId}`);
    return;
  }

  const stage = document.querySelector("#readerStage");
  if (!stage) return;

  const RETRY_DELAYS = [650, 1800];
  const IMAGE_TIMEOUT_MS = 22000;
  const MAX_AUTO_RETRIES = RETRY_DELAYS.length;
  const state = new WeakMap();
  let failureCount = 0;
  let bannerTimer = 0;

  function injectStyles() {
    if (document.querySelector("#readerReliabilityStyles")) return;
    const style = document.createElement("style");
    style.id = "readerReliabilityStyles";
    style.textContent = `
      .reader-real-page{position:relative;min-height:3.5rem}
      .reader-real-page.is-mm-retrying{min-height:12rem;background:linear-gradient(110deg,rgba(95,117,147,.055) 25%,rgba(95,117,147,.11) 38%,rgba(95,117,147,.055) 52%);background-size:220% 100%;animation:mmReaderPagePulse 1.4s linear infinite}
      .reader-real-page.is-mm-retrying>img{opacity:.02}
      .mm-reader-page-state{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:.35rem;min-height:9rem;padding:1rem;text-align:center;pointer-events:none;color:#718096}
      .mm-reader-page-state strong{color:#314057;font-size:.72rem}.mm-reader-page-state small{font-size:.58rem}
      .reader-real-page.mm-reader-page-failed{display:grid!important;place-items:center;min-height:15rem;padding:1rem!important;background:rgba(95,117,147,.055)}
      .mm-reader-page-fallback{width:min(100%,32rem);display:grid;gap:.5rem;justify-items:center;padding:1.2rem;border:1px solid rgba(91,126,169,.18);border-radius:1rem;background:rgba(255,255,255,.7);text-align:center;color:#66758a}
      .mm-reader-page-fallback>span{font-size:.48rem;font-weight:900;letter-spacing:.13em;color:#7890ad}.mm-reader-page-fallback>strong{color:#1f2937;font-size:.9rem}.mm-reader-page-fallback>p{max-width:28rem;margin:0;font-size:.65rem;line-height:1.55}
      .mm-reader-page-fallback button{min-height:2.35rem;padding:0 .8rem;border:1px solid rgba(64,105,157,.18);border-radius:.7rem;background:#1f2f45;color:#fff;font-weight:800;cursor:pointer}
      .mm-reader-health{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin:0 clamp(.7rem,3vw,1.1rem) .55rem;padding:.58rem .7rem;border:1px solid rgba(79,121,173,.13);border-radius:.8rem;background:rgba(88,123,166,.055);color:#697a90;font-size:.58rem}
      .mm-reader-health[hidden]{display:none!important}.mm-reader-health strong{color:#34465f}.mm-reader-health button{min-height:2rem;padding:0 .65rem;border:1px solid rgba(70,112,164,.18);border-radius:.58rem;background:transparent;color:#44688f;font-weight:800;cursor:pointer}
      .mm-reader-network{position:fixed;left:50%;top:4.2rem;z-index:90;transform:translateX(-50%);max-width:calc(100vw - 1.2rem);padding:.48rem .75rem;border-radius:999px;background:#2a3442;color:#fff;font-size:.58rem;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.2)}
      .light-reader .mm-reader-page-fallback{background:rgba(255,255,255,.94)}
      body:not(.light-reader) .mm-reader-page-fallback{background:#111a25;color:#8ea0b7}body:not(.light-reader) .mm-reader-page-fallback>strong{color:#edf4ff}
      @keyframes mmReaderPagePulse{to{background-position:-220% 0}}
      @media(max-width:560px){.reader-real-page.mm-reader-page-failed{min-height:12rem}.mm-reader-page-fallback{padding:1rem .75rem}.mm-reader-health{align-items:flex-start;flex-direction:column}.mm-reader-health button{width:100%}}
      @media(prefers-reduced-motion:reduce){.reader-real-page.is-mm-retrying{animation:none}}
    `;
    document.head.append(style);
  }

  function originalUrl(img) {
    return img.dataset.mmOriginalSrc || img.currentSrc || img.src || "";
  }

  function retryUrl(raw) {
    try {
      const url = new URL(raw, location.href);
      if (!/^https?:$/.test(url.protocol)) return raw;
      url.searchParams.set("mm_retry", String(Date.now()));
      return url.toString();
    } catch {
      return raw;
    }
  }

  function getState(img) {
    let value = state.get(img);
    if (!value) {
      value = { attempts: 0, timer: 0, failed: false };
      state.set(img, value);
    }
    return value;
  }

  function clearImageTimer(img) {
    const value = state.get(img);
    if (value?.timer) {
      clearTimeout(value.timer);
      value.timer = 0;
    }
  }

  function setImageWatchdog(img) {
    clearImageTimer(img);
    const value = getState(img);
    value.timer = window.setTimeout(() => {
      if (!img.isConnected || (img.complete && img.naturalWidth > 0)) return;
      handleImageFailure(img, "timeout");
    }, IMAGE_TIMEOUT_MS);
  }

  function removeTransientState(figure) {
    figure?.classList.remove("is-mm-retrying");
    figure?.querySelector(":scope > .mm-reader-page-state")?.remove();
  }

  function showRetrying(figure, attempt) {
    if (!figure) return;
    figure.classList.add("is-mm-retrying");
    let node = figure.querySelector(":scope > .mm-reader-page-state");
    if (!node) {
      node = document.createElement("div");
      node.className = "mm-reader-page-state";
      figure.append(node);
    }
    node.innerHTML = `<strong>Reconectando esta página…</strong><small>Tentativa ${attempt} de ${MAX_AUTO_RETRIES}</small>`;
  }

  function healthNode() {
    let node = document.querySelector("#readerHealthNotice");
    if (node) return node;
    node = document.createElement("div");
    node.id = "readerHealthNotice";
    node.className = "mm-reader-health";
    node.hidden = true;
    const progress = document.querySelector(".reader-progress-shell");
    progress?.insertAdjacentElement("afterend", node);
    return node;
  }

  function refreshHealth() {
    const node = healthNode();
    const failed = [...stage.querySelectorAll(".mm-reader-page-failed")];
    failureCount = failed.length;
    if (!failureCount) {
      node.hidden = true;
      node.replaceChildren();
      return;
    }
    node.hidden = false;
    node.innerHTML = `<div><strong>${failureCount} página${failureCount === 1 ? "" : "s"} não carregou${failureCount === 1 ? "" : "aram"}</strong><br><span>O restante do capítulo continua disponível.</span></div><button type="button" data-mm-retry-failed>Carregar novamente</button>`;
  }

  function renderPageFailure(figure, img) {
    if (!figure) return;
    clearImageTimer(img);
    removeTransientState(figure);
    figure.classList.add("mm-reader-page-failed", "is-loaded");
    const page = figure.dataset.readerPage || "?";
    const raw = originalUrl(img);
    figure.dataset.mmFailedSrc = raw;
    figure.innerHTML = `
      <div class="mm-reader-page-fallback" role="status">
        <span>PÁGINA ${String(page).padStart(2, "0")}</span>
        <strong>Imagem temporariamente indisponível</strong>
        <p>Você pode continuar lendo. Esta página pode ser carregada novamente sem atualizar o capítulo inteiro.</p>
        <button type="button" data-mm-retry-page>Tentar novamente</button>
      </div>`;
    refreshHealth();
  }

  function retryFigure(figure, manual = false) {
    if (!figure) return;
    const raw = figure.dataset.mmFailedSrc;
    if (!raw) return;
    figure.classList.remove("mm-reader-page-failed", "is-loaded");
    figure.replaceChildren();
    const img = document.createElement("img");
    img.dataset.mmOriginalSrc = raw;
    img.alt = `Página ${figure.dataset.readerPage || ""} do capítulo ${chapterNumber}`;
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
    const value = getState(img);
    value.attempts = manual ? 0 : value.attempts;
    figure.append(img);
    showRetrying(figure, 1);
    img.src = retryUrl(raw);
    setImageWatchdog(img);
  }

  function handleImageFailure(img, reason = "error") {
    if (!(img instanceof HTMLImageElement)) return;
    const figure = img.closest(".reader-real-page");
    if (!figure) return;
    const value = getState(img);
    if (value.failed) return;
    clearImageTimer(img);

    if (navigator.onLine && value.attempts < MAX_AUTO_RETRIES) {
      value.attempts += 1;
      showRetrying(figure, value.attempts);
      const delay = RETRY_DELAYS[value.attempts - 1] || 1200;
      window.setTimeout(() => {
        if (!img.isConnected) return;
        img.src = retryUrl(originalUrl(img));
        setImageWatchdog(img);
      }, delay);
      return;
    }

    value.failed = true;
    renderPageFailure(figure, img);
    if (reason === "timeout") showNetworkHint("Uma imagem demorou demais para responder. O restante da leitura continua disponível.");
  }

  function prepareImage(img, index = 999) {
    if (!(img instanceof HTMLImageElement) || img.dataset.mmReliabilityBound === "1") return;
    img.dataset.mmReliabilityBound = "1";
    img.dataset.mmOriginalSrc = img.getAttribute("src") || img.currentSrc || img.src || "";
    if (index < 3) {
      img.loading = "eager";
      img.fetchPriority = index === 0 ? "high" : "auto";
    } else {
      img.loading = "lazy";
      img.fetchPriority = "low";
    }
    if (img.complete) {
      if (img.naturalWidth > 0) {
        img.closest(".reader-real-page")?.classList.add("is-loaded");
      } else if (img.src) {
        queueMicrotask(() => handleImageFailure(img));
      }
    } else {
      setImageWatchdog(img);
    }
  }

  function scanImages() {
    [...stage.querySelectorAll(".reader-real-page img")].forEach(prepareImage);
  }

  function showNetworkHint(text) {
    let node = document.querySelector("#readerNetworkHint");
    if (!node) {
      node = document.createElement("div");
      node.id = "readerNetworkHint";
      node.className = "mm-reader-network";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.textContent = text;
    node.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => {
      node.hidden = true;
    }, 4200);
  }

  injectStyles();

  stage.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".reader-real-page")) return;
    event.stopImmediatePropagation();
    handleImageFailure(img);
  }, true);

  stage.addEventListener("load", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".reader-real-page")) return;
    clearImageTimer(img);
    const value = getState(img);
    value.failed = false;
    removeTransientState(img.closest(".reader-real-page"));
    img.closest(".reader-real-page")?.classList.add("is-loaded");
  }, true);

  stage.addEventListener("click", event => {
    const retry = event.target.closest("[data-mm-retry-page]");
    if (!retry) return;
    event.preventDefault();
    retryFigure(retry.closest(".reader-real-page"), true);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest("[data-mm-retry-failed]")) return;
    event.preventDefault();
    [...stage.querySelectorAll(".mm-reader-page-failed")].slice(0, 12).forEach(figure => retryFigure(figure, true));
    refreshHealth();
  });

  const observer = new MutationObserver(() => scanImages());
  observer.observe(stage, { childList: true, subtree: true });
  scanImages();

  window.addEventListener("offline", () => showNetworkHint("Sem internet. As páginas já carregadas continuam disponíveis."));
  window.addEventListener("online", () => {
    showNetworkHint("Conexão restaurada. Tentando recuperar páginas pendentes…");
    [...stage.querySelectorAll(".mm-reader-page-failed")].slice(0, 8).forEach(figure => retryFigure(figure, true));
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scanImages();
  });
})();
