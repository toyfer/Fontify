// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// ページ内のフォントを置換するスクリプト

// ストレージからWebフォントURLと除外リストを取得し、除外対象でなければフォントを適用
(async function() {
  const url = location.href;
  const storage = await browser.storage.local.get(["fontUrl", "excludeUrls", "isEnabled"]);
  const fontUrl = storage.fontUrl || "";
  const excludeUrls = storage.excludeUrls || [];
  const isEnabled = storage.isEnabled !== false; // Default to true

  // フォントが無効化されている場合は何もしない
  if (!isEnabled) return;

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
          console.error('Font loading error:', e);
          return null;
        }
      }
    }

    let fontDataUrl = null;
    // Google FontsなどCSS参照の場合はキャッシュせずlinkで読み込み
    if (fontUrl.match(/\.woff2?$|\.ttf$|\.otf$/i)) {
      fontDataUrl = await getCachedFontDataUrl(fontUrl);
    }

    // フォント適用の関数
    function applyFont() {
      // 既存のスタイルを削除
      const existingStyle = document.getElementById('fontify-custom-font');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement("style");
      style.id = 'fontify-custom-font';
      
      if (fontDataUrl) {
        // @font-faceでDataURLを使う
        style.textContent = `
          @font-face { 
            font-family: 'FontifyCustomFont'; 
            src: url('${fontDataUrl}'); 
            font-display: swap;
          }
          * { 
            font-family: 'FontifyCustomFont', sans-serif !important; 
          }
        `;
      } else {
        // 通常のlink参照
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fontUrl;
        link.id = 'fontify-custom-link';
        document.head.appendChild(link);
        
        style.textContent = `
          * { 
            font-family: 'FontifyCustomFont', sans-serif !important; 
          }
        `;
      }
      
      document.head.appendChild(style);
    }

    // DOM ready状態チェック
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyFont);
    } else {
      applyFont();
    }

    // 動的に追加される要素にも対応
    const observer = new MutationObserver((mutations) => {
      let shouldReapply = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldReapply = true;
        }
      });
      
      if (shouldReapply) {
        // デバウンス処理で頻繁な再適用を防ぐ
        clearTimeout(window.fontifyReapplyTimeout);
        window.fontifyReapplyTimeout = setTimeout(() => {
          // 新しく追加された要素に対してフォントを再適用
          const existingStyle = document.getElementById('fontify-custom-font');
          if (existingStyle) {
            existingStyle.remove();
            applyFont();
          }
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
