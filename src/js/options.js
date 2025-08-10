// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// URL除外判定関数（content.js、popup.jsと同じ）
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

// 除外タイプの表示用ラベル取得
function getExclusionTypeLabel(url) {
  const type = inferExclusionType(url);
  switch (type) {
    case 'exact': return 'ページ';
    case 'domain': return 'サイト';
    case 'prefix': return 'セクション';
    default: return 'パターン';
  }
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

  static async isValidFontUrl(url) {
    if (!this.isValidUrl(url)) return { valid: false, error: 'URLの形式が正しくありません' };
    
    // Google Fonts check
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
      return await this.testGoogleFontsUrl(url);
    }
    
    // Font file check
    if (url.match(/\.(woff2?|ttf|otf|eot)(\?.*)?$/i)) {
      return await this.testFontFileUrl(url);
    }
    
    // CSS file check
    if (url.match(/\.css(\?.*)?$/i)) {
      return await this.testCssUrl(url);
    }
    
    return { valid: false, error: 'サポートされていないファイル形式です。.woff, .woff2, .ttf, .otf, .css またはGoogle FontsのURLを使用してください。' };
  }

  static async testGoogleFontsUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Google Fontsへの接続に失敗しました。URLを確認してください。' };
    }
  }

  static async testFontFileUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && (contentType.includes('font') || contentType.includes('application/octet-stream'))) {
          return { valid: true };
        }
        return { valid: false, error: 'ファイルがフォント形式ではないようです。' };
      }
      return { valid: false, error: `フォントファイルの読み込みに失敗しました (${response.status})` };
    } catch (error) {
      return { valid: false, error: 'フォントファイルにアクセスできません。URLを確認してください。' };
    }
  }

  static async testCssUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/css')) {
          return { valid: true };
        }
        return { valid: false, error: 'ファイルがCSS形式ではないようです。' };
      }
      return { valid: false, error: `CSSファイルの読み込みに失敗しました (${response.status})` };
    } catch (error) {
      return { valid: false, error: 'CSSファイルにアクセスできません。URLを確認してください。' };
    }
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
  const previewLarge = document.getElementById('previewLarge');
  const previewMedium = document.getElementById('previewMedium');
  const previewNormal = document.getElementById('previewNormal');
  const previewSmall = document.getElementById('previewSmall');
  const previewCustom = document.getElementById('previewCustom');
  const customPreviewText = document.getElementById('customPreviewText');
  const clearCacheBtn = document.getElementById('clearCache');
  const exportSettingsBtn = document.getElementById('exportSettings');
  const importSettingsBtn = document.getElementById('importSettings');
  const importFile = document.getElementById('importFile');
  
  // Preset management elements
  const presetList = document.getElementById('presetList');
  const presetEmptyState = document.getElementById('presetEmptyState');
  const presetNameInput = document.getElementById('presetName');
  const savePresetBtn = document.getElementById('savePreset');
  
  // Font adjustment elements
  const fontSizeScale = document.getElementById('fontSizeScale');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const fontWeight = document.getElementById('fontWeight');
  const lineHeight = document.getElementById('lineHeight');
  const lineHeightValue = document.getElementById('lineHeightValue');
  const resetAdjustmentsBtn = document.getElementById('resetAdjustments');

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
  
  // Preset management event handlers
  savePresetBtn.addEventListener('click', handleSavePreset);
  presetNameInput.addEventListener('input', validatePresetName);
  
  // Preview text change handler
  customPreviewText.addEventListener('input', updateCustomPreviewText);
  
  // Font adjustment event handlers
  fontSizeScale.addEventListener('input', updateFontSizeValue);
  lineHeight.addEventListener('input', updateLineHeightValue);
  fontWeight.addEventListener('change', updatePreviewAdjustments);
  fontSizeScale.addEventListener('change', updatePreviewAdjustments);
  lineHeight.addEventListener('change', updatePreviewAdjustments);
  resetAdjustmentsBtn.addEventListener('click', handleResetAdjustments);

  // Enter key handlers
  fontUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveFontUrl();
  });
  excludeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddExcludeUrl();
  });
  presetNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSavePreset();
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const storage = await browser.storage.local.get([
        'fontUrl', 'excludeUrls', 'fontPresets', 'activePreset', 
        'fontSizeScale', 'fontWeight', 'lineHeight'
      ]);
      
      fontUrlInput.value = storage.fontUrl || '';
      if (storage.fontUrl) {
        validateFontUrl();
        updatePreview(storage.fontUrl);
      }
      
      const excludeUrls = storage.excludeUrls || [];
      renderExcludeList(excludeUrls);
      
      const fontPresets = storage.fontPresets || [];
      renderPresetList(fontPresets, storage.activePreset);
      
      // Load font adjustments
      fontSizeScale.value = storage.fontSizeScale || 1.0;
      fontWeight.value = storage.fontWeight || 'normal';
      lineHeight.value = storage.lineHeight || 1.5;
      updateFontSizeValue();
      updateLineHeightValue();
      updatePreviewAdjustments();
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('設定の読み込みに失敗しました');
    }
  }

  // Validate font URL
  async function validateFontUrl() {
    const url = fontUrlInput.value.trim();
    
    if (!url) {
      ValidationUtils.hideValidation('fontUrlValidation');
      return false;
    }
    
    // Show loading state
    ValidationUtils.showValidation(
      'fontUrlValidation',
      '検証中...',
      'info'
    );
    
    try {
      const result = await ValidationUtils.isValidFontUrl(url);
      
      if (!result.valid) {
        ValidationUtils.showValidation(
          'fontUrlValidation',
          result.error,
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
    } catch (error) {
      ValidationUtils.showValidation(
        'fontUrlValidation',
        'URL検証中にエラーが発生しました',
        'error'
      );
      return false;
    }
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
      
      const isValid = await validateFontUrl();
      if (!isValid) {
        toast.error('有効なフォントURLを入力してください');
        return;
      }
      
      // Save font URL and adjustments
      const adjustments = {
        fontUrl: url,
        fontSizeScale: parseFloat(fontSizeScale.value),
        fontWeight: fontWeight.value,
        lineHeight: parseFloat(lineHeight.value)
      };
      
      await browser.storage.local.set(adjustments);
      updatePreview(url);
      
      toast.success('フォント設定を保存しました');
      
    } catch (error) {
      console.error('Error saving font URL:', error);
      toast.error('フォント設定の保存に失敗しました: ' + error.message);
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
    
    const isValid = await validateFontUrl();
    if (!isValid) {
      toast.error('有効なフォントURLを入力してください');
      return;
    }
    
    try {
      updatePreview(url);
      toast.success('プレビューを更新しました');
    } catch (error) {
      console.error('Error updating preview:', error);
      toast.error('プレビューの更新に失敗しました');
    }
  }

  // Update font preview
  function updatePreview(fontUrl) {
    // Remove existing font styles
    const existingStyle = document.getElementById('preview-font-style');
    const existingLink = document.getElementById('preview-font-link');
    if (existingStyle) existingStyle.remove();
    if (existingLink) existingLink.remove();

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
      `;
    } else {
      // CSS/Google Fonts
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      link.id = 'preview-font-link';
      document.head.appendChild(link);
    }
    
    document.head.appendChild(style);
    
    // Apply font to all preview elements after a short delay to allow font loading
    setTimeout(() => {
      const previewElements = [previewLarge, previewMedium, previewNormal, previewSmall, previewCustom];
      previewElements.forEach(element => {
        if (element) {
          element.classList.add('font-loaded');
        }
      });
    }, 500);
    
    previewSection.style.display = 'block';
  }

  // Update custom preview text
  function updateCustomPreviewText() {
    const customText = customPreviewText.value || 'これはフォントプリビューです。This is a font preview sample. あいうえお ABCDE 12345';
    if (previewCustom) {
      previewCustom.textContent = customText;
    }
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
      
      const urlInfo = document.createElement('div');
      urlInfo.className = 'exclude-info';
      
      const urlSpan = document.createElement('div');
      urlSpan.className = 'exclude-url';
      urlSpan.textContent = url;
      
      const typeLabel = document.createElement('div');
      typeLabel.className = 'exclude-type';
      typeLabel.textContent = `[${getExclusionTypeLabel(url)}]`;
      typeLabel.style.fontSize = '0.75rem';
      typeLabel.style.color = 'var(--text-secondary)';
      typeLabel.style.marginTop = '0.25rem';
      
      urlInfo.appendChild(urlSpan);
      urlInfo.appendChild(typeLabel);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button is-danger';
      deleteBtn.innerHTML = '<span>🗑️</span> 削除';
      deleteBtn.onclick = () => handleDeleteExcludeUrl(index);
      
      item.appendChild(urlInfo);
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
      const storage = await browser.storage.local.get([
        'fontUrl', 'excludeUrls', 'isEnabled', 'fontPresets', 'activePreset',
        'fontSizeScale', 'fontWeight', 'lineHeight'
      ]);
      const settings = {
        fontUrl: storage.fontUrl || '',
        excludeUrls: storage.excludeUrls || [],
        isEnabled: storage.isEnabled !== false,
        fontPresets: storage.fontPresets || [],
        activePreset: storage.activePreset || null,
        fontSizeScale: storage.fontSizeScale || 1.0,
        fontWeight: storage.fontWeight || 'normal',
        lineHeight: storage.lineHeight || 1.5,
        exportDate: new Date().toISOString(),
        version: '1.2'
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
      if (settings.fontPresets) importData.fontPresets = settings.fontPresets;
      if (settings.activePreset) importData.activePreset = settings.activePreset;
      if (settings.fontSizeScale) importData.fontSizeScale = settings.fontSizeScale;
      if (settings.fontWeight) importData.fontWeight = settings.fontWeight;
      if (settings.lineHeight) importData.lineHeight = settings.lineHeight;
      
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

  // Validate preset name
  function validatePresetName() {
    const name = presetNameInput.value.trim();
    
    if (!name) {
      savePresetBtn.disabled = true;
      return false;
    }
    
    savePresetBtn.disabled = false;
    return true;
  }

  // Handle save preset
  async function handleSavePreset() {
    LoadingManager.setLoading(savePresetBtn, true);
    
    try {
      const name = presetNameInput.value.trim();
      const fontUrl = fontUrlInput.value.trim();
      
      if (!name) {
        toast.warning('プリセット名を入力してください');
        return;
      }
      
      if (!fontUrl) {
        toast.warning('保存するフォントURLを設定してください');
        return;
      }
      
      const isValid = await validateFontUrl();
      if (!isValid) {
        toast.error('有効なフォントURLを入力してください');
        return;
      }
      
      const storage = await browser.storage.local.get(['fontPresets', 'excludeUrls']);
      const presets = storage.fontPresets || [];
      const excludeUrls = storage.excludeUrls || [];
      
      // Check if preset name already exists
      const existingIndex = presets.findIndex(p => p.name === name);
      
      const newPreset = {
        name: name,
        fontUrl: fontUrl,
        excludeUrls: [...excludeUrls], // Copy current exclude URLs
        fontSizeScale: parseFloat(fontSizeScale.value),
        fontWeight: fontWeight.value,
        lineHeight: parseFloat(lineHeight.value),
        createdAt: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        // Update existing preset
        presets[existingIndex] = { ...presets[existingIndex], ...newPreset };
        toast.success(`プリセット "${name}" を更新しました`);
      } else {
        // Add new preset
        presets.push(newPreset);
        toast.success(`プリセット "${name}" を保存しました`);
      }
      
      await browser.storage.local.set({ fontPresets: presets });
      
      // Clear input and reload preset list
      presetNameInput.value = '';
      validatePresetName();
      renderPresetList(presets);
      
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('プリセットの保存に失敗しました: ' + error.message);
    } finally {
      LoadingManager.setLoading(savePresetBtn, false);
    }
  }

  // Render preset list
  function renderPresetList(presets, activePreset = null) {
    presetList.innerHTML = '';
    
    if (presets.length === 0) {
      presetList.appendChild(presetEmptyState);
      return;
    }
    
    presets.forEach((preset, index) => {
      const item = document.createElement('div');
      item.className = `preset-item ${preset.name === activePreset ? 'active' : ''}`;
      
      const info = document.createElement('div');
      info.className = 'preset-info';
      
      const name = document.createElement('div');
      name.className = 'preset-name';
      name.textContent = preset.name;
      
      const url = document.createElement('div');
      url.className = 'preset-url';
      url.textContent = preset.fontUrl;
      
      info.appendChild(name);
      info.appendChild(url);
      
      const actions = document.createElement('div');
      actions.className = 'preset-actions';
      
      const applyBtn = document.createElement('button');
      applyBtn.className = 'preset-button apply';
      applyBtn.innerHTML = '<span>✓</span> 適用';
      applyBtn.onclick = () => handleApplyPreset(preset);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'preset-button delete';
      deleteBtn.innerHTML = '<span>🗑️</span> 削除';
      deleteBtn.onclick = () => handleDeletePreset(index);
      
      actions.appendChild(applyBtn);
      actions.appendChild(deleteBtn);
      
      item.appendChild(info);
      item.appendChild(actions);
      presetList.appendChild(item);
    });
  }

  // Handle apply preset
  async function handleApplyPreset(preset) {
    LoadingManager.setLoading(savePresetBtn, true);
    
    try {
      // Update current settings with preset values
      fontUrlInput.value = preset.fontUrl;
      validateFontUrl();
      updatePreview(preset.fontUrl);
      
      // Update font adjustments if they exist in preset
      if (preset.fontSizeScale !== undefined) {
        fontSizeScale.value = preset.fontSizeScale;
        updateFontSizeValue();
      }
      if (preset.fontWeight !== undefined) {
        fontWeight.value = preset.fontWeight;
      }
      if (preset.lineHeight !== undefined) {
        lineHeight.value = preset.lineHeight;
        updateLineHeightValue();
      }
      updatePreviewAdjustments();
      
      // Save to storage
      const saveData = {
        fontUrl: preset.fontUrl,
        excludeUrls: preset.excludeUrls || [],
        activePreset: preset.name
      };
      
      // Include font adjustments in save
      if (preset.fontSizeScale !== undefined) saveData.fontSizeScale = preset.fontSizeScale;
      if (preset.fontWeight !== undefined) saveData.fontWeight = preset.fontWeight;
      if (preset.lineHeight !== undefined) saveData.lineHeight = preset.lineHeight;
      
      await browser.storage.local.set(saveData);
      
      // Reload exclude list
      renderExcludeList(preset.excludeUrls || []);
      
      // Send message to background script to apply preset
      try {
        await browser.runtime.sendMessage({
          type: 'APPLY_FONT_PRESET',
          preset: preset
        });
      } catch (error) {
        console.error('Error sending message to background:', error);
      }
      
      // Reload preset list to show active state
      const storage = await browser.storage.local.get('fontPresets');
      renderPresetList(storage.fontPresets || [], preset.name);
      
      toast.success(`プリセット "${preset.name}" を適用しました`);
      
    } catch (error) {
      console.error('Error applying preset:', error);
      toast.error('プリセットの適用に失敗しました');
    } finally {
      LoadingManager.setLoading(savePresetBtn, false);
    }
  }

  // Handle delete preset
  async function handleDeletePreset(index) {
    try {
      const storage = await browser.storage.local.get(['fontPresets', 'activePreset']);
      const presets = storage.fontPresets || [];
      
      if (index < 0 || index >= presets.length) return;
      
      const deletedPreset = presets[index];
      const isActive = storage.activePreset === deletedPreset.name;
      
      // Remove preset
      presets.splice(index, 1);
      
      const updateData = { fontPresets: presets };
      
      // If deleted preset was active, clear active preset
      if (isActive) {
        updateData.activePreset = null;
      }
      
      await browser.storage.local.set(updateData);
      
      // Re-render list
      renderPresetList(presets, isActive ? null : storage.activePreset);
      
      toast.success(`プリセット "${deletedPreset.name}" を削除しました`);
      
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('プリセットの削除に失敗しました');
    }
  }

  // Update font size value display
  function updateFontSizeValue() {
    const value = Math.round(parseFloat(fontSizeScale.value) * 100);
    fontSizeValue.textContent = `${value}%`;
  }

  // Update line height value display
  function updateLineHeightValue() {
    lineHeightValue.textContent = parseFloat(lineHeight.value).toFixed(1);
  }

  // Update preview with adjustments
  function updatePreviewAdjustments() {
    const sizeScale = parseFloat(fontSizeScale.value);
    const weight = fontWeight.value;
    const lineHeightVal = parseFloat(lineHeight.value);
    
    // Apply adjustments to all preview elements
    const previewElements = [previewLarge, previewMedium, previewNormal, previewSmall, previewCustom];
    previewElements.forEach(element => {
      if (element) {
        const baseSize = element.classList.contains('large') ? 24 :
                        element.classList.contains('medium') ? 18 :
                        element.classList.contains('small') ? 14 : 16;
        
        element.style.fontSize = `${baseSize * sizeScale}px`;
        element.style.fontWeight = weight;
        element.style.lineHeight = lineHeightVal;
      }
    });
  }

  // Handle reset adjustments
  async function handleResetAdjustments() {
    LoadingManager.setLoading(resetAdjustmentsBtn, true);
    
    try {
      // Reset to default values
      fontSizeScale.value = 1.0;
      fontWeight.value = 'normal';
      lineHeight.value = 1.5;
      
      // Update displays
      updateFontSizeValue();
      updateLineHeightValue();
      updatePreviewAdjustments();
      
      // Save to storage
      await browser.storage.local.set({
        fontSizeScale: 1.0,
        fontWeight: 'normal',
        lineHeight: 1.5
      });
      
      toast.success('フォント調整をリセットしました');
      
    } catch (error) {
      console.error('Error resetting adjustments:', error);
      toast.error('調整のリセットに失敗しました');
    } finally {
      LoadingManager.setLoading(resetAdjustmentsBtn, false);
    }
  }
});
