# Toast Tome v1.0.4 Release Note

## Commit Summary

Add unread lantern pulse animation and suppression restore controls.

## Copy-Paste Description

✨ Toast Tome v1.0.4 adds a slow unread lantern pulse so new toastr notifications are easier to notice without changing the resting icon.

When unread notifications are present, the lantern now:

- 🏮 stays full color in its resting state
- ✨ scales up slightly at the peak of the pulse
- 🌟 gains a soft amber glow using the `#c9a44a` accent color
- 🧘 avoids fading, graying out, or distracting visual noise

This also keeps the existing Conceal flow intact, including the ability to review concealed toastr entries and restore them when needed.

Users can also turn the pulse animation on or off from the Toast Tome footer with the new `Pulse On` / `Pulse Off` pill. The choice persists in SillyTavern settings, so browser refreshes, reloads, and new sessions keep the user's preference.

## Animation Example

```css
@keyframes tt-badge-pulse {
    0%, 100% {
        transform: scale(1);
        filter: drop-shadow(0 0 0 rgba(201, 164, 74, 0));
    }

    50% {
        transform: scale(1.18);
        filter: drop-shadow(0 0 6px rgba(201, 164, 74, 0.7));
    }
}

.tt-badge--pulse-enabled.tt-badge--active .tt-badge-icon {
    animation: tt-badge-pulse 2s ease-in-out infinite;
}
```

## GitHub Desktop Commit Message

```text
Add unread lantern pulse animation
```
