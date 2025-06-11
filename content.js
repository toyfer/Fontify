// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// ...ページ内のフォントを置換するスクリプト...

// ストレージからWebフォントURLと除外リストを取得し、除外対象でなければフォントを適用
(async function() {
  const url = location.href;
  const storage = await browser.storage.local.get(["fontUrl", "excludeUrls"]);
  const fontUrl = storage.fontUrl || "";
  const excludeUrls = storage.excludeUrls || [];

  // 除外URLに一致する場合は何もしない
  if (excludeUrls.some(ex => url.startsWith(ex))) return;

  if (fontUrl) {
    // フォントキャッシュ取得・保存関数
    async function getCachedFontDataUrl(fontUrl) {
      const cacheKey = 'fontCache_' + fontUrl;
      const cache = await browser.storage.local.get(cacheKey);
      if (cache[cacheKey]) {
        return cache[cacheKey];
      } else {
        try {
          const res = await fetch(fontUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          return await new Promise((resolve, reject) => {
            reader.onload = async function() {
              const dataUrl = reader.result;
              await browser.storage.local.set({ [cacheKey]: dataUrl });
              resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      }
    }

    let fontDataUrl = null;
    // Google FontsなどCSS参照の場合はキャッシュせずlinkで読み込み
    if (fontUrl.match(/\.woff2?$|\.ttf$|\.otf$/i)) {
      fontDataUrl = await getCachedFontDataUrl(fontUrl);
    }

    if (fontDataUrl) {
      // @font-faceでDataURLを使う
      const style = document.createElement("style");
      style.textContent = `@font-face { font-family: 'CustomFont'; src: url('${fontDataUrl}'); }
* { font-family: 'CustomFont', sans-serif !important; }`;
      document.head.appendChild(style);
    } else {
      // 通常のlink参照
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl;
      document.head.appendChild(link);
      const style = document.createElement("style");
      style.textContent = `* { font-family: 'CustomFont', sans-serif !important; }`;
      document.head.appendChild(style);
    }
  }
})();
