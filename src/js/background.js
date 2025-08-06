// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Service Worker for Fontify extension
// Handles installation, updates, and message passing

// URL除外判定関数（他のスクリプトと同じ）
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

// Extension installation and update handling
browser.runtime.onInstalled.addListener((details) => {
  console.log('Fontify extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation - set default values
    browser.storage.local.set({
      isEnabled: true,
      fontUrl: '',
      excludeUrls: [],
      fontPresets: [],
      activePreset: null
    });
  } else if (details.reason === 'update') {
    // Extension update - migrate settings if needed
    migrateSettings();
  }
});

// Migrate settings for new features
async function migrateSettings() {
  try {
    const storage = await browser.storage.local.get();
    let needsUpdate = false;
    const updates = {};
    
    // Add font presets if not exists
    if (!storage.fontPresets) {
      updates.fontPresets = [];
      needsUpdate = true;
    }
    
    // Add activePreset if not exists
    if (!storage.activePreset) {
      updates.activePreset = null;
      needsUpdate = true;
    }
    
    // Add font adjustments if not exists
    if (storage.fontSizeScale === undefined) {
      updates.fontSizeScale = 1.0;
      needsUpdate = true;
    }
    
    if (!storage.fontWeight) {
      updates.fontWeight = 'normal';
      needsUpdate = true;
    }
    
    if (storage.lineHeight === undefined) {
      updates.lineHeight = 1.5;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await browser.storage.local.set(updates);
      console.log('Settings migration completed:', updates);
    } else {
      console.log('No migration needed');
    }
  } catch (error) {
    console.error('Error migrating settings:', error);
  }
}

// Message handling for communication between scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'GET_ACTIVE_TAB':
      handleGetActiveTab(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'RELOAD_TAB':
      handleReloadTab(message.tabId, sendResponse);
      return true;
      
    case 'APPLY_FONT_PRESET':
      handleApplyFontPreset(message.preset, sendResponse);
      return true;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Get active tab information
async function handleGetActiveTab(sendResponse) {
  try {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    sendResponse({ success: true, tab: activeTab });
  } catch (error) {
    console.error('Error getting active tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Reload specific tab
async function handleReloadTab(tabId, sendResponse) {
  try {
    await browser.tabs.reload(tabId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error reloading tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Apply font preset across all relevant tabs
async function handleApplyFontPreset(preset, sendResponse) {
  try {
    // Update storage with new active preset and adjustments
    const updateData = {
      fontUrl: preset.fontUrl,
      activePreset: preset.name,
      isEnabled: true
    };
    
    // Include font adjustments if they exist
    if (preset.fontSizeScale !== undefined) updateData.fontSizeScale = preset.fontSizeScale;
    if (preset.fontWeight !== undefined) updateData.fontWeight = preset.fontWeight;
    if (preset.lineHeight !== undefined) updateData.lineHeight = preset.lineHeight;
    
    await browser.storage.local.set(updateData);
    
    // Notify all content scripts to update font
    const tabs = await browser.tabs.query({});
    const excludeUrls = preset.excludeUrls || [];
    
    for (const tab of tabs) {
      if (tab.url && !isUrlExcluded(tab.url, excludeUrls)) {
        try {
          await browser.tabs.reload(tab.id);
        } catch (error) {
          // Ignore errors for tabs that can't be reloaded (e.g., chrome:// pages)
          console.log('Could not reload tab:', tab.url, error.message);
        }
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error applying font preset:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('Fontify background script loaded');
