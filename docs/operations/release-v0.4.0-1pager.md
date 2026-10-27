# HOP v0.4.0 Release 1-Pager

## Background

HOP v0.3.1 is the latest published desktop release. The 0.4.0 candidate updates the document engine to `rhwp` v0.7.19, isolates the upstream integration behind explicit adapters and compatibility baselines, and fixes HOP-owned print pagination and clipboard regressions.

## Problem

The 0.4.0 source must be verified as a complete desktop application and released from an immutable tag with signed updater metadata and stable cross-platform asset names.

## Goal

- Verify repository tests, Studio production build, Rust checks, and a macOS debug app bundle.
- Smoke-test the packaged app's document, menu, editing, clipboard, save, and print entry flows.
- Tag the verified source as `v0.4.0`.
- Build all supported release platforms through the `HOP Desktop Release` workflow.
- Inspect the draft release assets and updater manifest before publishing the stable release.

## Non-goals

- Do not patch `third_party/rhwp` for unresolved upstream renderer issues.
- Do not change signing, updater, packaging, or workflow behavior during the release unless a release gate exposes a defect.
- Do not move or recreate a pushed release tag.

## Constraints

- Use `pnpm` for JavaScript commands and dependency installation.
- Keep `v0.4.0` aligned with every HOP version source.
- Preserve stable macOS, Windows, and Linux release asset names.
- Build every platform with the Rust toolchain pinned by the `rhwp` upstream contract.
- Publish only artifacts produced by GitHub Actions from the pushed tag.

## Implementation outline

1. Run local repository, Studio, desktop, Quick Look, clippy, upstream contract, and debug bundle checks.
2. Smoke-test the packaged macOS app with a temporary document and representative issue fixtures.
3. Commit this release plan and any final release-only corrections.
4. Push `main`, create and push `v0.4.0`, then dispatch all supported platforms with tests enabled and a draft release.
5. Verify workflow completion, checksums, updater platform entries, expected assets, and release notes.
6. Publish the verified non-prerelease release.

## Release notes

This release focuses on integrating `rhwp` 0.7.19, making future upstream updates more stable, and fixing desktop editing regressions.

### Changes

- Updated the document engine to `rhwp` 0.7.19.
- Separated HOP extensions from upstream code with a clear adapter/override boundary, and added update verification tooling and a runbook.
- Fixed a command wiring regression that made the File and Edit menus unclickable.
- Restored system copy/cut for plain text and table cells, and protected the original text when it fails.
- Fixed an issue where direct printing could add a blank last page, and strengthened multi-page regression tests.
- Reorganized local font discovery and HOP-specific font policy to stay independent of upstream changes.

**Full Changelog**: https://github.com/golbin/hop/compare/v0.3.1...v0.4.0

## Verification plan

- `pnpm upstream:verify`
- `pnpm test`
- `pnpm run clippy:desktop`
- `pnpm run build:studio`
- `pnpm --filter hop-desktop tauri build --debug --bundles app`
- Windows/Linux conditional-compilation and release-matrix review
- Packaged macOS smoke test
- GitHub Actions `HOP Desktop Release` for every supported platform
- Draft asset names, updater signatures, `latest.json`, and `SHA256SUMS.txt`

## Rollback or recovery notes

If a local gate fails, fix forward and rerun all affected checks before tagging. If GitHub Actions fails after the tag is pushed, keep the release draft and fix forward without moving the tag; request explicit approval before any history or tag rewrite. Publish only after the intended tag, artifacts, checksums, and updater manifest agree.
