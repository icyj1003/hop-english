# rhwp v0.8.4 Integration and Upstream Boundary Cleanup 1-Pager

## Background

HOP v0.4.1 uses `rhwp` v0.7.19 as a read-only submodule and generated WASM. The latest stable
release, v0.8.4, greatly expands save round-trip preservation, password-protected documents, nested tables, and the rendering and editing protocols.
HOP shadows parts of the upstream studio with forks or extensions, so simply bumping the version could duplicate behavior upstream
has already fixed or bypass the new protocols.

## Problem

The current boundary mixes HOP product policy with overrides created to work around past upstream defects.
Without separating the two, every update requires manually merging large files, and HOP and rhwp end up with different save,
rendering, and editing event contracts.

## Goal

- Update rhwp to the immutable stable tag v0.8.4.
- Make the file, editing, rendering, font, and dialog protocols between HOP and rhwp explicit.
- Remove workarounds and forks that upstream has fixed, or shrink them into thin extensions.
- Have each boundary do one thing and compose through text/JSON/explicit function contracts.
- Make the next update reviewable through hash changes and focused tests.

## Non-goals

- Do not modify `third_party/rhwp` for HOP product features.
- Do not automatically expose new upstream features in the HOP UI.
- Do not change the HOP version, release channel, or release workflow in this work.
- Do not rewrite every override at once without reason.

## Constraints

- Use only pnpm, and follow Node 24 and the Rust and wasm-pack versions pinned by upstream.
- Preserve file and path behavior on macOS, Windows, and Linux.
- Native file/session/save/export/print is owned by Rust and the typed bridge.
- Side effects live in the Tauri bridge and the native boundary; studio adapters only transform and compose.
- The submodule, generated WASM, both Cargo manifests/lockfiles, and the override baseline must point to the same release.

## Implementation outline

1. Use the updater to align the submodule, WASM, provenance, Cargo manifests/lockfiles, and counterpart baseline to v0.8.4.
2. Compare changed upstream counterparts with the HOP overrides and classify them as product policy or workaround.
3. Delete workarounds that now have an upstream hook/API, and keep needed product differences as small adapters.
4. Record concretely, in the override manifest, the reason and verification responsibility for each remaining fork/extension.
5. Lock down protocol verification with a static baseline and focused unit tests.

## Decisions and result

- v0.8.4 owns page positioning, overlay retry/invalidation, renderer revision/fallback, and ruler math, so
  HOP's `view/*` fork is removed and upstream `CanvasView`/`RendererSession`/`Ruler` are composed instead.
- v0.8.4's style commands provide snapshot undo and font ID resolution, so the HOP format/style-edit fork
  is removed. The restricted-font authoring policy lives in the font catalog and an explicit UI selection boundary, and existing document
  font lookups and Format Painter keep the original IDs.
- Upstream does not call the validation auto-reflow that can produce overlapping text, so HOP's automatic repair
  modal/path is also removed and upstream's validation policy is followed.
- The updater explicitly handles pnpm's `--` CLI separator and changes to the upstream Cargo patch source. Both Cargo
  manifests, the lockfiles, the submodule, WASM, and provenance are managed as one rollback unit. The patch for PDF determinism
  is kept as HOP policy, but if upstream changes the source of the same patch, both graphs switch together.
- Native file/session/save/export/print, WebView clipboard, desktop shortcuts, asynchronous local fonts, and dialog focus
  are HOP product policy, so they stay as thin extensions or contributions.
- Upstream's browser-only format-save and print-to-PDF commands bypass the native session, so they are excluded from the command group.
  Native Save As and PDF export own format selection and side effects at a single boundary.
- Merge-undo-only paragraph metadata is not exposed in the desktop command payload; `rhwp-adapter` reduces it to the general editing
  split protocol. The shortcut fork keeps upstream's physical keys and platform conditions as they are.

## Verification plan

- `pnpm upstream:verify`, `pnpm run test:upstream`
- studio/desktop/Quick Look tests and desktop clippy
- studio build and a debug app bundle
- HWP/HWPX open, edit, save, reopen, drag/drop, multiple windows, external change conflicts
- local fonts, PDF export, printing, Quick Look smoke test
- macOS, Windows, Linux CI

## Rollback and recovery

Prefer the update tool's automatic recovery and preserve the failure state. Do not use `git reset --hard`, direct
submodule edits, or manual overwrites of generated outputs. If a regression specific to v0.8.4 is suspected, use v0.8.2 as a diagnostic
checkpoint to separate changes in the v0.8.0 line from those after v0.8.3.
