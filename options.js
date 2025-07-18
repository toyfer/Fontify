// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Toast notification system (same as popup.js)
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
  }

  show(message, type = 'success', duration = 4000) {
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

// URL validation utilities
class ValidationUtils {
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static isValidFontUrl(url) {
    if (!this.isValidUrl(url)) return false;
    
    // Google Fonts check
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
      return true;
    }
    
    // Font file check
    if (url.match(/\.(woff2?|ttf|otf|eot)(\?.*)?$/i)) {
      return true;
    }
    
    // CSS file check
    if (url.match(/\.css(\?.*)?$/i)) {
      return true;
    }
    
    return false;
  }

  static showValidation(elementId, message, type) {
    const validation = document.getElementById(elementId);
    const input = validation.previousElementSibling.querySelector('input') || 
                   validation.previousElementSibling;
    
    validation.textContent = message;
    validation.className = `validation-message ${type}`;
    
    if (type === 'error') {
      input.classList.add('is-danger');
      input.classList.remove('is-success');
    } else if (type === 'success') {
      input.classList.add('is-success');
      input.classList.remove('is-danger');
    } else {
      input.classList.remove('is-danger', 'is-success');
    }
  }

  static hideValidation(elementId) {
    const validation = document.getElementById(elementId);
    const input = validation.previousElementSibling.querySelector('input') || 
                   validation.previousElementSibling;
    
    validation.className = 'validation-message';
    input.classList.remove('is-danger', 'is-success');
  }
}

// Options page functionality
document.addEventListener('DOMContentLoaded', async () => {
  const toast = new ToastManager();
  
  // Get DOM elements
  const fontUrlInput = document.getElementById('fontUrl');
  const saveFontUrlBtn = document.getElementById('saveFontUrl');
  const previewFontBtn = document.getElementById('previewFont');
  const excludeUrlInput = document.getElementById('excludeUrl');
  const addExcludeUrlBtn = document.getElementById('addExcludeUrl');
  const excludeList = document.getElementById('excludeList');
  const emptyState = document.getElementById('emptyState');
  const previewSection = document.getElementById('previewSection');
  const previewText = document.getElementById('previewText');
  const clearCacheBtn = document.getElementById('clearCache');
  const exportSettingsBtn = document.getElementById('exportSettings');
  const importSettingsBtn = document.getElementById('importSettings');
  const importFile = document.getElementById('importFile');

  // Load initial data
  await loadSettings();

  // Event handlers
  fontUrlInput.addEventListener('input', validateFontUrl);
  saveFontUrlBtn.addEventListener('click', handleSaveFontUrl);
  previewFontBtn.addEventListener('click', handlePreviewFont);
  excludeUrlInput.addEventListener('input', validateExcludeUrl);
  addExcludeUrlBtn.addEventListener('click', handleAddExcludeUrl);
  clearCacheBtn.addEventListener('click', handleClearCache);
  exportSettingsBtn.addEventListener('click', handleExportSettings);
  importSettingsBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImportSettings);

  // Enter key handlers
  fontUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveFontUrl();
  });
  excludeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddExcludeUrl();
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const storage = await browser.storage.local.get(['fontUrl', 'excludeUrls']);
      
      fontUrlInput.value = storage.fontUrl || '';
      if (storage.fontUrl) {
        validateFontUrl();
        updatePreview(storage.fontUrl);
      }
      
      const excludeUrls = storage.excludeUrls || [];
      renderExcludeList(excludeUrls);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('設定の読み込みに失敗しました');
    }
  }

  // Validate font URL
  function validateFontUrl() {
    const url = fontUrlInput.value.trim();
    
    if (!url) {
      ValidationUtils.hideValidation('fontUrlValidation');
      return false;
    }
    
    if (!ValidationUtils.isValidFontUrl(url)) {
      ValidationUtils.showValidation(
        'fontUrlValidation',
        '有効なフォントURLまたはGoogle FontsのURLを入力してください',
        'error'
      );
      return false;
    }
    
    ValidationUtils.showValidation(
      'fontUrlValidation',
      '有効なフォントURLです',
      'success'
    );
    return true;
  }

  // Validate exclude URL
  function validateExcludeUrl() {
    const url = excludeUrlInput.value.trim();
    
    if (!url) {
      ValidationUtils.hideValidation('excludeUrlValidation');
      return false;
    }
    
    if (!ValidationUtils.isValidUrl(url)) {
      ValidationUtils.showValidation(
        'excludeUrlValidation',
        '有効なURLを入力してください',
        'error'
      );
      return false;
    }
    
    ValidationUtils.showValidation(
      'excludeUrlValidation',
      '有効なURLです',
      'success'
    );
    return true;
  }

  // Handle save font URL
  async function handleSaveFontUrl() {
    LoadingManager.setLoading(saveFontUrlBtn, true);
    
    try {
      const url = fontUrlInput.value.trim();
      
      if (!url) {
        toast.warning('フォントURLを入力してください');
        return;
      }
      
      if (!validateFontUrl()) {
        toast.error('有効なフォントURLを入力してください');
        return;
      }
      
      await browser.storage.local.set({ fontUrl: url });
      updatePreview(url);
      
      toast.success('フォント設定を保存しました');
      
    } catch (error) {
      console.error('Error saving font URL:', error);
      toast.error('フォント設定の保存に失敗しました');
    } finally {
      LoadingManager.setLoading(saveFontUrlBtn, false);
    }
  }

  // Handle font preview
  async function handlePreviewFont() {
    const url = fontUrlInput.value.trim();
    
    if (!url) {
      toast.warning('プレビューするフォントURLを入力してください');
      return;
    }
    
    if (!validateFontUrl()) {
      toast.error('有効なフォントURLを入力してください');
      return;
    }
    
    updatePreview(url);
    toast.success('プレビューを更新しました');
  }

  // Update font preview
  function updatePreview(fontUrl) {
    // Remove existing font styles
    const existingStyle = document.getElementById('preview-font-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new font style
    const style = document.createElement('style');
    style.id = 'preview-font-style';
    
    if (fontUrl.match(/\.woff2?$|\.ttf$|\.otf$/i)) {
      // Direct font file
      style.textContent = `
        @font-face {
          font-family: 'PreviewFont';
          src: url('${fontUrl}');
          font-display: swap;
        }
        #previewText {
          font-family: 'PreviewFont', sans-serif !important;
        }
      `;
    } else {
      // CSS/Google Fonts
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      link.id = 'preview-font-link';
      document.head.appendChild(link);
      
      style.textContent = `
        #previewText {
          font-family: 'PreviewFont', sans-serif !important;
        }
      `;
    }
    
    document.head.appendChild(style);
    previewSection.style.display = 'block';
  }

  // Handle add exclude URL
  async function handleAddExcludeUrl() {
    LoadingManager.setLoading(addExcludeUrlBtn, true);
    
    try {
      const url = excludeUrlInput.value.trim();
      
      if (!url) {
        toast.warning('除外するURLを入力してください');
        return;
      }
      
      if (!validateExcludeUrl()) {
        toast.error('有効なURLを入力してください');
        return;
      }
      
      const storage = await browser.storage.local.get('excludeUrls');
      const urls = storage.excludeUrls || [];
      
      if (urls.includes(url)) {
        toast.warning('このURLは既に除外リストに含まれています');
        return;
      }
      
      urls.push(url);
      await browser.storage.local.set({ excludeUrls: urls });
      
      renderExcludeList(urls);
      excludeUrlInput.value = '';
      ValidationUtils.hideValidation('excludeUrlValidation');
      
      toast.success('除外URLを追加しました');
      
    } catch (error) {
      console.error('Error adding exclude URL:', error);
      toast.error('除外URLの追加に失敗しました');
    } finally {
      LoadingManager.setLoading(addExcludeUrlBtn, false);
    }
  }

  // Render exclude list
  function renderExcludeList(urls) {
    excludeList.innerHTML = '';
    
    if (urls.length === 0) {
      excludeList.appendChild(emptyState);
      return;
    }
    
    urls.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'exclude-item';
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'exclude-url';
      urlSpan.textContent = url;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button is-danger';
      deleteBtn.innerHTML = '<span>🗑️</span> 削除';
      deleteBtn.onclick = () => handleDeleteExcludeUrl(index);
      
      item.appendChild(urlSpan);
      item.appendChild(deleteBtn);
      excludeList.appendChild(item);
    });
  }

  // Handle delete exclude URL
  async function handleDeleteExcludeUrl(index) {
    try {
      const storage = await browser.storage.local.get('excludeUrls');
      const urls = storage.excludeUrls || [];
      
      const deletedUrl = urls[index];
      urls.splice(index, 1);
      
      await browser.storage.local.set({ excludeUrls: urls });
      renderExcludeList(urls);
      
      toast.success(`"${deletedUrl}" を除外リストから削除しました`);
      
    } catch (error) {
      console.error('Error deleting exclude URL:', error);
      toast.error('除外URLの削除に失敗しました');
    }
  }

  // Handle clear cache
  async function handleClearCache() {
    LoadingManager.setLoading(clearCacheBtn, true);
    
    try {
      const storage = await browser.storage.local.get();
      const keysToRemove = Object.keys(storage).filter(key => 
        key.startsWith('fontCache_')
      );
      
      if (keysToRemove.length === 0) {
        toast.warning('クリアするキャッシュがありません');
        return;
      }
      
      await browser.storage.local.remove(keysToRemove);
      toast.success(`${keysToRemove.length}個のフォントキャッシュをクリアしました`);
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('キャッシュのクリアに失敗しました');
    } finally {
      LoadingManager.setLoading(clearCacheBtn, false);
    }
  }

  // Handle export settings
  async function handleExportSettings() {
    LoadingManager.setLoading(exportSettingsBtn, true);
    
    try {
      const storage = await browser.storage.local.get(['fontUrl', 'excludeUrls', 'isEnabled']);
      const settings = {
        fontUrl: storage.fontUrl || '',
        excludeUrls: storage.excludeUrls || [],
        isEnabled: storage.isEnabled !== false,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fontify-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('設定をエクスポートしました');
      
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('設定のエクスポートに失敗しました');
    } finally {
      LoadingManager.setLoading(exportSettingsBtn, false);
    }
  }

  // Handle import settings
  async function handleImportSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    LoadingManager.setLoading(importSettingsBtn, true);
    
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      // Validate settings structure
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings format');
      }
      
      // Import settings
      const importData = {};
      if (settings.fontUrl) importData.fontUrl = settings.fontUrl;
      if (settings.excludeUrls) importData.excludeUrls = settings.excludeUrls;
      if (typeof settings.isEnabled === 'boolean') importData.isEnabled = settings.isEnabled;
      
      await browser.storage.local.set(importData);
      await loadSettings();
      
      toast.success('設定をインポートしました');
      
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('設定のインポートに失敗しました: ' + error.message);
    } finally {
      LoadingManager.setLoading(importSettingsBtn, false);
      // Reset file input
      event.target.value = '';
    }
  }
});
