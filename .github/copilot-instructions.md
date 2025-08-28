# Fontify Browser Extension

Fontify is a Chrome/Firefox browser extension that replaces fonts on web pages with custom web fonts. The extension supports font presets, exclusion lists, and real-time font preview functionality.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Repository Structure
```
.github/
├── workflows/            # GitHub Actions (automated triage/CLI)
│   ├── gemini-cli.yml   # Automated coding assistant  
│   └── gemini-*-triage.yml # Issue triage automation
src/
├── manifest.json          # Extension manifest file (Manifest V3)
├── js/                   # JavaScript files
│   ├── background.js     # Service worker background script
│   ├── content.js        # Content script injected into web pages
│   ├── options.js        # Options page functionality  
│   └── popup.js          # Extension popup functionality
└── html/                 # HTML files
    ├── options.html      # Extension options page
    └── popup.html        # Extension popup UI
docs/                     # Development documentation (Japanese)
```

### Critical: No Build Process Required
- This extension has NO build process, package.json, or dependencies
- All files are vanilla HTML, CSS, and JavaScript
- Extension can be loaded directly as "unpacked extension"
- NEVER try to run npm install, npm build, or similar commands
- NO linting tools are configured (no eslint, prettier, etc.)

### Loading the Extension for Development

#### Chrome/Chromium Setup:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top right
3. Click "Load unpacked" button
4. Navigate to and select the `/src/` directory (NOT the root directory)
5. Extension should load immediately with "Fontify" name
6. Extension icon appears in toolbar

#### Firefox Setup:
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on" button
4. Navigate to `/src/` directory and select `manifest.json` file
5. Extension loads and appears in add-ons list
6. Extension icon appears in toolbar

### NEVER CANCEL: Extension Loading Time
- Extension loading: 1-3 seconds - NEVER CANCEL
- First popup open: 1-2 seconds - NEVER CANCEL  
- Options page load: 2-3 seconds - NEVER CANCEL

## Validation Scenarios

### ALWAYS Test These Core Workflows After Changes:

#### 1. Extension Loading Validation
- Load extension in Chrome: `chrome://extensions/` → "Load unpacked" → select `/src/`
- Verify extension appears with correct name "Fontify"
- Check for any error messages in extension details
- Confirm extension icon appears in browser toolbar

#### 2. Popup Functionality Test
- Click extension icon to open popup
- Verify popup displays current font status
- Test "フォント置換" toggle functionality
- Test "このページを除外" button
- Test "詳細設定を開く" button opens options page

#### 3. Options Page Validation
- Open options page via popup or `chrome://extensions/` → Extension details → "Extension options"
- Test font URL input and validation
- Test font preview functionality with Google Fonts URL
- Example test URL: `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap`
- Verify font preview updates in real-time
- Test exclusion URL addition and removal
- Test preset save/load/delete functionality

#### 4. Font Application Test
- Navigate to any website (e.g., `https://example.com`)
- Configure font in options page
- Verify fonts change on test page
- Test exclusion functionality by adding test site to exclusion list
- Verify fonts revert when excluded

#### 5. Cross-Browser Compatibility
- Test in both Chrome (latest) and Firefox (latest)
- Verify all functionality works identically
- Check for browser-specific console errors

### Manual Validation Requirements
ALWAYS perform these validation steps after making changes:
1. **Load extension in fresh browser instance** - Takes 1-3 seconds, NEVER CANCEL
2. **Set up test font URL in options** - Use: `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap`
3. **Navigate to test website and verify font changes** - Test sites: `example.com`, `wikipedia.org`
4. **Test popup controls work correctly** - Click extension icon, verify all buttons respond
5. **Add and remove exclusion URLs** - Test with: `https://example.com/`
6. **Create and apply font presets** - Save current settings as "Test Preset"
7. **Export and import settings** - Download JSON, clear settings, reimport, verify restoration

### Complete End-to-End Test Scenario
1. Start with clean browser profile (no previous extension data)
2. Load Fontify extension in Chrome/Firefox
3. Open options page and configure Google Fonts URL (Noto Sans JP)
4. Navigate to example.com and verify font changes apply
5. Open popup and test "このページを除外" button  
6. Confirm fonts revert on example.com after exclusion
7. Remove example.com from exclusion list via options page
8. Verify fonts re-apply to example.com
9. Create and save a preset with current settings
10. Change font to different Google Font, then restore preset
11. Export settings, clear all data, import settings, verify restoration
**Expected completion time: 5-8 minutes - NEVER CANCEL**

## Browser Compatibility
- **Chrome 88+** - Full Manifest V3 support required
- **Firefox 85+** - Manifest V3 support required
- Uses `browser` namespace with `chrome` fallback for compatibility
- Permissions: `storage`, `scripting`, `activeTab`, `<all_urls>`

## Key Files and Their Purposes

### `manifest.json`
- Extension configuration and permissions
- References all HTML and JS files
- Manifest V3 format required

### `js/background.js`
- Service worker for extension lifecycle
- Handles URL exclusion logic
- Message passing between components

### `js/content.js`
- Injected into all web pages
- Applies font changes to page elements
- Monitors for dynamic content updates

### `js/popup.js`
- Controls popup interface functionality
- Communicates with background script
- Manages real-time status updates

### `js/options.js`
- Full options page functionality
- Font URL validation and preview
- Preset management system
- Settings import/export features

### HTML Files
- `html/popup.html` - Extension popup interface (320px min width)
- `html/options.html` - Full options page with all controls
- Both use embedded CSS (no external stylesheets)

## Common Development Tasks

### Adding New Features
1. Identify which component needs modification (popup, options, content, background)
2. Update relevant JavaScript file
3. If adding new UI elements, modify corresponding HTML file
4. Test functionality by reloading extension (`chrome://extensions/` → reload icon)
5. Validate across all test scenarios

### Debugging Extension Issues
- Open Chrome DevTools on extension pages:
  - Popup: Right-click extension icon → "Inspect popup"
  - Options: Right-click options page → "Inspect"
  - Background: `chrome://extensions/` → Extension details → "Inspect views: service worker"
- Check browser console for JavaScript errors
- Verify storage contents: DevTools → Application → Storage → Local Storage

### Storage Schema
Extension uses `browser.storage.local` with these keys:
- `fontUrl` - Current font URL string
- `excludeUrls` - Array of exclusion patterns
- `isEnabled` - Boolean for global enable/disable
- `fontPresets` - Array of saved font presets
- `activePreset` - Currently active preset ID
- `fontSizeScale` - Font size multiplier (0.8-1.5)
- `fontWeight` - Font weight setting
- `lineHeight` - Line height setting

### Performance Considerations
- Font files are cached for performance
- Content script runs on all pages but is lightweight
- Exclusion checking is optimized for speed
- No external dependencies to minimize load time

## Testing Guidelines

### Error Scenarios to Test
- Invalid font URLs in options
- Network failures when loading fonts
- Malformed exclusion URL patterns
- Browser storage quota limits
- Rapid enable/disable toggling

### Regression Testing
Always test these after ANY changes:
1. Extension loads without errors
2. Popup opens and displays current status
3. Options page renders completely
4. Font changes apply to test pages
5. Exclusion system works correctly
6. Preset system saves/loads properly
7. Settings export/import functions

## Known Limitations
- Extension works with publicly accessible font URLs only
- Some websites may override font changes with CSS specificity
- Temporary extension in Firefox requires reload after browser restart
- Font preview requires internet connection for external fonts

## Quick Command Reference
```bash
# Validate JavaScript syntax for all files (takes <1 second)
find /path/to/repo/src -name "*.js" -exec node -c {} \;

# Validate manifest.json syntax (takes <1 second)  
cat /path/to/repo/src/manifest.json | python3 -m json.tool

# Check extension structure (takes <1 second)
ls -la /path/to/repo/src/

# Test Google Fonts URL accessibility (takes 2-5 seconds - NEVER CANCEL)
# Note: May fail in restricted network environments - document as "network restricted"
curl -s --max-time 10 "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" | head -3 || echo "Network access restricted - use local testing"

# Count extension files (should be 7 total: 4 JS + 2 HTML + 1 JSON)
find /path/to/repo/src -type f -name "*.js" -o -name "*.html" -o -name "*.json" | wc -l

# Load extension in Chrome (manual steps - takes 1-3 seconds)
# 1. Navigate to chrome://extensions/
# 2. Enable "Developer mode" 
# 3. Click "Load unpacked"
# 4. Select src/ directory

# Load extension in Firefox (manual steps - takes 2-4 seconds)  
# 1. Navigate to about:debugging
# 2. Click "This Firefox"
# 3. Click "Load Temporary Add-on"
# 4. Select src/manifest.json
```

## Important: What NOT to Do
- DO NOT try to run npm install or any package manager commands
- DO NOT add build scripts or compilation steps
- DO NOT modify manifest.json version without understanding extension publishing
- DO NOT add external dependencies or CDN links
- DO NOT use ES6 modules (not supported in Manifest V3 content scripts)
- DO NOT commit temporary browser profile data or extension packages

## Troubleshooting Common Issues

### Extension Won't Load
- Verify manifest.json syntax with `cat manifest.json | python3 -m json.tool`
- Check that all referenced files exist in correct paths
- Ensure no syntax errors in JavaScript files

### Font Changes Don't Apply
- Check browser console for content script errors
- Verify font URL is accessible and valid
- Test on simple websites first (example.com)
- Check if site is in exclusion list

### Options Page Blank/Broken
- Check for JavaScript errors in browser console
- Verify all HTML file paths are correct
- Test with fresh extension reload
