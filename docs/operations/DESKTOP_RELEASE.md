# HOP desktop release builds

The Tauri desktop app is built in `apps/desktop/`. The release GitHub Actions workflow is `.github/workflows/hop-desktop.yml`.

Related docs:

* Upstream boundary: [`docs/architecture/UPSTREAM.md`](../architecture/UPSTREAM.md)

## Workflow behavior

`HOP Desktop Release` runs only manually.

| Trigger | Build platforms | Release |
| --- | --- | --- |
| Manual `workflow_dispatch` | macOS arm64 and macOS x64 selected by default. Windows x64, Linux x64, and Linux arm64 selected when needed | Optionally creates a draft/prerelease release |

Pull requests and tag pushes do not trigger automatic builds. Release builds are run manually in GitHub Actions, with the branch, tag, or commit SHA to build entered in `build_ref`. If `create_release` is on and `build_ref` is left empty, `release_tag` is used as the build ref. HOP desktop release tags use the `v*` namespace.

Build targets:

| Platform | Runner | Target |
| --- | --- | --- |
| macOS arm64 | `macos-15` | `aarch64-apple-darwin` |
| macOS x64 | `macos-15-intel` | `x86_64-apple-darwin` |
| Windows x64 | `windows-2025` | `x86_64-pc-windows-msvc` |
| Linux x64 | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` |
| Linux arm64 | `ubuntu-22.04-arm` | `aarch64-unknown-linux-gnu` |

Each build job prepares Rust, Node, and the Linux Tauri dependencies, installs Node dependencies from the root workspace lockfile, and then builds the bundle with `tauri-apps/tauri-action`. Upstream `rhwp` is checked out as the `third_party/rhwp` submodule.

Linux x64 and Linux arm64 explicitly keep an Ubuntu 22.04 ABI baseline. The workflow records the highest `GLIBC_*` symbol version required by the Linux desktop binary and the ELF files inside the AppImage, and fails if it exceeds `GLIBC_2.35`. When an AppImage is produced, it also runs an `--appimage-extract` smoke test on the same runner to confirm the runtime actually starts on the 22.04 baseline. Linux arm64 initially supports only the Debian/Ubuntu `.deb`.

Release creation happens only in a separate job. Regular build jobs have only `contents: read`; only the job that creates or updates the GitHub Release has `contents: write`. Apple, Tauri updater, and Windows signing secrets are not put in the workflow-wide env; they are passed only to the build steps that need them.

The homepage and README use GitHub's latest-release direct download URLs. So the release job does not upload the original bundle files Tauri produces; it uploads copies under the fixed names below to the GitHub Release.

| Platform | Release asset | Direct download URL |
| --- | --- | --- |
| macOS Apple Silicon | `HOP-macos-arm64.dmg` | `/releases/latest/download/HOP-macos-arm64.dmg` |
| macOS Intel | `HOP-macos-x64.dmg` | `/releases/latest/download/HOP-macos-x64.dmg` |
| Windows x64 | `HOP-windows-x64.msi` | `/releases/latest/download/HOP-windows-x64.msi` |
| Linux x64 Debian/Ubuntu | `HOP-linux-x64.deb` | `/releases/latest/download/HOP-linux-x64.deb` |
| Linux x64 Fedora/openSUSE | `HOP-linux-x64.rpm` | `/releases/latest/download/HOP-linux-x64.rpm` |
| Linux x64 portable | `HOP-linux-x64.AppImage` | `/releases/latest/download/HOP-linux-x64.AppImage` |
| Linux arm64 Debian/Ubuntu | `HOP-linux-arm64.deb` | `/releases/latest/download/HOP-linux-arm64.deb` |

Public downloads currently expose the signed/notarized macOS builds and the Windows MSI, with `.deb` as the default Linux link. Windows and Linux can be selected in the workflow, and when produced they are uploaded too as fixed-name assets. `HOP-windows-x64.exe`, `HOP-linux-x64.AppImage`, `HOP-linux-x64.rpm`, and `HOP-linux-arm64.deb` are uploaded when they are produced. `SHA256SUMS.txt` is generated from the fixed-name release assets and the updater assets.

The public Linux instructions recommend the `.deb` or `.rpm` package first for Korean IME stability. Linux arm64 supports the Debian/Ubuntu `.deb` first. AppImage is kept as a secondary download for users who need a portable build, with a note that Korean/English input switching can be unstable in some Wayland/IME environments.

Native packages for Arch-based distributions are not provided yet. Converting the `.deb` to an Arch package with a tool like `debtap` is a user workaround, and the conversion can produce wrong Arch dependencies such as `gtk`. Also, a binary installed this way may still be treated by the Tauri updater as a deb bundle, so later in-app updates may fail by using the `.deb` and `dpkg -i` path. The public instructions do not recommend this conversion path as an official install method.

Auto-update uses `latest.json` on GitHub Releases.

```text
https://github.com/golbin/hop/releases/latest/download/latest.json
```

The release job uploads the compressed bundles and `.sig` files for the Tauri updater as `HOP-updater-*` or under the installer file names, and makes the download URLs in `latest.json` point to that release tag's assets. The manifest includes both installer-specific keys Tauri looks up first, such as `darwin-aarch64-app`, `windows-x86_64-msi`, `linux-x86_64-appimage`, and `linux-aarch64-deb`, and fallback keys. Linux installer-specific keys must point to their own package format, and the generic `linux-x86_64` and `linux-aarch64` fallbacks point to `.deb` to match the default Linux download policy. Automatically switching an AppImage install to `.deb` through the updater is not guaranteed. The app checks this manifest at startup. If there is an update, it downloads and installs it, and restarts only when the Rust side has no dirty document sessions.

If you turn on `create_release` in a manual run, both macOS arm64 and macOS x64 must be built, because the README and homepage link directly to both macOS `.dmg` files. To prevent a public macOS release from going out unsigned, the macOS release build fails without an Apple signing certificate and notarization credentials. To check only some platforms, turn off `create_release` and run an artifact-only build.

## Manual builds

In GitHub Actions, select `HOP Desktop Release` and click `Run workflow`.

Use the platform checkboxes to build only the OSes you need. If you only need artifacts, leave `create_release` off.

To make a manual release:

1. Create and push a tag such as `v0.1.0` locally first.
2. Select `HOP Desktop Release` in GitHub Actions.
3. Turn on `create_release`.
4. Enter a tag such as `v0.1.0` in `release_tag`.
5. Optionally enter the same tag in `build_ref`. If left empty, `release_tag` is used.
6. Check the macOS arm64 and macOS x64 boxes.
7. Keep `release_draft` on until you have checked the artifacts.
8. Turn on `prerelease` only for beta/preview releases.

`release_tag` is required when `create_release` is on. If `build_ref` is also entered, it must equal `release_tag`, and `release_tag` must be in `vMAJOR.MINOR.PATCH` format. This restriction guarantees that the release is built from the chosen tag.

`release_tag` must also match `version` in `apps/desktop/src-tauri/tauri.conf.json`. For example, if the app version is `0.1.2`, the release tag must be `v0.1.2`. If they differ, the installed app can keep treating itself as needing an update, so the workflow fails.

GitHub's `releases/latest` endpoint does not serve draft releases, and a prerelease is hard to use as the stable channel's latest. Treat `prerelease=true` builds as asset distribution for manual testing, and run the stable auto-update channel from published full releases.

## Releasing from a tag

A full release is made by pushing a tag and then selecting that tag in GitHub Actions.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Pushing a tag does not trigger an automatic build. Run the workflow manually in GitHub Actions with `create_release=true` and `release_tag=v0.1.0`. If `build_ref` is left empty, `release_tag` is used as the build ref.

This builds macOS arm64 and macOS x64 and creates a draft GitHub Release. After checking the artifacts and release notes, publish the draft on GitHub. If you re-run the workflow with the same tag, the existing release notes are not overwritten; only the artifacts are refreshed with `--clobber`.

## macOS signing and notarization

Unsigned macOS builds can be used for internal testing, but public releases must be signed and notarized. Apps distributed outside the Mac App Store use a `Developer ID Application` certificate.

Before making a public macOS release, you need to:

1. Join the paid Apple Developer Program.
2. Create a `Developer ID Application` certificate in Apple Developer.
3. Export the certificate with its private key as a `.p12`.
4. Create an API key for notarization in App Store Connect.
5. Register the GitHub repository secrets below.
6. Run `HOP Desktop Release` manually in GitHub Actions.

To publish a release directly from a manual run, turn on `create_release` and turn off `release_draft`. If you want to check the artifacts first, keep `release_draft` on and publish from the GitHub Releases page yourself.

Set these GitHub repository secrets:

| Secret | Required | Purpose |
| --- | --- | --- |
| `APPLE_CERTIFICATE` | Required for signing | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Required for signing | Password used when exporting the `.p12` |
| `KEYCHAIN_PASSWORD` | Recommended | Password for the temporary CI keychain. Generated automatically if empty |
| `APPLE_SIGNING_IDENTITY` | Optional | Exact signing identity. If empty, the first suitable identity among imported certificates is used |
| `APPLE_API_KEY` | Required for API notarization | App Store Connect API key ID |
| `APPLE_API_ISSUER` | Required for API notarization | App Store Connect issuer ID |
| `APPLE_API_KEY_P8_BASE64` | Required for API notarization | Base64-encoded `.p8` private key |

Create `APPLE_CERTIFICATE` from the exported certificate.

```bash
openssl base64 -A -in /path/to/developer-id-application.p12 -out certificate-base64.txt
```

Create `APPLE_API_KEY_P8_BASE64` from the App Store Connect API key.

```bash
openssl base64 -A -in /path/to/AuthKey_XXXXXXXXXX.p8 -out appstore-api-key-base64.txt
```

The App Store Connect API key method is recommended. In that case, set all three of `APPLE_API_KEY`, `APPLE_API_ISSUER`, and `APPLE_API_KEY_P8_BASE64`. If any of the three is missing, the macOS release build fails.

Tauri also supports Apple ID-based notarization. To use it, set these secrets:

| Secret | Purpose |
| --- | --- |
| `APPLE_ID` | Apple account email |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Do not store Apple credentials in `.env`. Manage CI signing information only as GitHub repository secrets or environment secrets.

The macOS release build fails unless:

* `APPLE_CERTIFICATE` is set.
* `APPLE_CERTIFICATE_PASSWORD` is set.
* a complete set of notarization credentials is set, using either the App Store Connect API key method or the Apple ID method.

## Windows signing

### Signing risk and plan

* Background: the homepage offers `HOP-windows-x64.msi` from GitHub Releases as a direct download link.
* Problem: a new unsigned `.msi` can be blocked by Edge/Windows SmartScreen as "isn't commonly downloaded" or show a warning before running.
* Goal: reduce download blocking and run warnings for the public Windows installer.
* Non-goals: bypassing users' browser security settings, or labeling unverified installers as safe.
* Constraints: release asset names must stay stable because of the README and homepage links, and signing secrets live only in GitHub repository or environment secrets.
* Implementation outline: in the short term, the homepage and README explain the cause of the warning and the Keep action in the `...` menu. For operators and advanced users, GitHub Releases keeps a checksum verification path. Before a full public release, add Windows Authenticode code signing, preferably with a certificate or Trusted Signing path that helps build reputation.
* Verification plan: on Windows, check the Edge download, the installer's signature status, the `SHA256SUMS.txt` checksum, and the GitHub Release asset names.
* Rollback or recovery notes: if the signing setup fails, keep the release as a draft and either remove the unsigned Windows asset from the public links or mark it clearly in the release notes.

Unsigned Windows builds still run, but public downloads can trigger SmartScreen warnings at the Edge download step and at the Windows run step. Attaching a Windows code signing certificate to public releases is recommended. The "isn't commonly downloaded" warning at download time does not mean the file is malicious; it is a reputation-based warning common for new installers without a signature or reputation.

A temporary procedure you can give users is below. Public pages focus on steps 1-2; checksum comparison belongs only in release docs or advanced-user instructions.

1. In the Edge downloads list, open the `...` menu for the blocked `HOP-windows-x64.msi`.
2. Choose `Keep`.
3. If an extra confirmation screen appears, check the publisher and file name, then keep it.
4. Compare the downloaded file's checksum with `SHA256SUMS.txt` on GitHub Releases.

This procedure is only a temporary workaround; the real way to reduce warnings for public releases is Authenticode signing.

Practical options are roughly:

| Option | Notes |
| --- | --- |
| EV certificate | Helps build SmartScreen reputation. Usually needs vendor-specific tooling |
| Azure Trusted Signing | Works well in CI with `signtool` or the trusted-signing CLI |
| Custom `signCommand` | Wire it to `bundle.windows.signCommand` in `tauri.conf.json` to fit your certificate/vendor |

The current workflow only makes Azure credential secrets available to the Tauri build. Actual Windows artifact signing is enabled only after adding an appropriate `bundle.windows.signCommand` to `apps/desktop/src-tauri/tauri.conf.json`.

Azure Trusted Signing usually needs these secrets:

| Secret | Purpose |
| --- | --- |
| `AZURE_CLIENT_ID` | Microsoft Entra application client ID |
| `AZURE_CLIENT_SECRET` | Client secret |
| `AZURE_TENANT_ID` | Tenant ID |

Add whatever account/profile secrets your signing provider requires along with the `signCommand`.

## Tauri updater signing

The desktop app uses `latest.json` on GitHub Releases as its update endpoint. Updater artifact generation is turned on with a `createUpdaterArtifacts=true` config override only in the release workflow, so that ordinary manual/local bundle builds do not require a signing key. Release builds need the updater private key.

1. Create a keypair.

```bash
pnpm --filter hop-desktop tauri signer generate -w ~/.tauri/hop.key
```

The public key currently in `tauri.conf.json` comes from `~/.tauri/hop.key.pub`. The same private key must keep being used so existing installs trust the next update.

2. Store the private key contents in the GitHub repository secret `TAURI_SIGNING_PRIVATE_KEY`.
3. If you set a password on the private key, store it in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. For keys without a password, the workflow signs with an empty password environment variable.
4. Build the release in GitHub Actions with `create_release=true`.
5. Check that `latest.json`, `HOP-updater-*.sig`, and `HOP-updater-*` files were uploaded to the release assets.

Always back up the updater private key. If you lose it, you can no longer send trusted updates to apps already in the field.

Auto-update at app startup does not run in debug builds. Only release builds check the updater endpoint.

## Notes

The release workflow in `../../loom` also covers runtime resource packaging, strict signing/updater verification, and a separate release script. HOP does not need that level of complexity right now.

The HOP workflow keeps the platform matrix explicit, builds from lockfiles, uses `tauri-action` only to produce artifacts, and creates the GitHub Release in a separate job with write permission.
