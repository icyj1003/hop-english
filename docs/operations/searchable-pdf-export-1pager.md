# Searchable PDF Export 1-Pager

## Background

HOP renders the document to SVG, and the desktop crate then builds the PDF by combining `svg2pdf` and `pdf-writer` directly.
This path cleans up font fallback to match HOP policy, but it hard-codes `embed_text: false`, which converts every glyph to a path.
As a result, text in the PDF cannot be searched or selected.

rhwp v0.8.4 provides a native API that converts multi-page SVG into a searchable PDF and corrects `ToUnicode`.
There is no reason for HOP to duplicate the same PDF assembly protocol.

## Problem

- PDF export does not preserve text.
- HOP and rhwp each implement page assembly, object reference renumbering, and PDF metadata.
- Because of the duplicate implementation, upstream PDF accessibility and compatibility improvements do not reach HOP automatically.

## Goal

- Make text in exported PDFs searchable and selectable.
- HOP owns only restricted font fallback and file saving/progress.
- Delegate PDF encoding, font embedding, and multi-page assembly to rhwp.

## Non-goals

- Do not change other PDF backends or export features at the same time.
- Do not newly adopt the direct Skia PDF backend.
- Do not change the PDF export UI or the page range protocol.

## Constraints

- Use the same path on macOS, Windows, and Linux.
- Do not newly embed restricted fonts in the PDF.
- Native file writes must be atomic and keep the existing progress events.
- Do not modify `third_party/rhwp`.

## Implementation outline

1. The desktop app renders page SVGs and applies restricted font fallback as before.
2. A small semantic API in `rhwp-adapter` passes the cleaned SVG list to the rhwp v0.8.4 PDF API.
3. The adapter always enables text embedding and passes only the extra font directories HOP discovered as options.
4. Remove the desktop `svg2pdf`/`pdf-writer` assembly code and its direct dependencies.

## Verification plan

- An options regression test confirms the searchable PDF protocol uses `embed_text=true`.
- Export sample HWP/HWPX files and confirm text can be extracted with `pdftotext` or an equivalent parser.
- Run the desktop/Quick Look tests, clippy, the upstream contract, and a debug build.

## Rollback and recovery

Remove the adapter call and restore the previous desktop conversion path. File writing and the command protocol
do not change, so there is no migration of saved documents or user settings.
