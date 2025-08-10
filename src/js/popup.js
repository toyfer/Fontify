// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// URL除外判定関数（content.jsと同じ）
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

// Toast notification system
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
  }

  show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : type === 'warning' ? '!' : '✗';
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    this.container.appendChild(toast);
    
    // Show animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  success(message, duration) {
    this.show(message, 'success', duration);
  }

  warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  error(message, duration) {
    this.show(message, 'error', duration);
  }
}

// Loading state manager
class LoadingManager {
  static setLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
}

// Initialize popup functionality
document.addEventListener('DOMContentLoaded', async () => {
  const toast = new ToastManager();
  
  // Get DOM elements
  const fontStatus = document.getElementById('fontStatus');
  const statusIndicator = document.getElementById('statusIndicator');
  const currentFont = document.getElementById('currentFont');
  const activePreset = document.getElementById('activePreset');
  const pageStatus = document.getElementById('pageStatus');
  const toggleButton = document.getElementById('toggleFont');
  const toggleText = document.getElementById('toggleText');
  const previewButton = document.getElementById('previewFont');
  const excludeButton = document.getElementById('addCurrentToExclude');
  const optionsButton = document.getElementById('openOptions');
  const presetSelector = document.getElementById('presetSelector');
  const presetDropdown = document.getElementById('presetDropdown');

  // Get current tab
  let currentTab;
  try {
    [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
  } catch (error) {
    console.error('Error getting current tab:', error);
    toast.error('タブ情報の取得に失敗しました');
    return;
  }

  // Load current settings and status
  await loadStatus();

  // Button event handlers
  toggleButton.onclick = handleToggleFont;
  previewButton.onclick = handlePreviewFont;
  excludeButton.onclick = handleAddToExclude;
  optionsButton.onclick = handleOpenOptions;
  presetDropdown.onchange = handlePresetChange;

  // Load and display current status
  async function loadStatus() {
    try {
      const storage = await browser.storage.local.get(['fontUrl', 'excludeUrls', 'isEnabled', 'fontPresets', 'activePreset']);
      const fontUrl = storage.fontUrl || '';
      const excludeUrls = storage.excludeUrls || [];
      const isEnabled = storage.isEnabled !== false; // Default to true
      const fontPresets = storage.fontPresets || [];
      const activePresetName = storage.activePreset || null;
      
      // Update font status
      if (fontUrl) {
        fontStatus.textContent = isEnabled ? '有効' : '無効';
        statusIndicator.className = `status-indicator ${isEnabled ? 'status-active' : 'status-inactive'}`;
        
        // Extract font name from URL
        const fontName = extractFontName(fontUrl);
        currentFont.textContent = fontName;
      } else {
        fontStatus.textContent = '未設定';
        statusIndicator.className = 'status-indicator status-inactive';
        currentFont.textContent = '未設定';
      }

      // Update active preset display
      activePreset.textContent = activePresetName || 'なし';

      // Update page status
      if (currentTab?.url) {
        const isExcluded = isUrlExcluded(currentTab.url, excludeUrls);
        
        if (isExcluded) {
          pageStatus.textContent = '除外済み';
          statusIndicator.className = 'status-indicator status-excluded';
        } else {
          pageStatus.textContent = fontUrl && isEnabled ? '適用中' : '未適用';
        }
      } else {
        pageStatus.textContent = '不明';
      }

      // Update toggle button
      updateToggleButton(isEnabled, fontUrl);
      
      // Update preset selector
      updatePresetSelector(fontPresets, activePresetName);
      
    } catch (error) {
      console.error('Error loading status:', error);
      toast.error('設定の読み込みに失敗しました');
    }
  }

  // Extract font name from URL
  function extractFontName(url) {
    if (!url) return '未設定';
    
    // Try to extract from Google Fonts URL
    const googleFontsMatch = url.match(/family=([^&:]+)/);
    if (googleFontsMatch) {
      return decodeURIComponent(googleFontsMatch[1].replace(/\+/g, ' '));
    }
    
    // Try to extract from file URL
    const fileMatch = url.match(/\/([^\/]+)\.(woff2?|ttf|otf)$/i);
    if (fileMatch) {
      return fileMatch[1].replace(/[-_]/g, ' ');
    }
    
    // Extract domain name as fallback
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'カスタムフォント';
    }
  }

  // Update toggle button state
  function updateToggleButton(isEnabled, fontUrl) {
    if (!fontUrl) {
      toggleButton.disabled = true;
      toggleText.textContent = 'フォント未設定';
      toggleButton.className = 'control-button btn-secondary';
    } else {
      toggleButton.disabled = false;
      if (isEnabled) {
        toggleText.textContent = '一時無効化';
        toggleButton.className = 'control-button btn-warning';
      } else {
        toggleText.textContent = '有効化';
        toggleButton.className = 'control-button btn-success';
      }
    }
  }

  // Handle font toggle
  async function handleToggleFont() {
    LoadingManager.setLoading(toggleButton, true);
    
    try {
      const storage = await browser.storage.local.get(['isEnabled', 'fontUrl']);
      const currentEnabled = storage.isEnabled !== false;
      const newEnabled = !currentEnabled;
      
      await browser.storage.local.set({ isEnabled: newEnabled });
      
      // Reload current tab to apply changes
      if (currentTab?.id) {
        await browser.tabs.reload(currentTab.id);
      }
      
      // Update UI
      await loadStatus();
      
      toast.success(newEnabled ? 'フォントを有効化しました' : 'フォントを無効化しました');
      
    } catch (error) {
      console.error('Error toggling font:', error);
      toast.error('設定の変更に失敗しました');
    } finally {
      LoadingManager.setLoading(toggleButton, false);
    }
  }

  // Handle font preview
  async function handlePreviewFont() {
    LoadingManager.setLoading(previewButton, true);
    
    try {
      const storage = await browser.storage.local.get('fontUrl');
      const fontUrl = storage.fontUrl;
      
      if (!fontUrl) {
        toast.warning('プレビューするフォントが設定されていません');
        return;
      }
      
      // Validate font URL before opening preview
      const fontName = extractFontName(fontUrl);
      
      // Create preview window with better error handling
      try {
        const previewWindow = window.open('', 'fontPreview', 'width=600,height=500,scrollbars=yes,resizable=yes');
        
        if (!previewWindow) {
          toast.error('プレビューウィンドウを開けませんでした。ポップアップブロッカーを確認してください。');
          return;
        }
        
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <title>フォントプレビュー - ${fontName}</title>
            <style>
              body { 
                font-family: 'PreviewFont', sans-serif; 
                padding: 2rem; 
                line-height: 1.6;
                background: #f8fafc;
                margin: 0;
              }
              .preview-container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 800px;
                margin: 0 auto;
              }
              .error-message {
                background: #fee2e2;
                color: #dc2626;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                border: 1px solid #fecaca;
              }
              h1 { 
                font-size: 2rem; 
                margin-bottom: 1rem; 
                color: #1f2937;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 0.5rem;
              }
              .sizes { 
                display: flex; 
                flex-direction: column; 
                gap: 1rem; 
              }
              .size-demo { 
                padding: 1rem; 
                background: #f8fafc; 
                border-radius: 8px; 
                border: 1px solid #e5e7eb;
              }
              .size-label { 
                font-size: 0.875rem; 
                color: #6b7280; 
                margin-bottom: 0.5rem; 
                font-weight: 500;
              }
              .loading {
                text-align: center;
                color: #6b7280;
                padding: 2rem;
              }
            </style>
          </head>
          <body>
            <div class="preview-container">
              <h1>フォントプレビュー</h1>
              <div class="loading">フォントを読み込み中...</div>
              <div class="sizes" style="display: none;">
                <div class="size-demo">
                  <div class="size-label">大見出し (24px)</div>
                  <div style="font-size: 24px; font-weight: 600;">これはフォントプレビューです</div>
                </div>
                <div class="size-demo">
                  <div class="size-label">中見出し (18px)</div>
                  <div style="font-size: 18px; font-weight: 500;">This is a font preview sample</div>
                </div>
                <div class="size-demo">
                  <div class="size-label">本文 (16px)</div>
                  <div style="font-size: 16px;">あいうえおかきくけこABCDEFGHIJKL1234567890</div>
                </div>
                <div class="size-demo">
                  <div class="size-label">小文字 (14px)</div>
                  <div style="font-size: 14px;">The quick brown fox jumps over the lazy dog</div>
                </div>
                <div class="size-demo">
                  <div class="size-label">日本語サンプル</div>
                  <div style="font-size: 16px;">吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。</div>
                </div>
              </div>
            </div>
            
            <script>
              // Load font and show content
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = '${fontUrl}';
              link.onload = function() {
                setTimeout(() => {
                  document.querySelector('.loading').style.display = 'none';
                  document.querySelector('.sizes').style.display = 'flex';
                }, 500);
              };
              link.onerror = function() {
                document.querySelector('.loading').innerHTML = 
                  '<div class="error-message">フォントの読み込みに失敗しました。URLを確認してください。</div>';
              };
              document.head.appendChild(link);
            </script>
          </body>
          </html>
        `);
        previewWindow.document.close();
        
        toast.success('プレビューウィンドウを開きました');
        
      } catch (windowError) {
        console.error('Error creating preview window:', windowError);
        toast.error('プレビューウィンドウの作成に失敗しました');
      }
      
    } catch (error) {
      console.error('Error in preview function:', error);
      toast.error('プレビューの表示に失敗しました: ' + error.message);
    } finally {
      LoadingManager.setLoading(previewButton, false);
    }
  }

  // Handle add to exclude list
  async function handleAddToExclude() {
    LoadingManager.setLoading(excludeButton, true);
    
    try {
      if (!currentTab?.url) {
        toast.error('現在のページのURLを取得できません');
        return;
      }

      const currentUrl = currentTab.url;
      const storage = await browser.storage.local.get('excludeUrls');
      const urls = storage.excludeUrls || [];
      
      // 既に除外されているかチェック
      if (isUrlExcluded(currentUrl, urls)) {
        toast.warning('このページは既に除外リストに含まれています');
        return;
      }
      
      // 除外タイプを選択させる
      const exclusionType = await showExclusionTypeDialog(currentUrl);
      if (!exclusionType) {
        return; // キャンセルされた
      }
      
      let exclusionUrl;
      switch (exclusionType) {
        case 'exact':
          // 完全一致: 現在のページのみ
          exclusionUrl = currentUrl;
          break;
        case 'domain':
          // ドメイン全体
          const urlObj = new URL(currentUrl);
          exclusionUrl = urlObj.origin + '/';
          break;
        case 'prefix':
          // 現在のディレクトリ以下
          const pathUrl = new URL(currentUrl);
          const pathParts = pathUrl.pathname.split('/');
          pathParts.pop(); // ファイル名を除去
          exclusionUrl = pathUrl.origin + pathParts.join('/') + '/';
          break;
      }
      
      urls.push(exclusionUrl);
      await browser.storage.local.set({ excludeUrls: urls });
      
      // Reload page to apply exclusion
      await browser.tabs.reload(currentTab.id);
      
      // Update status
      await loadStatus();
      
      toast.success('除外リストに追加しました');
      
    } catch (error) {
      console.error('Error adding to exclude list:', error);
      toast.error('除外リストへの追加に失敗しました');
    } finally {
      LoadingManager.setLoading(excludeButton, false);
    }
  }
  
  // 除外タイプ選択ダイアログ
  function showExclusionTypeDialog(currentUrl) {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(currentUrl);
        const domain = urlObj.hostname;
        const path = urlObj.pathname;
        const pathParts = path.split('/');
        const directory = pathParts.slice(0, -1).join('/') + '/';
        
        const options = [
          {
            type: 'exact',
            label: 'このページのみ',
            description: `${urlObj.pathname}`,
            recommended: path !== '/' && !path.endsWith('/')
          },
          {
            type: 'prefix', 
            label: 'このディレクトリ以下',
            description: directory,
            recommended: directory !== '/' && pathParts.length > 2
          },
          {
            type: 'domain',
            label: 'このサイト全体',
            description: domain,
            recommended: false
          }
        ];
        
        // 最も適切なオプションを推奨として選択
        const recommended = options.find(opt => opt.recommended) || options[0];
        
        // シンプルな確認: 最も適切なオプションを提案
        const message = `除外範囲を選択してください:\n\n` +
                       `推奨: ${recommended.label} (${recommended.description})\n\n` +
                       `OK = 推奨設定\nキャンセル = 中止`;
        
        if (confirm(message)) {
          resolve(recommended.type);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error in exclusion type dialog:', error);
        // エラー時はページ単位除外にフォールバック
        resolve('exact');
      }
    });
  }

  // Handle open options
  async function handleOpenOptions() {
    try {
      await browser.runtime.openOptionsPage();
      window.close();
    } catch (error) {
      console.error('Error opening options:', error);
      toast.error('設定ページの表示に失敗しました');
    }
  }

  // Update preset selector
  function updatePresetSelector(presets, activePresetName) {
    // Clear existing options
    presetDropdown.innerHTML = '<option value="">プリセットを選択...</option>';
    
    if (presets.length === 0) {
      presetSelector.style.display = 'none';
      return;
    }
    
    // Show preset selector
    presetSelector.style.display = 'block';
    
    // Add preset options
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.name;
      option.textContent = preset.name;
      if (preset.name === activePresetName) {
        option.selected = true;
      }
      presetDropdown.appendChild(option);
    });
  }

  // Handle preset change
  async function handlePresetChange() {
    const selectedPresetName = presetDropdown.value;
    
    if (!selectedPresetName) return;
    
    LoadingManager.setLoading(presetDropdown, true);
    
    try {
      const storage = await browser.storage.local.get('fontPresets');
      const presets = storage.fontPresets || [];
      const selectedPreset = presets.find(p => p.name === selectedPresetName);
      
      if (!selectedPreset) {
        toast.error('選択されたプリセットが見つかりません');
        return;
      }
      
      // Send message to background script to apply preset
      try {
        await browser.runtime.sendMessage({
          type: 'APPLY_FONT_PRESET',
          preset: selectedPreset
        });
        
        toast.success(`プリセット "${selectedPreset.name}" を適用しました`);
        
        // Reload status after a short delay
        setTimeout(() => {
          loadStatus();
        }, 500);
        
      } catch (error) {
        console.error('Error sending message to background:', error);
        toast.error('プリセットの適用に失敗しました');
      }
      
    } catch (error) {
      console.error('Error applying preset:', error);
      toast.error('プリセットの適用に失敗しました');
    } finally {
      LoadingManager.setLoading(presetDropdown, false);
    }
  }
});
