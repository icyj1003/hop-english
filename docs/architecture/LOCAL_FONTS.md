# Local font resolution rules

HOP does not modify `third_party/rhwp`; local font resolution is owned by the desktop shell and the studio host overrides.

## Goals

- Fonts actually installed in the OS take priority over HOP's bundled substitutes.
- Supported local file-backed fonts are resolved with the same rules in the editor and in PDF export, without bundling them in the repo or releases.
- Proprietary font binaries are never uploaded, logged, or bundled.

## Resolution order

1. system-installed fonts
2. supported file-backed fonts
3. HOP's bundled substitute web fonts

`apps/desktop/src-tauri/src/font_catalog.rs` owns the native font catalog and the extra scan roots. `apps/studio-host/src/core/local-fonts.ts` reads this catalog and registers, as `FontFace`, only the file-backed fonts the webview needs. `apps/studio-host/src/core/font-loader.ts` recomputes the substitute `@font-face` rules based on the set of fonts actually available.

## Supported scan roots

The default system font directories are left to `fontdb.load_system_fonts()`. Extra scanning is allowed only in bounded roots HOP owns.

- macOS: `~/Library/Fonts`
- Linux: `~/.local/share/fonts`, `~/.fonts`, and `/mnt/c/Windows/Fonts` when needed
- Windows per-user: `%LOCALAPPDATA%/Microsoft/Windows/Fonts`

Windows Hancom vendor roots such as `%ProgramFiles%/Hnc/Office*/HOffice*/Shared/TTF` are intentionally not scanned. Documents that reference proprietary Hancom/Human font names are rendered with HOP substitute fonts, but those local vendor font binaries are not exposed as authoring fonts.

## Security and license boundary

- Font file bytes are read only on the current machine and used only to register fonts in the editor webview.
- File-backed font reads are limited to the supported scan roots and the allowed extensions (`ttf`, `otf`, `ttc`, `otc`, `woff`, `woff2`).
- Proprietary font file paths and bytes are never left in telemetry, logs, or release artifacts.
- Proprietary Hancom/Human family names are excluded from the authoring font list and are normalized to HOP-safe substitute families when applying new character formatting or pasting HTML.
- The HOP repo keeps only openly licensed substitute fonts.

## Editor / PDF consistency

- Editor: distinguishes system-installed and file-backed fonts through the `list_local_fonts` + `read_local_font` Tauri commands and lazy-loads them when needed.
- PDF export: uses `font_catalog::create_pdf_font_database()` to share the same extra scan roots.

Thanks to these rules, the editor and PDF export follow the same high-level font discovery policy without touching upstream `rhwp`.
