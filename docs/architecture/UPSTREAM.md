# Upstream boundary

HOP uses `edwardkim/rhwp` as a read-only upstream dependency.

* Upstream URL: `https://github.com/edwardkim/rhwp.git`
* Submodule path: `third_party/rhwp`
* Reference source, version, and commit: `config/rhwp-upstream.json` is the single source of truth (SSOT)
* HOP working branch: `main`

## Ownership rules

The `third_party/rhwp` submodule is treated as vendor source. Files under this folder are not edited directly to implement HOP product behavior.

Code HOP owns lives in:

* `apps/desktop/`: Tauri shell, native document session, save/export/print, window management, file associations, packaging
* `apps/studio-host/`: HOP studio host, Tauri bridge, desktop event routing, command overrides, added menus, UI fixes that will not be patched upstream
* `assets/`, `docs/`, `scripts/`, release metadata: product-level assets and operations code

The studio host pulls in upstream `rhwp-studio` through Vite aliases and shadows, at the same import path, only the files HOP must own. This keeps the default work of an upstream update down to bumping the submodule pointer plus small compatibility adjustments.

`config/rhwp-studio-overrides.json` is the reviewable list of every shadow alias. Each entry is classified as
`extension` (wraps the upstream implementation), `fork` (intentionally kept), or `contribution` (HOP-only),
with its reason recorded. Boundary tests block missing or duplicate entries and upstream counterparts that have disappeared.
The manifest's counterpart SHA-256 baseline also detects changes to upstream files targeted by extensions/forks.
The update command prints the list of changed counterparts, so review those adapters or forks first.
Mirrored public assets referenced directly by upstream CSS are synced with the same baseline and verification procedure.

Product TypeScript uses upstream APIs only through the `apps/studio-host/src/upstream` port. Command groups
are assembled as typed contributions in `apps/studio-host/src/host/command-runtime.ts`. Browser behavior for
local fonts is delegated to upstream; the Tauri extension only provides native lookup and font bytes. Rust code for the
desktop app and Quick Look depends on `apps/desktop/rhwp-adapter`, and only this adapter imports `rhwp` directly.

## Integration protocols

Each boundary owns exactly one policy and is composed through a small typed API. Instead of copying upstream
implementations, keep the protocols below.

| Protocol | Upstream owns | HOP owns | Touch points and verification |
| --- | --- | --- | --- |
| Document file/session | document bytes and editing commands | native open/save/export/print, conflict and unsaved-change guards | typed invokes in `TauriBridge` and the Rust `rhwp-adapter`; desktop tests |
| Editing commands | command implementations, snapshot/undo, `CommandServices` including `gotoPage` | command assembly, WebView clipboard and desktop shortcuts | `host/command-runtime.ts`; command-runtime tests |
| Rendering | `CanvasView`, `RendererSession`, page overlay and ruler position math | Canvas2D backend choice and host lifecycle calls | `host/renderer-session.ts`, `loadDocument()` after `prepareDocumentLoad()`; boundary tests |
| Fonts | browser font discovery and document font IDs | redistributable font catalog, native font bytes, restricted-font authoring policy | normalize selectable catalog/UI inputs while preserving existing document font lookups; font policy tests |
| UI/dialogs | general dialogs and studio UI | desktop focus, recent documents, native print, update UI | explicit extension/fork/contribution in the manifest; counterpart hash tests |
| WASM/Rust dependency | release source and API | immutable tag selection, generated WASM/provenance, both native graphs | the updater and `upstream:verify` |

Values that are product policy, such as the renderer backend choice, are decided once in a small factory. Behavior whose order
is part of the contract, such as document load, is spelled out at the call site. File and process side effects must not leak outside the bridge/native boundary.
Adapters only transform data or choose implementations; they do not reimplement upstream internal state.

Choose overrides in this order:

1. Use the upstream public API as is.
2. If the product differs, use composition or a thin extension.
3. Put independent HOP features in a contribution.
4. Fork only when a public touch point cannot express it, and record the reason and counterpart hash in the manifest.

When a counterpart changes during an update, merging the fork is not the default. First check whether upstream has absorbed the existing workaround;
if it has, delete the HOP file, alias, baseline, and tests together. If the fork must remain,
re-record the product policy and verification responsibility. There is no separate repair path that automatically fixes upstream behavior.

Because HOP does not run upstream `main.ts` as is, full-host features such as browser/PWA file handling, the embed runtime,
upstream autosave/recovery, theming, and optional CanvasKit host wiring are not adopted automatically.
These features are introduced only after a separate review of conflicts with HOP's native session and product policy. The HOP bootstrap
composes the upstream renderer/session and command APIs and adds only the native product boundary. Browser-only format-save and
print-to-PDF commands also bypass the native session, so they are explicitly excluded; HOP's Save As and PDF export own file
format selection and side effects.

The studio host override scope HOP currently owns:

* `core/bridge-factory`, `core/tauri-bridge`, `core/desktop-events`, `core/font-loader`, `core/local-fonts`: desktop runtime, file events, local/vendor font policy
* `command/commands/file`, `command/commands/edit`, `command/shortcut-map`: desktop file and clipboard commands and HOP shortcuts
* `ui/dialog`, `ui/toolbar`, `ui/custom-select`, `ui/print-dialog`: HOP UI and native print policy
* `host/renderer-session`: assembles the upstream renderer with the Canvas2D product policy
* `styles/*`, `style.css`: style overrides HOP owns
* `main.ts`: app bootstrap override kept until upstream offers a smaller bootstrap hook
* `vendor/rhwp-core`, `vite-env.d.ts`: generated WASM package and type declarations that align the upstream release WASM import boundary

## Update procedure

For the actual update, follow the preparation, diff review, verification, smoke test, and recovery checklists in the
[`rhwp update runbook`](../operations/RHWP_UPDATE.md) in order. This document only summarizes the boundary's core principles and commands.

The command that prepares a stable release tag as a candidate is below. A branch or `main` cannot be the default update
target; you must name a tag explicitly.

```sh
pnpm upstream:update -- vX.Y.Z
```

This command aligns the submodule checkout, vendored WASM, the desktop and Quick Look Cargo manifests/lockfiles,
`config/rhwp-upstream.json`, and WASM provenance together. After the candidate is created, run the commands below.
Before running, it checks that the submodule `origin` matches the baseline's official source and that protected outputs are clean;
WASM regeneration cannot be skipped. Cargo patches are kept as HOP product policy, and both native graphs are switched together to a pinned Git source/revision or vendor path
only when upstream declares the same patch.

```sh
pnpm upstream:verify
pnpm test
```

The old shell entry point remains only for compatibility and requires `UPSTREAM_REF`.

```sh
UPSTREAM_REF=v0.7.19 scripts/update-upstream.sh
```

The update tool generates the WASM package from the submodule release in a temporary directory and then
copies it into `apps/studio-host/vendor/rhwp-core`. Use the following command only when manual recovery is needed.

```sh
(cd third_party/rhwp && wasm-pack build --target web --out-dir ../../apps/studio-host/vendor/rhwp-core --release)
```

After an update, check:

* the submodule pointer diff
* that the package/provenance/hash in `apps/studio-host/vendor/rhwp-core` matches the upstream lock
* the `rhwp` version in the desktop and Quick Look Cargo.lock files and the HOP-owned Cargo patches
* type/import breakage in `apps/studio-host` overrides
* native Rust API breakage in `apps/desktop/src-tauri`
* UI/file/print/window event behavior that HOP adjusts separately

If upstream does not yet expose behavior HOP needs, solve it in the HOP adapter first. Consider a forked upstream dependency only when a needed engine API or bug fix cannot be consumed from upstream in time.

## Verification criteria

An upstream update must pass at least:

* `pnpm install --frozen-lockfile` at the repo root
* `pnpm run build:studio` at the repo root
* `cargo test` in `apps/desktop/src-tauri/`
* `cargo clippy -- -D warnings` in `apps/desktop/src-tauri/`
* `pnpm --filter hop-desktop tauri build --debug --bundles app` at the repo root

A public beta build additionally smoke-tests opening, saving, PDF export, printing, drag/drop, and multiple windows with HWP/HWPX on macOS and at least one of Windows or Linux.
