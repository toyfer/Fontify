// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// ページ内のフォントを置換するスクリプト

// URL除外判定関数
function isUrlExcluded(currentUrl, excludeUrls) {
  if (!currentUrl || !excludeUrls || excludeUrls.length === 0) {
    return false;
  }
  
  return excludeUrls.some(excludePattern => {
    // 後方互換性: 文字列の場合は新しいオブジェクト形式に変換
    let exclusion;
    if (typeof excludePattern === 'string') {
      exclusion = {
        url: excludePattern,
        type: inferExclusionType(excludePattern)
      };
    } else {
      exclusion = excludePattern;
    }
    
    return matchesExclusion(currentUrl, exclusion);
  });
}

// 除外パターンの種類を推測
function inferExclusionType(url) {
  try {
    const urlObj = new URL(url);
    // パスが '/' で終わっているか、パスがない場合はドメインレベル
    if (urlObj.pathname === '/' || urlObj.pathname === '') {
      return 'domain';
    }
    // パスが '/' で終わっている場合はプレフィックス
    if (urlObj.pathname.endsWith('/')) {
      return 'prefix';  
    }
    // それ以外は完全一致
    return 'exact';
  } catch (e) {
    // URL解析に失敗した場合はプレフィックスマッチにフォールバック
    return 'prefix';
  }
}

// 除外条件とのマッチング
function matchesExclusion(currentUrl, exclusion) {
  try {
    const currentUrlObj = new URL(currentUrl);
    const excludeUrlObj = new URL(exclusion.url);
    
    switch (exclusion.type) {
      case 'exact':
        // 完全一致（クエリパラメータとフラグメントは除外）
        return (currentUrlObj.origin + currentUrlObj.pathname) === 
               (excludeUrlObj.origin + excludeUrlObj.pathname);
               
      case 'domain':
        // ドメインレベルマッチング（サブドメインも含む）
        return currentUrlObj.hostname === excludeUrlObj.hostname ||
               currentUrlObj.hostname.endsWith('.' + excludeUrlObj.hostname);
               
      case 'prefix':
        // プレフィックスマッチング（より厳密に）
        return currentUrlObj.origin === excludeUrlObj.origin &&
               currentUrlObj.pathname.startsWith(excludeUrlObj.pathname);
               
      default:
        // フォールバック: 従来のstartsWith動作
        return currentUrl.startsWith(exclusion.url);
    }
  } catch (e) {
    // URL解析に失敗した場合は従来のstartsWith動作にフォールバック
    console.warn('Fontify: URL parsing failed, using fallback matching:', e);
    return currentUrl.startsWith(exclusion.url);
  }
}

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
  if (isUrlExcluded(url, excludeUrls)) return;

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
      
      // より高い優先度を確保するため、styleをheadの最後に挿入し、より具体的なセレクターを使用
      const specificSelectors = [
        'html *',
        'body *', 
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'ul', 'li', 'table', 'td', 'th', 'form', 'input', 'button'
      ].join(', ');
      
      if (fontDataUrl) {
        // @font-faceでDataURLを使う
        style.textContent = `
          @font-face { 
            font-family: 'FontifyCustomFont'; 
            src: url('${fontDataUrl}'); 
            font-display: swap;
          }
          ${specificSelectors} { 
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
        const existingLink = document.getElementById('fontify-custom-link');
        if (existingLink) {
          existingLink.remove();
        }
        
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fontUrl;
        link.id = 'fontify-custom-link';
        document.head.appendChild(link);
        
        style.textContent = `
          ${specificSelectors} { 
            font-family: 'FontifyCustomFont', sans-serif !important;
            font-weight: ${fontWeight} !important;
            line-height: ${lineHeight} !important;
          }
          html {
            font-size: ${fontSizeScale * 100}% !important;
          }
        `;
      }
      
      // スタイルをheadの最後に挿入して、他のスタイルシートより後に読み込まれるようにする
      document.head.appendChild(style);
    }

    // DOM ready状態チェック
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyFont);
    } else {
      applyFont();
    }

    // 新しいスタイルシートの監視とフォント再適用
    function setupStylesheetMonitoring() {
      let stylesheetTimeout;
      
      // MutationObserverでスタイルシートの追加を監視
      const stylesheetObserver = new MutationObserver((mutations) => {
        let newStylesheetAdded = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // link[rel="stylesheet"]またはstyle要素の追加を検出
                if ((node.tagName === 'LINK' && node.rel === 'stylesheet') || 
                    node.tagName === 'STYLE') {
                  // 自分自身のスタイルは除外
                  if (node.id !== 'fontify-custom-font' && node.id !== 'fontify-custom-link') {
                    newStylesheetAdded = true;
                  }
                }
                // 子要素にスタイルシートが含まれている可能性もチェック
                const childLinks = node.querySelectorAll && node.querySelectorAll('link[rel="stylesheet"], style');
                if (childLinks && childLinks.length > 0) {
                  newStylesheetAdded = true;
                }
              }
            });
          }
        });
        
        if (newStylesheetAdded) {
          console.log('Fontify: New stylesheet detected, reapplying font');
          // 少し遅延してから再適用（新しいスタイルシートが完全に適用されるのを待つ）
          clearTimeout(stylesheetTimeout);
          stylesheetTimeout = setTimeout(() => {
            applyFont();
          }, 100);
        }
      });
      
      // headを監視（スタイルシートは通常headに追加される）
      if (document.head) {
        stylesheetObserver.observe(document.head, {
          childList: true,
          subtree: true
        });
      }
    }

    // スタイルシート監視を開始
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupStylesheetMonitoring);
    } else {
      setupStylesheetMonitoring();
    }

    // 定期的なフォント再適用（フォールバック機能）
    // 一部のWebサイトでは動的にCSSが変更される場合があるため
    let periodicCheckCount = 0;
    const maxPeriodicChecks = 10; // 最大10回まで（50秒間）
    const periodicInterval = setInterval(() => {
      periodicCheckCount++;
      
      // 拡張機能のスタイルが存在するかチェック
      const currentStyle = document.getElementById('fontify-custom-font');
      if (!currentStyle || !document.head.contains(currentStyle)) {
        console.log('Fontify: Style missing, reapplying font');
        applyFont();
      } else {
        // スタイルがheadの最後にない場合、再配置して優先度を確保
        const headChildren = Array.from(document.head.children);
        const isLastElement = headChildren[headChildren.length - 1] === currentStyle;
        if (!isLastElement) {
          console.log('Fontify: Repositioning style for higher priority');
          applyFont();
        }
      }
      
      // 一定回数後は停止（パフォーマンス考慮）
      if (periodicCheckCount >= maxPeriodicChecks) {
        clearInterval(periodicInterval);
      }
    }, 5000); // 5秒ごと

  }
})();
