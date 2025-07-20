# Implementation Templates for Fontify Features

## Template 1: Font Preview Component

### HTML Structure (options.html)
```html
<div class="field">
  <label class="label">フォントプレビュー</label>
  <div class="preview-container" id="fontPreview">
    <div class="preview-text">The quick brown fox jumps over the lazy dog</div>
    <div class="preview-text">あいうえおかきくけこさしすせそ</div>
    <div class="preview-text">アイウエオカキクケコサシスセソ</div>
    <div class="preview-text">春夏秋冬、美しい日本の季節</div>
  </div>
</div>
```

### CSS Styling
```css
.preview-container {
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  padding: 1rem;
  background: #fafafa;
  min-height: 120px;
}

.preview-text {
  margin-bottom: 0.5rem;
  font-size: 14px;
  line-height: 1.4;
}
```

### JavaScript Implementation
```javascript
class FontPreview {
  constructor() {
    this.previewContainer = document.getElementById('fontPreview');
    this.currentFontFamily = '';
  }

  async updatePreview(fontUrl) {
    if (!fontUrl) {
      this.resetPreview();
      return;
    }

    try {
      // Create font face
      const fontFace = new FontFace('PreviewFont', `url(${fontUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      
      // Apply to preview
      this.previewContainer.style.fontFamily = "'PreviewFont', sans-serif";
      this.currentFontFamily = 'PreviewFont';
    } catch (error) {
      console.error('Font preview failed:', error);
      this.showError('フォントのプレビューに失敗しました');
    }
  }

  resetPreview() {
    this.previewContainer.style.fontFamily = '';
    if (this.currentFontFamily) {
      document.fonts.delete(this.currentFontFamily);
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification is-warning is-light';
    errorDiv.textContent = message;
    this.previewContainer.appendChild(errorDiv);
  }
}
```

## Template 2: Font Preset Management

### Storage Schema
```javascript
const presetSchema = {
  id: 'unique-id',
  name: 'プリセット名',
  fontUrl: 'https://example.com/font.woff2',
  excludeUrls: ['site1.com', 'site2.com'],
  createdAt: Date.now(),
  isDefault: false
};
```

### Preset Manager Class
```javascript
class PresetManager {
  constructor() {
    this.presets = [];
    this.activePresetId = null;
  }

  async loadPresets() {
    const storage = await browser.storage.local.get(['fontPresets', 'activePresetId']);
    this.presets = storage.fontPresets || [];
    this.activePresetId = storage.activePresetId || null;
  }

  async savePreset(name, fontUrl, excludeUrls = []) {
    const preset = {
      id: this.generateId(),
      name: name,
      fontUrl: fontUrl,
      excludeUrls: excludeUrls,
      createdAt: Date.now(),
      isDefault: false
    };

    this.presets.push(preset);
    await this.saveToStorage();
    return preset;
  }

  async deletePreset(presetId) {
    this.presets = this.presets.filter(p => p.id !== presetId);
    if (this.activePresetId === presetId) {
      this.activePresetId = null;
    }
    await this.saveToStorage();
  }

  async setActivePreset(presetId) {
    const preset = this.presets.find(p => p.id === presetId);
    if (preset) {
      this.activePresetId = presetId;
      await browser.storage.local.set({
        fontUrl: preset.fontUrl,
        excludeUrls: preset.excludeUrls,
        activePresetId: presetId
      });
    }
  }

  async saveToStorage() {
    await browser.storage.local.set({
      fontPresets: this.presets,
      activePresetId: this.activePresetId
    });
  }

  generateId() {
    return 'preset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
```

## Template 3: Error Handling Enhancement

### Error Handler Class
```javascript
class ErrorHandler {
  static showError(message, details = null) {
    console.error('Fontify Error:', message, details);
    
    // Show user-friendly notification
    const notification = document.createElement('div');
    notification.className = 'notification is-danger is-light';
    notification.innerHTML = `
      <button class="delete" onclick="this.parentElement.remove()"></button>
      <strong>エラー:</strong> ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  static showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification is-success is-light';
    notification.innerHTML = `
      <button class="delete" onclick="this.parentElement.remove()"></button>
      ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  static async validateFontUrl(url) {
    if (!url) {
      throw new Error('フォントURLが指定されていません');
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`フォントファイルにアクセスできません (${response.status})`);
      }
      return true;
    } catch (error) {
      throw new Error('フォントURLの検証に失敗しました: ' + error.message);
    }
  }
}
```

## Template 4: Performance Optimization

### Font Cache Manager
```javascript
class FontCacheManager {
  constructor() {
    this.maxCacheSize = 5 * 1024 * 1024; // 5MB
    this.cachePrefix = 'fontCache_';
  }

  async getCachedFont(fontUrl) {
    const cacheKey = this.cachePrefix + this.hashUrl(fontUrl);
    const cache = await browser.storage.local.get(cacheKey);
    return cache[cacheKey] || null;
  }

  async cacheFont(fontUrl, dataUrl) {
    const cacheKey = this.cachePrefix + this.hashUrl(fontUrl);
    
    // Check cache size limit
    if (await this.getCacheSize() > this.maxCacheSize) {
      await this.cleanOldCache();
    }

    await browser.storage.local.set({
      [cacheKey]: {
        dataUrl: dataUrl,
        timestamp: Date.now(),
        url: fontUrl
      }
    });
  }

  async getCacheSize() {
    const storage = await browser.storage.local.get();
    let totalSize = 0;
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith(this.cachePrefix)) {
        totalSize += JSON.stringify(value).length;
      }
    }
    
    return totalSize;
  }

  async cleanOldCache() {
    const storage = await browser.storage.local.get();
    const cacheEntries = [];
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith(this.cachePrefix)) {
        cacheEntries.push({ key, timestamp: value.timestamp });
      }
    }
    
    // Sort by timestamp and remove oldest 50%
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2));
    
    for (const entry of toRemove) {
      await browser.storage.local.remove(entry.key);
    }
  }

  hashUrl(url) {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
```

## Usage Instructions

1. **Font Preview**: Add the FontPreview class to options.js and integrate with the font URL input
2. **Preset Management**: Implement PresetManager in options.js for saving/loading font configurations
3. **Error Handling**: Replace existing error handling with ErrorHandler class methods
4. **Performance**: Use FontCacheManager to optimize font loading and storage

These templates provide a solid foundation for implementing the planned features while maintaining code quality and performance standards.