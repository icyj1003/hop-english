# Developing HOP

This document collects the basics you need to run or modify HOP locally.

## Quick start

Prepare dependencies and the submodule once.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
```

Build the studio host.

```sh
pnpm run build:studio
```

Run the desktop app in development mode.

```sh
pnpm --filter hop-desktop dev
```

To produce a debug bundle, use:

```sh
pnpm --filter hop-desktop tauri build --debug --bundles app
```

## Building the Windows installer (.msi)

Requirements (Windows x64):

* Microsoft C++ Build Tools with the "Desktop development with C++" workload
* Rust via rustup, MSVC toolchain. CI pins the version in `config/rhwp-upstream.json` (`rustToolchain`); install that one with `rustup toolchain install <version>` and set `RUSTUP_TOOLCHAIN=<version>` to match CI exactly.
* Node.js 22+ and pnpm 10 (`npm install -g pnpm@10.33.0`; the repo's scripts call `pnpm` by name, so `corepack pnpm` alone is not enough)
* Long path support in git: `git config --global core.longpaths true`

Build:

```sh
pnpm install --frozen-lockfile
pnpm tauri build --bundles msi
```

`tauri build` runs `pnpm run build:before-tauri` first (studio host build; the macOS Quick Look step skips itself on Windows), compiles the Rust app, downloads WiX, and writes the installer to `apps/desktop/src-tauri/target/release/bundle/msi/`. Updater artifacts are off by default, so no signing key is needed for a local build.

## Project structure

```text
apps/
  desktop/       Tauri 2 desktop app
  studio-host/   HOP overlay on top of upstream rhwp-studio
third_party/
  rhwp/          read-only upstream submodule
assets/          icons, fonts, screenshots
docs/            specs, architecture, operations docs
scripts/         maintenance scripts
```

HOP-specific behavior lives in `apps/desktop` and `apps/studio-host`. `third_party/rhwp` is kept as an upstream submodule, and as a rule it is not modified directly for HOP product features.

> **English UI:** HOP-owned strings (menus, dialogs, status messages in `apps/`) are written in English. The rhwp-studio parts of the editor use rhwp's own language pack (`rhwp-studio/src/i18n`), and `apps/studio-host/public/locale-init.js` selects English unless the user has stored another choice in `localStorage['rhwp-locale']`. `third_party/rhwp` itself is not modified.

## Relationship with rhwp

HOP is built on `rhwp`'s document engine and web editor. HOP owns the thin product layer a desktop app needs:

* Tauri 2 app shell
* native menus wired to file commands
* Rust document session management
* atomic save
* native SVG-to-PDF export path
* webview print path
* single-instance and file-open event routing
* new window creation and per-window drag/drop handling
* a draft desktop build/release pipeline on GitHub Actions

The goal is that when upstream updates, we bump the submodule pointer and only adjust compatibility in the HOP overlay.

## Not ready yet

Before a public beta, the following still need work:

* HWPX saving is blocked for now. HWPX files can be opened, but saving is not supported until a safe HWPX serializer is ready.
* There is no autosave/recovery yet.
* External file changes are detected before saving and go through a conflict confirmation.
* Large documents still pass through a WASM mirror in places and need to move further toward a native-authoritative design.
* Signing, notarization, and the updater manifest will be enabled once release credentials are ready.

Even now, you can verify the basic desktop flow: open an HWP document, make light edits, save, and export to PDF.

## Development commands

All unit tests:

```sh
pnpm test
```

Tests for the upstream submodule update scripts:

```sh
pnpm run test:upstream
```

Studio host TypeScript tests:

```sh
pnpm run test:studio
```

Desktop Rust tests:

```sh
pnpm run test:desktop
```

Desktop Rust clippy:

```sh
pnpm run clippy:desktop
```

Updating upstream:

```sh
pnpm upstream:update -- vX.Y.Z
pnpm upstream:verify
```

## Related docs

* [Upstream boundary and update approach](architecture/UPSTREAM.md)
* [rhwp update runbook](operations/RHWP_UPDATE.md)
* [Desktop release notes](operations/DESKTOP_RELEASE.md)
