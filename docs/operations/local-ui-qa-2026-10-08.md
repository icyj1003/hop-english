# Real macOS App QA and #94 Zoom Fix

## Background / Problem

Chromium verification alone cannot guarantee the native file picker, save, and password UI, or macOS WebKit behavior.
Build the latest debug HOP.app and drive the real macOS app with computer use.
#94 reproduced as zoom going from 100→118% when the real window was shrunk from about 1197pt to 990pt and a new document was created.
Upstream CanvasView.loadDocument's mobile-oriented auto-fit for innerWidth < 1024 also applies on desktop.

## Goal / Non-goals

Verify the native paths of earlier fixes and reproducible table, picture, clipboard, and output cases.
Keep the user's chosen zoom when initializing documents on desktop. Upstream stays read-only,
mobile and upstream default policies are unchanged, and there is no commit/push/release.

## Implementation / Constraints

At the HOP assembly point initializeDocument, capture the desktop's existing zoom,
and restore it after upstream loadDocument completes. No new renderer subclass, setting, or observer
is added. The initial zoom stays 100%, and a zoom the user picks persists for later documents.
QA runs on temporary documents and copies of public upstream/issue attachments. Originals are never overwritten.
The existing tauri-bridge and main already exceed the recommended LOC, but this fix is only a short policy at the initialization boundary.

## Verification / Recovery

Check Studio tests, types, and build, and the new-document/load zoom in a 990pt window in the real HOP.app.
Get a direct review from GPT-6.1 Sol. If there is a problem, revert only this initializeDocument change.
Keep OS differences, Hancom compatibility, and non-reproduction separate from "resolved" verdicts. Individual results are recorded below.

## Results

### Environment and verification

- Built the debug HOP.app twice on this Mac. The last build includes the #94 fix, and
  TypeScript, the Studio production build, the Quick Look build, and Tauri app bundle creation all passed.
- After the #94 fix, 159 Studio tests passed. GPT-6.1 Sol's direct review found no significant issues.
- The WKWebView in macOS Tauri is not something Argent's Chromium control can drive, so native computer use was used to
  operate the app, file picker, save warnings, window switching, and print dialog directly.
- QA files are in `/tmp/hop-qa-20261008`. Only copies of public fixtures and temporary documents were used.
  Originals were not overwritten, and unsaved QA changes were discarded. Label display and window width were restored.

### Results per issue

| Target | What actually happened | Verdict |
| --- | --- | --- |
| #94 | Before the fix, a new document in a ~990pt window changed from 100→118%. After the fix it stays 100%. 110% chosen with the zoom-in button also persists after a new document and after opening a file. Showing/hiding labels keeps it at ~990pt and 1197pt. | Additional zoom fix done. Issue kept open since it is not released yet. |
| #97 | Confirmed hiding/showing labels from the View menu, height changes, and that hidden stays hidden in a new window and after relaunch. Restored to the original shown state at the end. | macOS native path verified. |
| #98 | Confirmed wrong password → retry, Escape cancel keeps the existing document, and the correct password opens 64 pages. Confirmed direct save is blocked, stays blocked after cancelling the Save As warning, and saves a separate file after an explicit choice. The converted copy reopens without a password and keeps 64 pages. | macOS native path verified. Original preserved. |
| #95/#100 | In the real native app, typing, display, and HWP saving of `pP macOS test` succeeded. Korean strings checked by pasting. | p/P verification passed. CapsLock and real Korean IME composition were not verified. |
| #85 | Typing `pP table typing123` into a cell of a new 4×5 table displayed immediately. | The 7-second delay did not reproduce on this Mac. Needs checking on the reported Windows environment. |
| #76 | Using the HWP/PNG from the public TestFile.zip, placed a picture at the signature position, enlarged it with the selection handles, and native PDF export succeeded. Poppler rendering also shows the enlarged signature picture. | Insert, resize, and missing-in-PDF did not reproduce on this Mac. The reported environment and other placement conditions remain unresolved. |
| #96 | Copying all of a centered first paragraph and a left-aligned second paragraph and pasting into an empty document in a new window turns the first paragraph left-aligned. The line spacing display is also empty. | Real defect reproduced. Not considered fixed. |

The SHA-256 of the password-protected original copy before and after saving was
`59d4bed335b9552fe78fa68d2a56f7cfa3d586bcdeaaba839af80df13f3e08dc` in both cases.
`plain-cancelled.hwp`, whose Save As warning was cancelled, was not created.

### #96 reproduction and next investigation

1. Type `Centered heading` in a new document and center it.
2. Type `Second paragraph` in the next paragraph and left-align it.
3. Press Cmd+A, Cmd+C, open a new window with Cmd+Shift+N, create a new document, then Cmd+V.
4. The target window's first paragraph becomes left-aligned, while the source window keeps the centered alignment.

Pasting two-paragraph HTML with explicit alignment and line spacing via native computer use showed the same loss.
In contrast, calling `pasteHtml` directly on the current vendor WASM with the same HTML keeps the first paragraph center/200% and
the second left/150%. Serializing the empty document to HWP and reading it back gave the same result.
So this check alone cannot confirm a core HTML parser defect or a rich clipboard write failure.
The next investigation should compare the MIME/HTML delivered by the native paste event, the upstream HTML conversion, and the WASM call arguments.
No new clipboard backend or broad upstream workaround was added before confirming this.

### Output and remaining verification scope

Cmd+P on the temporary two-paragraph document showed the macOS print dialog and a 1-page preview,
and editing resumed after cancelling. No physical print was made. This does not replace the original-table
output comparison for Windows #78. #78 is valid only up to the earlier WASM 10-page rendering check.
Reproduction documents for #99/#73/#70/#81, Linux/Windows-specific environments, and real Hancom save compatibility are still
needed. These results did not close those issues, and there was no commit/push/release.
