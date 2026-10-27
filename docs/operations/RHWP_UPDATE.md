# rhwp update runbook

This document is the checklist to follow when moving the stable `rhwp` release HOP uses to a new version.
For the boundary design and ownership principles, see [`UPSTREAM.md`](../architecture/UPSTREAM.md).

## What an update changes

`pnpm upstream:update -- <tag>` aligns the following as one candidate:

* the `third_party/rhwp` submodule pointer
* the version, tag, commit, Rust, and WASM generator baselines in `config/rhwp-upstream.json`
* the WASM package and provenance in `apps/studio-host/vendor/rhwp-core`
* the HOP-owned `[patch]` declarations and `Cargo.lock` for desktop and Quick Look
* studio assets mirrored from upstream
* the upstream counterpart hashes in `config/rhwp-studio-overrides.json`

Do not edit files in `third_party/rhwp` directly or add HOP features inside it.

## 1. Before you start

1. Pick the stable tag to move to from upstream GitHub Releases. Use only an explicit `vX.Y.Z` release tag;
   never a branch, `main`, or a prerelease tag.
2. Start the work on a separate branch, and confirm there are no unfinished changes in the files the update tool
   owns.

   ```sh
   git status --short
   git -C third_party/rhwp status --short
   ```

3. Prepare the submodule and JS dependencies from the current lockfile.

   ```sh
   git submodule update --init --recursive
   pnpm install --frozen-lockfile --lockfile=true
   pnpm upstream:verify
   ```

4. Confirm that `wasmPackVersion` in `config/rhwp-upstream.json` matches your local `wasm-pack --version`.
   The update tool picks the Rust toolchain from the candidate's upstream `rust-toolchain.toml`.

## 2. Create the candidate

```sh
pnpm upstream:update -- vX.Y.Z
```

The tool fetches the exact tag from the official `edwardkim/rhwp` origin and moves to it as a detached commit.
It builds the WASM fresh in a temporary directory, updates the Cargo lockfiles, provenance, and override baseline, and then
re-verifies the whole upstream contract. It cannot reuse the existing vendored WASM or skip the generation step before
verification.

If you are intentionally upgrading `wasm-pack` itself, allow it once as below, and only after reviewing the new version's
reproducibility and the resulting diff.

```sh
HOP_ALLOW_WASM_PACK_VERSION_CHANGE=1 pnpm upstream:update -- vX.Y.Z
```

Do not use this environment variable for ordinary rhwp updates.

## 3. Review the generated diff

```sh
git status --short
git diff --submodule=log -- third_party/rhwp
git diff -- config/rhwp-upstream.json config/rhwp-studio-overrides.json
git diff -- apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/Cargo.lock
git diff -- apps/desktop/quicklook/rust/Cargo.toml apps/desktop/quicklook/rust/Cargo.lock
git diff -- apps/studio-host/vendor/rhwp-core/PROVENANCE.json
```

Check that:

* the tag, commit, Cargo package, studio package, and vendored WASM versions all match.
* the provenance lists the byte count and SHA-256 of every shipped vendor file.
* the patch Git source/revision or upstream vendor path/version in both Cargo manifests and `rhwp` in the lockfiles point to the same new version. If upstream
  moved the patch repository, the updater must switch both manifests from the old contract to the new one together.
* each file in the `Review changed studio inputs` list the updater prints has been compared with the upstream diff.
* changes to `extension` or `fork` counterparts do not break the assumptions of HOP adapters and overrides.
* HOP no longer references commands, imports, public assets, or native APIs that disappeared upstream.
* new upstream features are not automatically exposed under HOP product policy. File format, save, print, window, and recovery behavior
  are adopted only after a separate decision.

If upstream provides `svg2pdf` as a vendor path, both native manifests use the relative path from each manifest to
`third_party/rhwp/vendor/svg2pdf`. The baseline records the upstream-relative path and
package version. The source is pinned to the upstream commit, and the verifier checks the checkout for
tracked changes and untracked additions, path escapes, and a single local package in the lockfile. Older
baselines that use a Git patch keep the existing source/revision verification.

Classify each changed counterpart in this order:

1. If upstream absorbed the HOP workaround, remove the override, alias, baseline, and dedicated tests together.
2. If only product policy remains, shrink it to a small adapter/extension that composes public APIs.
3. If it is an independent desktop feature, keep it as a contribution.
4. Keep a fork only when upstream internals must still be copied, and update the manifest reason and verification responsibility.

In particular, do not reimplement renderer lifecycle, page positioning, the ruler, undo/snapshot, or validation repair in the host.
Use upstream's public protocols, and have HOP inject at the boundary only the policies the product owns, such as backend choice, native session, and font authoring.

Put compatibility fixes first in `apps/studio-host/src/upstream`, a HOP contribution, or
`apps/desktop/rhwp-adapter`. Copying a whole upstream file is the last resort; if a new override is needed,
record its strategy and reason in the manifest.

## 4. Automated verification

Use the `rustToolchain` value from `config/rhwp-upstream.json` for the Rust toolchain upstream requires.
Replace `<toolchain>` in the examples below with that value.

```sh
pnpm install --frozen-lockfile --lockfile=true
pnpm upstream:verify
RUSTUP_TOOLCHAIN=<toolchain> pnpm test
RUSTUP_TOOLCHAIN=<toolchain> pnpm run clippy:desktop
pnpm run build:studio
RUSTUP_TOOLCHAIN=<toolchain> pnpm --filter hop-desktop tauri build --debug --bundles app
git diff --check
```

If `build:studio` or Vitest fails with a native binding error from the Codex app's bundled Node, adjust `PATH` so an external Node 24
is picked first, confirm with `which node`, and run again.

## 5. Product smoke test

At minimum, verify these flows with real documents on your current development OS:

* opening HWP and HWPX, drag/drop, recent documents
* saving HWP after editing, reopening, and the unsaved-document replace/quit guards
* handling conflicts from external file changes
* document and event isolation across new and multiple windows
* local font lookup/application and document rendering
* PDF export, page ranges, printing
* macOS Quick Look preview/thumbnail

For a release candidate, pass the macOS, Windows, and Linux CI, and smoke-test the core file, window, and print flows on
at least one of Windows or Linux besides macOS. Do not substitute success in one local environment for per-OS GUI
verification.

## 6. Failure and recovery

If the update command fails, it automatically restores the backed-up HOP-owned outputs and the previous submodule commit. After a
failure, check the recovery result with:

```sh
git status --short
pnpm upstream:verify
```

If you get an `AggregateError` saying automatic recovery also failed, keep both errors recorded in the output and do not overwrite
files by hand. Back up the current changes first, then recover based on the original gitlink and lockfiles.
Do not recover with `git reset --hard`, force pushes, or moving tags.

## Done criteria

* The update target is pinned to an immutable stable tag and exact commit from the official source.
* Every output the updater manages and both Cargo dependency graphs use the same rhwp.
* Changed counterparts were reviewed, and any needed compatibility fixes live inside HOP-owned boundaries.
* Automated verification and the required platform smoke-test results are recorded in the work log.
* `third_party/rhwp` is clean inside, with no unintended generated or temporary files.
