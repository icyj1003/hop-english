# rhwp v0.8.7 Integration Plan

Written: 2026-10-07. Status: implementation and local automated verification complete. Per-OS GUI verification before release remains.

## Background

HOP v0.4.4's upstream baseline is rhwp v0.8.4
(`496333b27d21ddb9114ba9ae340bcb895870c9a7`). The latest stable version on the official Releases is
v0.8.7, published 2026-10-06, and the remote tag points to
`1a76570e833917d15817415a53c09ad61ab3203f`.
The update goes directly from v0.8.4 and includes the v0.8.6 changes as well.

Sources: [v0.8.7 release](https://github.com/edwardkim/rhwp/releases/tag/v0.8.7),
[v0.8.6 release](https://github.com/edwardkim/rhwp/releases/tag/v0.8.6),
[target Cargo manifest](https://github.com/edwardkim/rhwp/blob/v0.8.7/Cargo.toml),
[Studio command contract](https://github.com/edwardkim/rhwp/blob/v0.8.7/rhwp-studio/src/command/types.ts).
The procedure follows the [update runbook](RHWP_UPDATE.md).

## Problem

Swapping only the tag and WASM cannot align the native PDF dependency and the HOP Studio contract.
The submodule in the current checkout is not initialized, so local upstream verification cannot run yet either.
Comparing the files at the remote stable tag with HOP code confirmed the following:

| Change found | Impact on HOP and response |
| --- | --- |
| Upstream's `svg2pdf` patch moved from Git to the `vendor/svg2pdf` path | The updater's `resolveHopCargoPatches()` accepts only Git lock sources. As is, candidate creation is expected to stop. Both the desktop and Quick Look top-level manifests must apply the new patch. |
| `CommandServices.refreshDocumentStatus()` added as required | The services creation in `host/command-runtime.ts` and the test fixtures need a real status-refresh hookup. Do not satisfy the type with an empty function. |
| All 8 tracked counterparts changed | Review all of `core/font-loader`, `core/local-fonts`, `command/shortcut-map`, `command/commands/edit`, `command/commands/file`, `ui/about-dialog`, `ui/dialog`, `ui/toolbar`. Updating hashes does not mean the review is done. |
| Host font provider wiring and measurement/output improvements | HOP does not run upstream `main.ts`. Check whether the new font provider wiring is needed in the HOP bootstrap too, and verify it together with the native font and authoring policies. |
| Nullable contract change for the `RendererSession` CanvasKit preflight callback | Check the HOP Canvas2D lifecycle and related types/imports. Changing the backend is out of scope. |
| Upstream Rust internal crate split and dependency changes | Confirm the new path crates resolve correctly in both native graphs and the WASM. Also verify the Skia changes in builds with `native-skia` enabled. |
| Studio dependency requirement changes | Check the actually consumed imports/APIs such as `@noble/hashes` and `canvaskit-wasm`. Adjust the HOP manifest and pnpm lockfile together only when needed. |

## Goal

- Align the submodule, generated WASM/provenance, baseline, and desktop/Quick Look dependency graphs to v0.8.7.
- Consume the save, table editing, input safety, and layout improvements together with HOP's file/session/font/print policies.
- Delete workarounds upstream has absorbed and keep the remaining policies as thin adapters.
- Record automated verification and real-document verification results separately.

## Non-goals

- Directly modifying upstream source, changing the HOP version, or running commits, tags, or releases.
- Adopting new product features wholesale, such as an English UI, HTML/Word export, agent/CLI, or browser autosave.
- Switching to CanvasKit or enabling exact font/compatibility opt-ins by default.

## Constraints

- Use pnpm and an external Node 24. Keep the target Rust at the current `1.93.1` and wasm-pack at `0.14.0`.
- Side effects for files, saving, PDF, printing, and windows are owned by the Rust/native bridge.
- Preserve macOS, Windows, and Linux, and do not touch unrelated changes.
- Outputs the updater protects must be clean before running. Verify updater compatibility fixes first and
  keep changes per file. Do not clean up with broad reset/stash.

## Implementation outline

1. **Prepare the current baseline**: initialize the submodule at the existing gitlink, do a frozen pnpm install, and run
   `pnpm upstream:verify`. Record tool versions and any existing failures.
2. **Fix the updater first**: review the upstream vendor patch contents and provenance. Add a path patch form to the existing Git patch
   contract, allowing only verified paths inside the submodule. Generate, for the desktop and
   Quick Look manifests, relative paths from each manifest. Adjust the config, verifier, lock checks,
   update tests, and operations docs together. Keep the existing Git pin support.
   Vendor path packages have no Git source in the lockfile, so the contract is checked through path, package version, pinned commit, and a clean checkout.
   Verify rollback on success and failure with focused tests.
3. **Create the candidate**: run `pnpm upstream:update -- v0.8.7`. Re-confirm that the tag matches the commit above
   and generate the WASM fresh. Review the diffs of both Cargo locks, the patch, assets, provenance, and the
   counterpart baseline.
4. **Studio compatibility fixes**: review the 8 counterparts and the bootstrap/bridge/renderer/command public APIs
   against v0.8.4. Connect `refreshDocumentStatus` to HOP's post-save document name/status refresh.
   Check the font provider/measurement, IME, overwrite mode, search, and table clipboard/undo contracts.
   If a workaround has been absorbed, remove its override, alias, and dedicated tests together.
5. **Native compatibility fixes**: check the DocumentCore, paragraph split, thumbnail, and PDF APIs in `rhwp-adapter` and
   the desktop/Quick Look call sites. Confirm with the dependency tree that the PDF stitching vendor fix is
   actually selected in both native graphs.
6. **Verify and record results**: perform the verification below in order and fix important failures.
   When changes are done, if needed, have the repository's designated review model, GPT-6.1 Sol, directly review the boundary, saving, and rollback.

## Verification plan

First run the focused tests for the updater/path patch contract and the related command/font/bridge tests.
Then, with the Rust toolchain set to `1.93.1`, run:

```sh
pnpm upstream:verify
pnpm test
pnpm run clippy:desktop
pnpm run build:studio
pnpm --filter hop-desktop tauri build --debug --bundles app
git diff --check
```

Compare real documents with the v0.8.4 results from before the change. Preserve originals and verify save round-trips on copies.

| Verification scope | Done when |
| --- | --- |
| HWP/HWPX open, edit, save, reopen | Content, structure, tables, and headers/footers are preserved. Do not judge failure only on saved byte differences. If possible, also check the saved copy in Hancom. |
| Nested/rowspan/consecutive TAC tables and page splitting | No missing, overlapping, or border regressions, and Enter after a table, select, delete, paste, and undo work normally. |
| Korean IME, find/replace, hyperlinks | No regressions in composition input and cancel, nested cell search, or link saving and PDF preservation. |
| Local/bundled/missing fonts | Native font discovery, application, fallback, and HOP authoring restrictions are kept, and screen and PDF results are consistent. |
| PDF, printing, Quick Look | Check searchable/copyable Korean text, links, page ranges, multi-page stitching, and preview/thumbnail. |
| HOP product flows | Drag/drop, recent documents, multi-window isolation, the unsaved guard, external change conflicts, and title refresh after saving work normally. |
| Input failures | Representative damaged/excessive input is safely rejected, and a normal document can be opened afterward. Private document content is never logged. |

Before release, check all macOS, Windows, and Linux builds/CI, and additionally check the core file, window, and print GUI flows on
at least one of Windows or Linux besides macOS. Run the workflow without creating a release.
OS verification that could not be performed stays marked incomplete.

## Rollback / recovery

- If the updater fails, after the automatic restore of the existing files and the v0.8.4 commit, check the status and the upstream contract.
- If a product regression is not resolved after a successful candidate, restore only the outputs and compatibility fixes owned by this work
  to their pre-work state. The modified updater supports both the Git and path contracts, so also verify the previous Git baseline.
- If automatic recovery fails, preserve the error and the current changes, then recover per file. Do not rewrite history.

Done criteria: all upstream outputs aligned, changed counterparts reviewed, important regressions resolved, required verification results recorded,
submodule clean inside.

## Implementation / verification results

### Full change re-review and improvements

Keeping a separate vendor content hash for a read-only submodule managed by a pinned commit duplicates the baseline for the same source
and also keeps per-file Git subprocesses and circular re-exports. The goal is to unify the verification baseline while keeping the existing
Git patch support and the safe update/recovery contract.
The Cargo patch module is imported directly, and the vendor path/version is guaranteed by the pinned commit and a clean checkout.
Tracked modifications, untracked additions, and path escapes are checked with focused tests and upstream verify.
Studio code, generated WASM, the Cargo graph, and product policy are kept.
If verification fails, only this re-review's changes are reverted; the upstream tag is never moved and the source is never modified.

With the simplification above applied, `pnpm run test:upstream` (34 tests), `pnpm upstream:verify`, and
`git diff --check` passed again. Studio/native code was not modified in this re-review, so
the existing test/build results below stand and were not re-run. GPT-6.1 Sol directly reviewed the full change and
the verification design change and found no significant problems.

- An explicit `pnpm upstream:update -- v0.8.7` run updated the target commit, WASM, provenance,
  counterpart baseline, and the desktop/Quick Look Cargo graphs. The upstream tree is clean.
- The updater and verifier support both the existing Git pin and the vendor path. They verify path containment,
  package name and version, the pinned commit, and a clean checkout.
  Vendor package versions inherited from the workspace are handled too.
- Applied the contracts for post-save status refresh, the new renderer font API, IME physical-key shortcuts, keyboard toolbar activation,
  input focus after a modal closes, and style toolbar overflow.
  HOP's native font and authoring policies and the blocking of HTML/Word export were kept.
- The existing large bootstrap/toolbar files were modified only where needed to connect upstream contracts and HOP policy.
  The file structure was not reorganized just for this change, and the new Cargo patch module was split out.
- Verified with Node 24.4.1, pnpm 10.33.0, and Rust 1.93.1.

| What was run | Result |
| --- | --- |
| `pnpm upstream:verify` | v0.8.7 contract and generated outputs verified |
| `pnpm run test:upstream` | 34 passed, including Git/path switching, provenance, boundary |
| `pnpm run test:studio` | 145 passed |
| `pnpm run test:desktop` | 81 passed (lib 60, integration 21) |
| `pnpm run test:quicklook:macos` | 6 passed with native-skia enabled |
| `pnpm run clippy:desktop` | passed with warnings treated as errors |
| `pnpm run build:studio` | passed, with existing chunk size and dynamic import warnings |
| `pnpm --filter hop-desktop tauri build --debug --bundles app` | macOS HOP.app and Quick Look build passed |
| Chromium run check | confirmed v0.8.7 initialization, new document input and render, the find panel, closing the character shape modal, and edit focus returning |
| WASM save round-trip | saved and reopened a synthetic Korean document as HWP and HWPX each, confirming text preservation, 1 page, and SVG rendering |
| Initial direct review (GPT-6 Sol) | no substantiated significant problems |
| Full change and verification design re-review (GPT-6.1 Sol) | no substantiated significant problems |

Cross-checking with real complex documents and Hancom, Korean IME composition, native file/print/window GUI,
and Windows/Linux build/GUI verification were not performed. The synthetic document round-trip above is not a substitute for those checks.
Run the corresponding Verification plan items before release. No commit, product version change, or release was made.
