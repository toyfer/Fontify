// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// ページ内のフォントを置換するスクリプト

// ストレージからWebフォントURLと除外リストを取得し、除外対象でなければフォントを適用
(async function() {
  const url = location.href;
  const storage = await browser.storage.local.get([
    "fontUrl", "excludeUrls", "isEnabled", "fontSizeScale", "fontWeight", "lineHeight"
  ]);
  const fontUrl = storage.fontUrl || "";
  const excludeUrls = storage.excludeUrls || [];
  const isEnabled = storage.isEnabled !== false; // Default to true
  const fontSizeScale = storage.fontSizeScale || 1.0;
  const fontWeight = storage.fontWeight || 'normal';
  const lineHeight = storage.lineHeight || 1.5;

  // フォントが無効化されている場合は何もしない
  if (!isEnabled) return;

  // 除外URLに一致する場合は何もしない
  if (excludeUrls.some(ex => url.startsWith(ex))) return;

  if (fontUrl) {
    // フォントキャッシュ取得・保存関数
    async function getCachedFontDataUrl(fontUrl) {
      const cacheKey = 'fontCache_' + fontUrl;
      
      try {
        const cache = await browser.storage.local.get(cacheKey);
        if (cache[cacheKey]) {
          console.log('Font loaded from cache:', fontUrl);
          return cache[cacheKey];
        }
        
        console.log('Fetching font from URL:', fontUrl);
        const res = await fetch(fontUrl);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const blob = await res.blob();
        const reader = new FileReader();
        
        return await new Promise((resolve, reject) => {
          reader.onload = async function() {
            try {
              const dataUrl = reader.result;
              await browser.storage.local.set({ [cacheKey]: dataUrl });
              console.log('Font cached successfully:', fontUrl);
              resolve(dataUrl);
            } catch (error) {
              console.error('Error caching font:', error);
              resolve(reader.result); // Still return the font even if caching fails
            }
          };
          reader.onerror = () => {
            console.error('Error reading font blob');
            reject(new Error('Failed to read font data'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Font loading error for', fontUrl, ':', error);
        
        // Try to show user-friendly error in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('Fontify: Failed to load font from', fontUrl, 'Error:', error.message);
        }
        
        return null;
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
            font-weight: ${fontWeight} !important;
            line-height: ${lineHeight} !important;
          }
          html {
            font-size: ${fontSizeScale * 100}% !important;
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
            font-weight: ${fontWeight} !important;
            line-height: ${lineHeight} !important;
          }
          html {
            font-size: ${fontSizeScale * 100}% !important;
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
