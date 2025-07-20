# Fontify Source Code

This directory contains the source code for the Fontify browser extension.

## Directory Structure

```
src/
├── manifest.json          # Extension manifest file
├── js/                   # JavaScript files
│   ├── background.js     # Service worker background script
│   ├── content.js        # Content script injected into web pages
│   ├── options.js        # Options page functionality  
│   └── popup.js          # Extension popup functionality
└── html/                 # HTML files
    ├── options.html      # Extension options page
    └── popup.html        # Extension popup UI
```

## Installation for Development

### For Chrome/Chromium:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select this `src/` directory
5. The extension should now be loaded and active

### For Firefox:
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Navigate to this `src/` directory and select `manifest.json`
5. The extension should now be loaded and active

## File Dependencies

- `manifest.json` references all HTML and JS files
- `html/options.html` references `../js/options.js`
- `html/popup.html` references `../js/popup.js`
- Content and background scripts are loaded directly by the browser

## Build Requirements

This extension uses Manifest V3 and requires:
- Chrome 88+ or Firefox 85+ for full compatibility
- No build process required - can be loaded directly as unpacked extension