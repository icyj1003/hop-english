# HOP docs

This directory holds HOP's development, architecture decision, and operations documents.

## Layout

```text
docs/
  DEVELOPMENT.md             local development environment and main commands
  KEYBOARD_SHORTCUTS.md      keyboard shortcut reference
  architecture/
    UPSTREAM.md              upstream rhwp boundary and update approach
    LOCAL_FONTS.md           local font resolution rules
  operations/
    DESKTOP_RELEASE.md       desktop release and signing/notarization notes
    RHWP_UPDATE.md           rhwp update checklist and recovery procedure
```

## Writing rules

* Put new feature specs under `docs/specs/<topic>/`.
* Working plans and implementation-status tracking docs are committed and then deleted once the implementation is done. Use git history as the record of completed work.
* Local development environment and commands go in `docs/DEVELOPMENT.md`.
* Architecture decisions that span several specs go in `docs/architecture/`.
* Build, release, signing, and maintenance procedures go in `docs/operations/`.
* Do not document HOP product behavior as changes to `third_party/rhwp`. Behavior HOP owns must live in `apps/desktop` or `apps/studio-host`.
