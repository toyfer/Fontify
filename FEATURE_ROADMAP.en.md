# Fontify Feature Addition Roadmap

## Overview
This document provides a detailed plan for future feature additions to the Fontify browser extension. Features are categorized by priority and implementation complexity to guide development efforts.

## Current Features

### Implemented Features
- ✅ Web font replacement via URL
- ✅ Exclusion URL list management
- ✅ Add to exclusion list from popup
- ✅ Font file caching functionality
- ✅ Chrome/Firefox compatibility (Manifest V3)
- ✅ Modern UI with Bulma CSS

## Planned Features

### Priority: High (Short-term implementation: 1-2 months)

#### 1. Font Preview Functionality
**Description**: Display font preview before applying
**Implementation**:
- Sample text preview in options page
- Real-time font switching display
- Multiple sample characters (alphanumeric, hiragana, katakana, kanji)

**Technical considerations**:
```javascript
// Font preview implementation example
function updateFontPreview(fontUrl) {
  const previewElement = document.getElementById('fontPreview');
  previewElement.style.fontFamily = `url('${fontUrl}'), sans-serif`;
}
```

#### 2. Font Preset Management
**Description**: Save and switch between multiple font configurations
**Implementation**:
- Named font preset storage
- Preset list display and selection
- Default preset configuration

**Storage structure**:
```json
{
  "fontPresets": [
    {
      "name": "Gothic",
      "fontUrl": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP",
      "excludeUrls": ["example.com"]
    }
  ],
  "activePreset": "Gothic"
}
```

#### 3. Improved Error Handling
**Description**: Proper handling of font loading failures
**Implementation**:
- Font URL validation
- Fallback on loading failure
- Clear error messages for users

### Priority: Medium (Medium-term implementation: 2-4 months)

#### 4. Google Fonts API Integration
**Description**: Direct search and selection of Google Fonts
**Implementation**:
- Fetch font list from Google Fonts API
- Font search functionality
- Category-based filtering

#### 5. Site-specific Font Settings
**Description**: Different font configurations per domain
**Implementation**:
- Domain-specific rule configuration
- Priority-based rule application
- Regular expression pattern matching

**Data structure**:
```json
{
  "siteSpecificRules": [
    {
      "pattern": "*.github.com",
      "fontUrl": "coding-font.woff2",
      "priority": 1
    }
  ]
}
```

#### 6. Font Adjustment Options
**Description**: Font size and weight adjustment features
**Implementation**:
- Font size scaling options
- Font weight adjustments
- Line height adjustment options

#### 7. Dark Mode Support
**Description**: UI dark mode toggle
**Implementation**:
- Options page dark mode
- Popup dark mode
- System setting integration

### Priority: Low (Long-term implementation: 4-6 months)

#### 8. Settings Import/Export
**Description**: External file save/load for settings
**Implementation**:
- JSON format settings export
- Settings file import functionality
- Partial settings merge

#### 9. Performance Optimization
**Description**: Improve extension performance
**Implementation**:
- Font loading optimization
- Cache strategy improvements
- Memory usage reduction

#### 10. Detailed Statistics
**Description**: Font usage analysis
**Implementation**:
- Font application count statistics
- Site-specific usage frequency
- Performance metrics

#### 11. Keyboard Shortcuts
**Description**: Keyboard operation for functions
**Implementation**:
- Font switching shortcuts
- Exclusion list addition shortcuts
- Settings page display shortcuts

### Technical Improvement Items

#### A. Architecture Improvements
- Modularized code structure
- TypeScript adoption consideration
- Unit test additions

#### B. Security Enhancements
- CSP (Content Security Policy) compliance
- Enhanced font URL validation
- XSS attack prevention

#### C. Compatibility Improvements
- Legacy browser version support
- Different site structure adaptation
- Mobile browser support consideration

## Implementation Schedule

### Phase 1 (1-2 months): Basic UX Improvements
- Font preview functionality
- Font preset management
- Error handling improvements

### Phase 2 (2-4 months): Advanced Features
- Google Fonts API integration
- Site-specific font settings
- Font adjustment options
- Dark mode support

### Phase 3 (4-6 months): Advanced Features and Optimization
- Settings import/export
- Performance optimization
- Detailed statistics
- Keyboard shortcuts

## Development Considerations

### 1. Browser Compatibility
- Maintain Chrome/Firefox dual support
- Continue Manifest V3 compliance
- Implement fallbacks for new APIs

### 2. Performance
- Optimize font loading speed
- Monitor memory usage
- Limit CPU usage

### 3. Usability
- Intuitive UI design
- Accessibility compliance
- Multi-language support consideration

### 4. Security
- External resource loading safety
- User data protection
- Permission minimization

## Success Metrics

### Short-term Goals
- Improved user satisfaction
- Higher setup completion rate
- Reduced error occurrence rate

### Long-term Goals
- Increased active user count
- Improved extension review ratings
- Increased community contributors

## Summary

This roadmap provides a plan to systematically improve the Fontify extension and enhance user experience. By implementing features based on priority, we can achieve efficient development and stable releases.

It's important to regularly review the roadmap and adjust it based on user feedback and technological changes.