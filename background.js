// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Service Worker for Fontify extension
// Handles installation, updates, and message passing

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
    
    // Add font presets if not exists
    if (!storage.fontPresets) {
      await browser.storage.local.set({ fontPresets: [] });
    }
    
    // Add activePreset if not exists
    if (!storage.activePreset) {
      await browser.storage.local.set({ activePreset: null });
    }
    
    console.log('Settings migration completed');
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
      if (tab.url && !excludeUrls.some(url => tab.url.startsWith(url))) {
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
