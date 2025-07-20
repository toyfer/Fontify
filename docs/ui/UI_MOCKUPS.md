# Fontify UI Mockups and Wireframes

## Current vs. Proposed UI Layouts

### Popup Interface

#### Current Layout
```
┌─────────────────────────┐
│ Font Replacer           │
├─────────────────────────┤
│ [このページを除外リストに] │
│ [追加                 ] │
└─────────────────────────┘
```

#### Proposed Enhanced Layout
```
┌─────────────────────────────┐
│ 🔤 Fontify              [⚙] │
├─────────────────────────────┤
│ 状態: ● 有効               │
│ フォント: Noto Sans JP      │
│ このページ: 除外済み        │
├─────────────────────────────┤
│ [🔄 一時無効化]           │
│ [👁 プレビュー] [⚙ 設定]   │
│ [➕ 除外追加] [➖ 除外解除] │
└─────────────────────────────┘
```

### Options Page

#### Current Layout
```
┌─────────────────────────────────────┐
│ Font Replacer オプション             │
├─────────────────────────────────────┤
│ WebフォントURL                      │
│ [_________________________] [保存] │
│                                     │
│ 除外URLリスト                       │
│ [_________________________] [追加] │
│ • https://example.com/ [削除]       │
└─────────────────────────────────────┘
```

#### Proposed Enhanced Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🔤 Fontify 設定                              [🌙] [❓] │
├─────────────────────────────────────────────────────────┤
│ 📝 フォント設定                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 現在のフォント: [Noto Sans JP    ▼] [新規追加]     │ │
│ │ URL: https://fonts.googleapis.com/css?family=...   │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ プレビュー:                                     │ │ │
│ │ │ あいうえお ABC 123                              │ │ │
│ │ │ The quick brown fox jumps over the lazy dog.   │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ [💾 保存] [🔄 リセット] [👁 ライブプレビュー]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🚫 除外設定                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [新しい除外URL________________] [➕ 追加]           │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ ☑ *.github.com              [編集] [削除]      │ │ │
│ │ │ ☑ https://example.com/       [編集] [削除]      │ │ │
│ │ │ ☐ *.stackoverflow.com        [編集] [削除]      │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ [📁 インポート] [📤 エクスポート] [🗑 全削除]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚙ 詳細設定                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ 通知を表示                                        │ │
│ │ ☑ 自動プレビュー                                    │ │
│ │ テーマ: [自動 ▼]                                    │ │
│ │ キャッシュサイズ: [50MB ▼]                          │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Specifications

### Status Indicator Component
```html
<div class="status-indicator">
  <span class="status-dot is-success"></span>
  <span class="status-text">有効</span>
</div>
```

**States:**
- 🟢 Active (green) - フォント置換が有効
- 🟡 Paused (yellow) - 一時停止中
- 🔴 Disabled (red) - 無効
- ⚪ Loading (gray) - 読み込み中

### Font Preview Component
```html
<div class="font-preview">
  <div class="preview-text" data-font-family="CustomFont">
    <div class="size-small">小さいテキスト (12px)</div>
    <div class="size-medium">標準テキスト (16px)</div>
    <div class="size-large">大きいテキスト (24px)</div>
  </div>
  <input type="text" class="preview-input" 
         placeholder="カスタムプレビューテキスト">
</div>
```

### Notification Toast Component
```html
<div class="notification is-success is-light notification-toast">
  <button class="delete"></button>
  <div class="notification-content">
    <span class="icon">✅</span>
    <span class="message">フォントが正常に適用されました</span>
  </div>
</div>
```

**Notification Types:**
- ✅ Success (green) - 成功メッセージ
- ⚠️ Warning (yellow) - 警告メッセージ
- ❌ Error (red) - エラーメッセージ
- ℹ️ Info (blue) - 情報メッセージ

### Font Management Component
```html
<div class="font-manager">
  <div class="font-list">
    <div class="font-item is-active">
      <div class="font-info">
        <span class="font-name">Noto Sans JP</span>
        <span class="font-url">fonts.googleapis.com/...</span>
      </div>
      <div class="font-actions">
        <button class="button is-small">編集</button>
        <button class="button is-small">削除</button>
        <button class="button is-small is-star">★</button>
      </div>
    </div>
  </div>
  <button class="button is-primary">+ 新しいフォントを追加</button>
</div>
```

## Color Scheme

### Light Theme
```css
:root {
  --primary: #3273dc;        /* Bulma primary blue */
  --success: #23d160;        /* Green for success states */
  --warning: #ffdd57;        /* Yellow for warnings */
  --danger: #ff3860;         /* Red for errors */
  --info: #3298dc;           /* Blue for info */
  --background: #f5f6fa;     /* Light gray background */
  --surface: #ffffff;        /* White cards/surfaces */
  --text: #363636;           /* Dark gray text */
  --text-light: #7a7a7a;     /* Light gray text */
  --border: #dbdbdb;         /* Light border color */
}
```

### Dark Theme
```css
[data-theme="dark"] {
  --primary: #4a9eff;        /* Brighter blue for dark mode */
  --success: #2ecc71;        /* Slightly different green */
  --warning: #f39c12;        /* Orange-ish yellow */
  --danger: #e74c3c;         /* Slightly muted red */
  --info: #3498db;           /* Standard blue */
  --background: #1a1a1a;     /* Very dark background */
  --surface: #2b2b2b;        /* Dark gray surfaces */
  --text: #f5f5f5;           /* Light text */
  --text-light: #b0b0b0;     /* Muted light text */
  --border: #404040;         /* Dark border */
}
```

## Responsive Design Breakpoints

### Popup Sizing
- **Minimum**: 280px × 200px
- **Standard**: 320px × 280px
- **Expanded**: 380px × 350px (with advanced controls)

### Options Page Layout
- **Mobile** (< 768px): Single column, stacked sections
- **Tablet** (768px - 1024px): Two column layout
- **Desktop** (> 1024px): Three column with sidebar

## Animation Guidelines

### Transitions
```css
/* Standard transition timing */
.transition-standard {
  transition: all 0.2s ease-in-out;
}

/* Smooth state changes */
.status-indicator {
  transition: color 0.3s ease, background-color 0.3s ease;
}

/* Loading animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}
```

### Micro-interactions
- Button hover: 0.15s scale transform
- Input focus: 0.2s border color change
- Toast appearance: 0.3s slide-in from top
- Tab switching: 0.25s fade transition

## Icon Usage

### Primary Icons
- 🔤 Application icon (Fontify brand)
- ⚙️ Settings/configuration
- 👁️ Preview/visibility
- 🚫 Exclusion/disabled
- ✅ Success/enabled
- ⚠️ Warning
- ❌ Error/delete
- ➕ Add/create
- 📁 Import
- 📤 Export

### Action Icons
- 🔄 Refresh/reload
- 💾 Save
- 🗑️ Delete
- ✏️ Edit
- ⭐ Favorite
- 🌙 Dark mode toggle
- ❓ Help/information

This mockup provides a comprehensive visual guide for implementing the UI/UX improvements outlined in the main plan.