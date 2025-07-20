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
          clearTimeout(window.fontifyStylesheetTimeout);
          window.fontifyStylesheetTimeout = setTimeout(() => {
            applyFont();
          }, 100);
        }
      });
      
      // headとbody両方を監視（スタイルシートはheadに追加されることが多いが、bodyに追加される場合もある）
      if (document.head) {
        stylesheetObserver.observe(document.head, {
          childList: true,
          subtree: true
        });
      }
      
      if (document.body) {
        stylesheetObserver.observe(document.body, {
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
        // スタイルが最後の子要素でない場合、再適用して優先度を確保
        const headChildren = Array.from(document.head.children);
        const styleIndex = headChildren.indexOf(currentStyle);
        const lastStylesheetIndex = headChildren.reverse().findIndex(child => 
          (child.tagName === 'STYLE' || (child.tagName === 'LINK' && child.rel === 'stylesheet')) 
          && child.id !== 'fontify-custom-font' && child.id !== 'fontify-custom-link'
        );
        
        if (lastStylesheetIndex >= 0 && styleIndex < headChildren.length - 1 - lastStylesheetIndex) {
          console.log('Fontify: Reordering styles for higher priority');
          applyFont();
        }
      }
      
      // 一定回数後は停止（パフォーマンス考慮）
      if (periodicCheckCount >= maxPeriodicChecks) {
        clearInterval(periodicInterval);
      }
    }, 5000); // 5秒ごと

    // 動的に追加される要素にも対応（DOM要素の追加のみを監視）
    const elementObserver = new MutationObserver((mutations) => {
      let newElementsAdded = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 新しいDOM要素が追加された場合のみ反応
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.tagName !== 'STYLE' && 
                node.tagName !== 'LINK') {
              newElementsAdded = true;
            }
          });
        }
      });
      
      if (newElementsAdded) {
        // デバウンス処理で頻繁な再適用を防ぐ
        clearTimeout(window.fontifyElementTimeout);
        window.fontifyElementTimeout = setTimeout(() => {
          // 新しく追加された要素に対してフォントを再適用
          // ただし、スタイルシート自体は変更しない
          const existingStyle = document.getElementById('fontify-custom-font');
          if (existingStyle && document.head.contains(existingStyle)) {
            // スタイルが存在する場合は、新しい要素に自動的に適用されるはず
            // 念のため、スタイル要素の位置を確認して必要なら再配置
            document.head.appendChild(existingStyle);
          } else {
            // スタイルが失われている場合は再適用
            applyFont();
          }
        }, 300);
      }
    });

    if (document.body) {
      elementObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
})();
