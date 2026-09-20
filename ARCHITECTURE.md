# 🏮 Toast Tome — Architecture & Developer Reference

> Use this file when debugging, extending, or troubleshooting Toast Tome.
> Written for AI assistants (Codex, Haiku, etc.) and human developers alike.

---

## File Map

```
SillyTavern-ToastTome/
├── manifest.json          # Extension metadata (name, version, entry points)
├── index.js               # Main extension logic
├── style.css              # Desktop styling (popup, badge, toastr override)
├── mobile-styles.css      # Responsive breakpoints (768/600/480px + touch)
├── src/
│   └── Settings.js        # Persistent settings class
├── images/                # README preview screenshots
│   ├── 01-hero-overview.png
│   ├── 02-badge-closeup.png
│   ├── 03-restyled-toasts.png
│   ├── 04-grimoire-panel.png
│   ├── 05-search-filter.png
│   └── 06-mobile-view.png
├── README.md              # User-facing docs with image previews
├── CHANGELOG.md           # Versioned release notes
└── ARCHITECTURE.md        # This file — developer reference
```

---

## manifest.json

| Field          | Value                    | Notes |
|----------------|--------------------------|-------|
| `display_name` | Toast Tome               | Shown in ST extension list |
| `loading_order`| 100                      | Loads after core extensions |
| `js`           | `index.js`               | Single JS entry point |
| `css`          | `style.css`              | Loads desktop + imports mobile-styles.css |
| `author`       | DreamTavern              | |
| `version`      | 1.0.3                    | |

---

## index.js — Main Extension Logic

### Imports
```js
import { extension_settings } from '../../../extensions.js';     // ST settings persistence
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { Settings } from './src/Settings.js';                    // Our settings wrapper
```

### Constants & State

| Variable          | Type     | Purpose |
|-------------------|----------|---------|
| `LEVEL_META`      | Object   | Maps severity levels → emoji icon, label text, CSS class |
| `liveHistory`     | Array    | In-memory history (includes onclick handlers, not serializable) |
| `totalCount`      | Number   | Running count of captured toasts |
| `suppressedCount` | Number   | Count of toasts matching the block list |
| `panelOpen`       | Boolean  | Whether the popup is visible |
| `activeFilter`    | String   | Current severity filter (`'ALL'`, `'error'`, `'warning'`, etc.) |
| `searchQuery`     | String   | Current search text (lowercased) |
| `settings`        | Settings | Persistent settings instance (wraps extension_settings) |

### Key Functions

#### `createBadge()`
- **What**: Creates the 🏮 badge element and inserts it into `#top-settings-holder`
- **DOM**: `.tt-badge` → `.tt-badge-icon` + `.tt-badge-count`
- **Behavior**: Hidden until unread captured toasts exist. Click opens the popup. Closing returns to the badge until history is cleared
- **Troubleshoot**: If badge doesn't appear, check that `#top-settings-holder` exists in your ST version

#### `updateBadge()`
- **What**: Updates the unread count number and badge visibility
- **Logic**: Reads `settings.unreadCount`; zero unread hides the badge
- **CSS class**: Adds `.tt-badge-count--wide` when count ≥ 10 (pill shape)
- **Animation**: Uses `tt-badge-pop` keyframe on count changes

#### `createPanel()`
- **What**: Creates the compact popup DOM and appends to `document.body`
- **DOM structure**:
  ```
  .tt-panel
  ├── .tt-panel-glow-top        (decorative top gradient line)
  ├── .tt-titlebar               (🏮 Toast Tome title + count badge)
  ├── .tt-toolbar                (search input + severity filter pills)
  ├── .tt-body                   (scrollable entry list)
  ├── .tt-footer                 (count + Concealments/Transcribe/Erase/Seal)
  └── .tt-suppression-manager    (suppression recovery view)
  ```
- **Event listeners**:
  - Search input → `renderEntries()` on every keystroke
  - Filter pills → sets `activeFilter`, re-renders
  - Concealments → `openSuppressionManager()`
  - Transcribe → `exportHistory()`
  - Erase → `settings.clearHistory()`, resets counters
  - Seal → `closePanel()`
  - `e.stopPropagation()` prevents outside-click close when clicking inside popup

#### `togglePanel()` / `openPanel()` / `closePanel()`
- **What**: Show/hide the popup with CSS transition
- **CSS**: `.tt-panel--open` reveals the compact floating popup
- **Outside click**: `handleOutsideClick()` listener added on open, removed on close
- **Keyboard**: ESC key closes popup (listener in `init()`)

#### `openSuppressionManager()` / `closeSuppressionManager()`
- **What**: Shows or hides the suppression recovery view inside the existing Toast Tome panel
- **Navigation**: Return button, close button, and Escape all return to history without closing the main panel

#### `renderSuppressionManager()`
- **What**: Renders every entry in `settings.hideList`, independent of toast history retention
- **Actions**: **Allow Again** removes one matching level/text pattern; **Restore All** clears the entire suppression list
- **Empty state**: Disables Restore All and confirms that no notices are concealed

#### `renderEntries()`
- **What**: Renders all toast history entries into the popup body
- **Flow**:
  1. Gets `settings.history` (reversed = newest first)
  2. Applies severity filter (`activeFilter`)
  3. Applies text search (`searchQuery`)
  4. Creates DOM for each entry with:
     - Side severity marker (`.tt-marker--tt-err` etc.)
     - Emoji icon, Cinzel title, severity tag, Space Mono body
     - Timestamp (today = "7:53 PM", older = "Apr 27 7:53 PM")
     - Copy button (⎘) → copies `[LEVEL] title: body` to clipboard
     - Suppress button (⊘) → toggles block list entry
  5. Updates footer with Roman numeral counts (`toRoman()`)
  6. Updates title badge count
- **Empty state**: Shows 📜 "The tome is empty" or "No inscriptions match"

#### `exportHistory()`
- **What**: Downloads full history as a `.txt` file
- **Format**: `[timestamp] [LEVEL] title: body` per line
- **File name**: `toast-tome-YYYY-MM-DD.txt`

#### `interceptToastr()`
- **What**: Monkey-patches `toastr.info/success/warning/error` methods
- **Flow**:
  1. Extracts title and body text from the toast request
  2. Checks block list → suppresses display if blocked
  3. Calls original `toastr[level]()` so toastr remains the app-wide notification API
  4. Calls `settings.addToHistory()` → persists to extension_settings
  5. Pushes to `liveHistory` (in-memory, includes onclick handler)
  6. Updates badge count
  7. Re-renders popup if open
- **Troubleshoot**: If toasts aren't being captured, check that `interceptToastr()` runs after toastr is loaded. The `loading_order: 100` in manifest should handle this.

#### `loadPersistedHistory()`
- **What**: On init, loads saved history from extension_settings and prunes old entries
- **Called**: Once during `init()`

#### `registerSlashCommands()`
- **Commands**:
  - `/toasttome` → toggles popup open/close
  - `/toasttome-blocks` → lists all suppressed toast patterns as a toastr info message

### Helper Functions

| Function | Purpose |
|----------|---------|
| `escapeHtml(str)` | Sanitizes strings for safe HTML insertion |
| `extractText(msgInput)` | Gets plain text from string, DOM element, or jQuery object |
| `formatTime(isoString)` | Formats ISO timestamp as "7:53 PM" (today) or "Apr 27 7:53 PM" |
| `toRoman(num)` | Converts number to Roman numeral (used in footer display) |

### Init Guard
```js
if (!isExtensionDisabled()) {
    init();
}
```
Prevents initialization if the extension has been disabled in ST settings across known install path variants.

---

## src/Settings.js — Persistent Settings

### Storage Key
All data stored under `extension_settings.toastTome` (accessed via ST's `saveSettingsDebounced()`).

### Schema

| Property         | Type    | Default | Description |
|------------------|---------|---------|-------------|
| `hideList`       | Array   | `[]`    | Suppressed toast patterns: `[{textContent, level}]` |
| `history`        | Array   | `[]`    | Persisted toast history: `[{level, title, body, timestamp}]` |
| `maxHistory`     | Number  | `200`   | Max entries before oldest are pruned |
| `maxAgeDays`     | Number  | `7`     | Days before entries auto-expire |
| `captureInfo`    | Boolean | `true`  | Whether to capture info-level toasts |
| `captureSuccess` | Boolean | `true`  | Whether to capture success-level toasts |
| `captureWarning` | Boolean | `true`  | Whether to capture warning-level toasts |
| `captureError`   | Boolean | `true`  | Whether to capture error-level toasts |
| `unreadCount`    | Number  | `0`     | Number of captured toasts still represented by the unread badge; cleared with history |

### Key Methods

| Method | What it does |
|--------|-------------|
| `save()` | Prunes history, then writes to `extension_settings.toastTome` + calls `saveSettingsDebounced()` |
| `pruneHistory()` | Enforces `maxHistory` count limit and `maxAgeDays` time limit |
| `shouldCapture(level)` | Checks if the given level is enabled for capture |
| `isBlocked(level, textContent)` | Returns true if the toast matches a block list entry |
| `addBlock(level, textContent)` | Adds a pattern to the block list |
| `removeBlock(level, textContent)` | Removes a pattern from the block list |
| `clearBlocks()` | Removes every pattern from the block list and saves |
| `addToHistory(level, title, body)` | Appends a new entry with ISO timestamp, then saves |
| `clearHistory()` | Empties history array and saves |

---

## style.css — Desktop Styling

### Structure (by section)

| Section | Lines | CSS Prefix | What it styles |
|---------|-------|------------|----------------|
| 1. Badge | ~80 | `.tt-badge*` | The 🏮 icon in the top bar + hanging notification count |
| 2. Popup | — | `.tt-panel*`, `.tt-titlebar*`, `.tt-toolbar*`, `.tt-body*`, `.tt-entry*`, `.tt-footer*` | Compact history popup |
| 3. Concealments | — | `.tt-suppression-manager*`, `.tt-manager*`, `.tt-allow-again` | Suppression recovery interface |
| 4. Toastr Override | — | `#toast-container > .toast*` | Restyled default SillyTavern notifications |
| 5. Import | top of file | `@import` | Loads `mobile-styles.css` before regular CSS rules |

### CSS Class Reference — Badge

| Class | Element |
|-------|---------|
| `.tt-badge` | Outer container (in top bar) |
| `.tt-badge--active` | Has unread toasts |
| `.tt-badge--panel-open` | Popup is currently open |
| `.tt-badge-icon` | The 🏮 emoji |
| `.tt-badge-count` | Red notification number |
| `.tt-badge-count--wide` | Pill shape for ≥10 |

### CSS Class Reference — Panel

| Class | Element |
|-------|---------|
| `.tt-panel` | Compact fixed popup |
| `.tt-panel--open` | Visible popup |
| `.tt-titlebar` | Header with ◆─── 🏮 Toast Tome ───◆ |
| `.tt-toolbar` | Search + filter pills row |
| `.tt-search` / `.tt-search-input` | Search bar |
| `.tt-pill` / `.tt-pill--active` | Severity filter buttons |
| `.tt-body` | Scrollable entry container |
| `.tt-entry` | Individual toast card |
| `.tt-entry--suppressed` | Dimmed suppressed entry |
| `.tt-marker` | Left-side severity color bar |
| `.tt-marker--tt-err/wrn/suc/inf` | Severity-specific marker colors |
| `.tt-entry-icon` | Emoji icon per entry |
| `.tt-entry-title` | Cinzel serif title |
| `.tt-severity` | Inline severity tag (ERROR/WARN/OK/INFO) |
| `.tt-severity--tt-err/wrn/suc/inf` | Tag color variants |
| `.tt-entry-body` | Space Mono body text |
| `.tt-entry-time` | Timestamp |
| `.tt-entry-actions` | Copy + suppress buttons (visible on hover) |
| `.tt-action` / `.tt-action--copy/suppress` | Individual action buttons |
| `.tt-empty` | Empty state display |
| `.tt-footer` | Bottom bar |
| `.tt-btn--ghost/danger/primary` | Transcribe / Erase / Seal buttons |

### Toastr Override Selectors

| Selector | What it overrides |
|----------|-------------------|
| `#toast-container > .toast` | Base toast: dark glass bg, blur, border-radius |
| `#toast-container > .toast::before` | Top glow gradient line |
| `#toast-container > .toast::after` | Left severity color bar |
| `#toast-container > .toast-error/warning/success/info` | Per-severity border + text colors |
| `#toast-container > .toast .toast-title` | Cinzel serif title |
| `#toast-container > .toast .toast-message` | Space Mono body |
| `#toast-container > .toast .toast-progress` | Progress bar color per severity |
| `#toast-container > .toast .toast-close-button` | Close button (amber accent) |

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Amber/Gold | `#c9a44a` | Titles, accents, ornaments, primary button |
| Purple (muted) | `#a78bfa` / `#6b6190` | Borders, pills, ghost elements |
| Deep Background | `#12101e` → `#0a0814` | Panel gradient |
| Error Red | `#f87171` / `#fca5a5` | Error markers, text, tags |
| Warning Amber | `#fbbf24` / `#fde68a` | Warning markers, text, tags |
| Success Green | `#4ade80` / `#86efac` | Success markers, text, tags |
| Info Blue | `#38bdf8` / `#7dd3fc` | Info markers, text, tags |
| Badge Red | `#ef4444` | Notification count background |

---

## mobile-styles.css — Responsive Breakpoints

| Breakpoint | Target | Key Changes |
|------------|--------|-------------|
| `≤768px` | Tablet | Panel: 380px wide, toolbar wraps |
| `≤600px` | Mobile | Panel: 100vw, ornaments hidden, toolbar stacked, actions always visible, toasts full-width |
| `≤480px` | Small phone | Compact padding, smaller fonts, 2px markers |
| `hover: none + pointer: coarse` | Touch devices | Always-visible actions, larger touch targets (32px), no sticky hover states |
| `max-height: 500px + landscape` | Landscape phone | Compressed vertical spacing |

---

## Common Troubleshooting

### Badge doesn't appear
- Check `#top-settings-holder` exists in your SillyTavern version
- Check the extension isn't in `extension_settings.disabledExtensions`
- Check browser console for JS errors during init

### Toasts aren't being captured
- `interceptToastr()` must run after `toastr` is globally available
- Check `settings.shouldCapture(level)` — all levels default to `true`
- Check block list: `settings.hideList` might be matching

### Popup doesn't open
- Check `.tt-panel` has `position: fixed` and correct `z-index`
- Check `.tt-panel--open` is being added on click
- Check for CSS conflicts with other extensions overriding `transform`

### History not persisting across reloads
- Check `extension_settings.toastTome` in browser console
- `saveSettingsDebounced()` might not be flushing — try manual save in ST
- `maxAgeDays` or `maxHistory` might be pruning entries

### Toastr styles not applying
- Check CSS specificity — all overrides use `#toast-container > .toast` with `!important`
- Another extension or theme might override with higher specificity
- Check that `style.css` is loading (manifest `"css": "style.css"`)

### Mobile layout issues
- Check that `@import url('./mobile-styles.css')` near the top of style.css is loading
- Some ST themes override `#toast-container` positioning
- Test with browser DevTools responsive mode

---

## Extending Toast Tome

### Adding a new severity level
1. Add entry to `LEVEL_META` in index.js
2. Add `.tt-marker--tt-{name}` and `.tt-severity--tt-{name}` in style.css
3. Add toastr override selectors for the new level
4. Add capture toggle in Settings.js defaults

### Changing the badge icon
- Search for `🏮` in index.js (badge creation) and style.css (filter/shadow)
- The emoji is used in: badge, popup titlebar, and README

### Adding new popup actions
- Add button in `createPanel()` HTML template
- Add event listener below the template
- Style with `.tt-btn--{variant}` pattern

### Changing persistence storage
- All persistence goes through `Settings.js` → `extension_settings.toastTome`
- To use localStorage instead, replace `save()` method
- History entries must be JSON-serializable (no DOM nodes, no functions)
