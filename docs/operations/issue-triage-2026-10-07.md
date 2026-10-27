# Open Issue Verification and Small Fixes

## Background / Problem

Reviewed 25 open issues and 1 PR. Some items already shipped in release v0.4.4 are still open,
and the local rhwp v0.8.7 integration differs from the released state. Native file open bypasses the upstream password UI
(#98), and there is no option to turn off toolbar labels (#97).

## Goal / Non-goals

Close issues with enough evidence, and verify input, theme, toolbar, PDF, and attached documents.
Implement password opening and the label option as small, independent HOP features. Upstream changes,
ad hoc OS workarounds, mobile/ARM packaging, and product version changes, commits, and releases are out of scope.

## Constraints / Implementation

- Upstream is read-only. Combine the existing password UI with the WASM atomic load.
- On cancel or a wrong password, keep the existing document and native session. Passwords are never stored or logged.
- Native save verification does not support password-protected HWP. To avoid silently removing the original's password,
  direct save is blocked, and saving under another name without a password requires an explicit notice and choice.
- The label option is implemented with a View menu item, a dedicated root attribute/CSS, and a single storage key.
- Closing follows release and real verification evidence. Fixes not yet released and unverified OSes are explicitly left open.

## Verification / Recovery

Confirm password retry, cancel, session cleanup, and the save guard with focused tests. Verify Studio/upstream
tests and build, Chromium UI behavior, and real WASM fixtures. Compare output problems using copies that preserve the
originals. Important file/session changes get a direct review from GPT-6.1 Sol.
On errors, restore only this work's files. If a GitHub close decision was wrong, reopen that issue.

## Results

### GitHub actions

On 2026-10-07, closed #90 (dark theme), #92 (searchable PDF), and #93 (toolbar alignment) as completed.
Each has v0.4.3/v0.4.4 release and existing maintainer verification records. The other 22 issues and
PR #101 remain open. No bug was closed just for being old.

### Implementation

- #98: Connected the existing upstream password dialog to browser/native file open. A wrong password retries;
  cancel keeps the existing document/session and cleans up the candidate native session.
- Direct native save of password-protected documents is blocked. Save As asks for confirmation that it converts to an HWP
  without a password, and the password save guard is released only after the save commit succeeds.
- #97: Added a show/hide labels option to the View menu. It preserves the upstream DOM and is implemented with dedicated CSS and
  a single localStorage key. It applies after relaunch and to other windows of the same origin.
- #95/#100: Confirmed these are fixed by input fixes already included in rhwp v0.8.7. No separate HOP
  workaround patch was added. That upstream integration is in local commit 2e9aaf4.

### Real verification

- 159 Studio tests passed, 34 upstream contract tests passed.
- TypeScript check and Studio production build passed. Existing bundle size/dynamic import warnings remain.
- Native `searchable_pdf_contains_a_unicode_text_map` test passed.
- With real Chromium input events, p/P/p/P all reached the document. The CapsLock P keydown was
  not swallowed. Since it was a synthetic keydown, CapsLock hardware input itself was not verified.
- On a password-protected HWP generated with real WASM, confirmed wrong password → retry → success, Enter to submit, Escape to cancel,
  preservation of the existing document/password guard, and focus returning to editing input.
- The real upstream password-protected HWP5 sample (public password 123456) opened with 64 pages.
- Confirmed label menu clicks, height 56→32px, labels hidden, no button overflow, persistence after reload,
  and storage sync between two windows. Also confirmed dark theme persists after reload.
- The public #78 attachment HWP produced SVG for all 10 pages with the current WASM. Each page has text
  elements, and page 6 also renders. Missing content/cells and real print output were not compared,
  so the issue was not closed.
- GPT-6.1 Sol direct review: no significant product defects. Reviewer's focused tests and type check passed.
- Test attachment copies were removed from the working tree, and the upstream source was not changed.

### Remaining items and verdicts

| Issue/PR | Verdict and next verification |
| --- | --- |
| #95, #100, PR #101 | p/P input confirmed on local v0.8.7. Kept open until it lands on GitHub main/release. The PR's blanket block of single-character shortcuts is unnecessary after the upstream fix. |
| #97, #98 | Implemented. On Oct 8, confirmed through the macOS native dialog, Save As, and reopening the password-converted copy. Kept open until release. |
| #78 | Rendering of the 10-page public original confirmed. Needs comparison against real Windows print/PDF output of the original. |
| #99 | Last-line clipping is not judged fixed based only on a similar upstream fix. The reported document was not attached, so the same document cannot be verified. |
| #85 | On macOS, input into new table cells displays immediately. Needs reproduction of the delay on the reported Windows environment. |
| #94 | Automatic zoom change reproduced in a ~990pt macOS window, then zoom restored at the desktop load boundary. Native re-verification passed; kept open until release. |
| #96 | Loss of the first paragraph's center alignment reproduced when copying between macOS windows. Direct WASM HTML paste preserves it, so the native delivery/conversion path needs investigation. |
| #73 | Hancom save compatibility/content damage is important. Needs the original and saved files; kept open even though old. |
| #76 | With the public attachment, confirmed picture insert, resize, and inclusion in PDF on macOS. The reported environment and other placement conditions still need verification. |
| #77, #79 | Linux IME/graphics need verification on the relevant distribution and input method environment. Not closed based on macOS results. |
| #68 | Old AppImage launch failure. Needs a launch log from the latest AppImage and reproduction on Ubuntu. |
| #70 | Needs comparison of the superscript output original with PDF/print. |
| #72 | Raspberry Pi/Wayland window maximization needs reproduction in that environment. |
| #81 | The performance issue needs the document and per-step timings. |
| #89 | Needs comparison of the Homebrew install against the official DMG's signature/assets. Not judged resolved based only on the existing release signature check. |
| #91 | Mixes several requests: page numbers, table input, selection, width adjustment. Needs per-behavior reproduction and splitting. |
| #80 | Windows ARM64 is a large task needing packaging/updater/signing and verification on real devices. |
| #102 | Multiple views of the same document is a large task needing a design for document state/undo/save ownership. |
| #50 | Android is a large task beyond the current desktop product scope. The proposal is not discarded just for being old. |

These small fixes were not committed, pushed, or released. The password feature can be removed via `document-open.ts` and its callers,
and the label feature by removing its dedicated module/CSS/menu item, so coupling with other features was minimized.

Additional native computer use results and the rationale for the #94 fix are recorded in
[Real macOS App QA](local-ui-qa-2026-10-08.md).


## Full implementation re-review and improvements

### Problem / Goal

During a long wait in the password dialog, document operations from Finder or the native menu could overlap.
Choosing Save in the quit confirmation for a password-protected HWP was blocked by the direct-save guard instead of going to the supported Save As.
Document/session ownership must be preserved, and the supported save choice must be available in the quit flow too.

### Design / Recovery

- Native public document operation entry points share one busy flag. While busy, new operations are
  rejected and the close confirmation returns false. No queue or task framework was added.
- Safe saving within an open transaction calls the private implementation and does not reacquire the lock.
  The lock is released in finally on normal completion, failure, and cancel alike.
- Browser file open and new document share a replacement flag until initialization finishes.
- Safe saving on quit/replace also routes password-protected documents to Save As. Cancelling the save-without-password confirmation
  preserves the existing document and its dirty/encryption state.
- Reassigning an empty string to the password string does not erase the immutable string, so that finally was
  removed. Cleanup of the password input DOM is handled by the existing upstream dialog, and the app does not keep the password.
- Viewport updates on label changes are left to the existing ResizeObserver. No separate event/observer was added.
- The existing bridge/main files already exceed 300 lines. This time only short entry points and guards were added at the relevant boundaries.
  Splitting the existing large files entirely is a structural change unrelated to the issue fixes, so it was not included.
  Tests also reuse the existing native filesystem/session fixtures without building separate mock infrastructure.
- On errors, revert only this change. Upstream, external APIs, and the native Rust implementation were not changed.

### Verification

- 159 Studio tests and the production build passed. Confirmed blocking of overlapping open/picker/new/save/SaveAs/PDF/
  print/close while waiting for a password, reuse after the wait ends, and blocking of opening another document while Save As is waiting.
- Quit-save approve/cancel tests for password-protected documents passed. Confirmed protection is released after a successful save and preserved on cancel.
- On a real Chromium screen, sending another file and a new document request during password entry did not change the document generation,
  and there was only one dialog. After submitting the password, it loaded normally and the next new document creation also succeeded.
- After hiding labels, both the scroll-container and the inner viewport updated from 751→775px.
- GPT-6.1 Sol's direct review found the race condition (P1) and the quit-save path (P2). After the fix, the same
  reviewer's re-review found no further significant problems. The re-review covered code and added tests, not manual OS QA.
- Each OS's real native dialogs and saving were not run manually in this re-review.
