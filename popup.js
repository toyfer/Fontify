// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
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
  const pageStatus = document.getElementById('pageStatus');
  const toggleButton = document.getElementById('toggleFont');
  const toggleText = document.getElementById('toggleText');
  const previewButton = document.getElementById('previewFont');
  const excludeButton = document.getElementById('addCurrentToExclude');
  const optionsButton = document.getElementById('openOptions');

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

  // Load and display current status
  async function loadStatus() {
    try {
      const storage = await browser.storage.local.get(['fontUrl', 'excludeUrls', 'isEnabled']);
      const fontUrl = storage.fontUrl || '';
      const excludeUrls = storage.excludeUrls || [];
      const isEnabled = storage.isEnabled !== false; // Default to true
      
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

      // Update page status
      if (currentTab?.url) {
        const isExcluded = excludeUrls.some(excludeUrl => 
          currentTab.url.startsWith(excludeUrl)
        );
        
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
      
      // Create preview window
      const previewWindow = window.open('', 'fontPreview', 'width=600,height=400');
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>フォントプレビュー - ${extractFontName(fontUrl)}</title>
          <style>
            body { 
              font-family: 'PreviewFont', sans-serif; 
              padding: 2rem; 
              line-height: 1.6;
              background: #f8fafc;
            }
            .preview-container {
              background: white;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; color: #1f2937; }
            .sizes { display: flex; flex-direction: column; gap: 1rem; }
            .size-demo { padding: 1rem; background: #f8fafc; border-radius: 8px; }
            .size-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
          </style>
          <link rel="stylesheet" href="${fontUrl}">
          <style>
            @font-face {
              font-family: 'PreviewFont';
              src: url('${fontUrl}');
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            <h1>フォントプレビュー</h1>
            <div class="sizes">
              <div class="size-demo">
                <div class="size-label">大見出し (24px)</div>
                <div style="font-size: 24px;">これはフォントプレビューです</div>
              </div>
              <div class="size-demo">
                <div class="size-label">中見出し (18px)</div>
                <div style="font-size: 18px;">This is a font preview sample</div>
              </div>
              <div class="size-demo">
                <div class="size-label">本文 (16px)</div>
                <div style="font-size: 16px;">あいうえおかきくけこABCDEFGHIJKL1234567890</div>
              </div>
              <div class="size-demo">
                <div class="size-label">小文字 (14px)</div>
                <div style="font-size: 14px;">The quick brown fox jumps over the lazy dog</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
      
      toast.success('プレビューウィンドウを開きました');
      
    } catch (error) {
      console.error('Error opening preview:', error);
      toast.error('プレビューの表示に失敗しました');
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

      const url = currentTab.url;
      const storage = await browser.storage.local.get('excludeUrls');
      const urls = storage.excludeUrls || [];
      
      if (urls.some(excludeUrl => url.startsWith(excludeUrl))) {
        toast.warning('このページは既に除外リストに含まれています');
        return;
      }
      
      urls.push(url);
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
});
