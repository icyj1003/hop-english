# Dark Theme Integration 1-Pager

## Background

rhwp v0.8.4 provides system/light/dark settings, persistence, OS theme change detection, menu commands, and CSS tokens.
HOP uses upstream `viewCommands` and base styles, but it does not wire the theme lifecycle and menu markup into the host bootstrap,
so users cannot choose a dark theme.

## Problem

- On desktop, including Windows, the system dark theme is not initialized.
- Even though the upstream theme commands are registered, they cannot be reached from the HOP menus.
- Some HOP-only screens use fixed light colors that bypass the theme tokens.

## Goal

- Follow the system setting by default and allow explicitly choosing light/dark.
- Use the single upstream protocol for theme state and persistence.
- Make the HOP-only home screen, update notice, custom select, and font dialog use the same tokens.

## Non-goals

- Do not darken the document paper itself.
- Do not build a separate per-OS theme implementation or a native preference store.
- Do not copy or modify the upstream theme module.

## Constraints

- Use the same DOM/CSS contract on macOS, Windows, and Linux.
- The HOP bootstrap installs the theme lifecycle exactly once.
- The menu's radio state, the saved setting, and OS theme changes must stay in sync.
- `third_party/rhwp` is read-only.

## Implementation outline

1. The HOP upstream adapter re-exports the rhwp theme API.
2. The bootstrap calls `initThemeSync` once and emits theme/command change events.
3. Add the same system/light/dark command markup as upstream to the View menu.
4. Replace meaningful colors in HOP-only CSS with the existing upstream theme tokens.

## Verification plan

- Unit-test theme initialization, the saved mode, and OS media query changes.
- After a production build, check all three menu choices and on-screen contrast in the real HOP app.
- Run the full Studio test suite and build.

## Rollback and recovery

Removing the bootstrap call and the menu items returns to the previous light-only behavior. A saved upstream theme preference
is harmless and is reused on the next initialization.
