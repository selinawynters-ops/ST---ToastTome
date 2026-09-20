# Changelog

All notable changes to Toast Tome are documented here.

## [1.0.4] - 2026-09-20

### Added

- A slow unread lantern pulse animation for the Toast Tome badge.
- A persisted **Pulse On** / **Pulse Off** footer pill so users can disable the animation when it conflicts with a SillyTavern fork.
- Mobile sizing rules for the new pulse control.

### Changed

- The unread badge animation now only runs when unread notifications exist and pulse animation is enabled.

## [1.0.3] - 2026-09-20

### Added

- A Grimoire-styled **Concealments** manager inside the existing Toast Tome panel.
- An **Allow Again** control for restoring individual suppressed toast patterns.
- A **Restore All** control for clearing all suppressions at once.
- Responsive desktop and mobile styling for the new manager.
- Escape-key and Return-button navigation back to toast history.
- An empty state that clearly confirms when no notices are concealed.

### Fixed

- Suppressions can now be reversed after their original history entries have expired or been erased.
- Users no longer need access to the original toast card to remove a persisted suppression.

## [1.0.2]

- Previous release before versioned release notes were introduced.
