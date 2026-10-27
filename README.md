# HOP

**HOP is Open HWP**

HOP is an open-source desktop app for macOS, Windows, and Linux that lets you view and edit HWP/HWPX documents.

Document parsing and rendering are built on [rhwp](https://github.com/edwardkim/rhwp). HOP is a thin shell on top of it. Using what rhwp provides, HOP adds OS integration such as opening and saving files, PDF export, printing, and file associations.

![HOP editor](assets/screenshots/hop-editor.webp)

## What it can do

HOP currently supports:

* Opening HWP/HWPX documents
* Saving HWP documents, and Save As
* Exporting to PDF
* Opening the print dialog
* Opening files by drag and drop
* `.hwp` and `.hwpx` file associations
* Opening documents in multiple windows

## Download

Get the latest release from the links below.

* [macOS Apple Silicon (.dmg)](https://github.com/golbin/hop/releases/latest/download/HOP-macos-arm64.dmg)
* [macOS Intel (.dmg)](https://github.com/golbin/hop/releases/latest/download/HOP-macos-x64.dmg)
* [Windows x64 (.msi)](https://github.com/golbin/hop/releases/latest/download/HOP-windows-x64.msi)
* [Linux x64 (.deb, recommended for Ubuntu/Debian)](https://github.com/golbin/hop/releases/latest/download/HOP-linux-x64.deb)
* [Linux x64 (.rpm, Fedora/openSUSE)](https://github.com/golbin/hop/releases/latest/download/HOP-linux-x64.rpm)
* [Linux x64 (AppImage, portable)](https://github.com/golbin/hop/releases/latest/download/HOP-linux-x64.AppImage)
* [Linux arm64 (.deb, Ubuntu/Debian)](https://github.com/golbin/hop/releases/latest/download/HOP-linux-arm64.deb)
* [Arch Linux AUR (`hop-openhwp-bin`)](https://aur.archlinux.org/packages/hop-openhwp-bin)

The macOS build is a signed and notarized `.dmg`. You can also install it with Homebrew. The Homebrew package was contributed by [daeho-ro](https://github.com/daeho-ro).

```sh
brew install hop
```

All releases are listed on [GitHub Releases](https://github.com/golbin/hop/releases).

> The release downloads above are the upstream builds, whose UI is in Korean. To get the English UI from this translated copy, build it yourself (see [Building the Windows installer](#building-the-windows-installer-msi)).

## Installation notes

### Windows

Windows builds are not signed yet, so Edge or Windows SmartScreen may warn that the file "isn't commonly downloaded" or show a warning when you run it. Choose `Keep` from the `...` menu on the download entry to download it.

### Linux

On Linux, prefer the native package for your distribution for better Korean IME and WebKitGTK runtime stability. On arm64 Linux, the Ubuntu/Debian `.deb` is supported first. AppImage is recommended only when you need a portable build; on some Wayland/IME setups, Korean/English input switching or window display can be unstable.

Arch, CachyOS, and EndeavourOS users can install the `hop-openhwp-bin` package from the AUR. The package was contributed by [seunghun-kim](https://github.com/seunghun-kim).

```sh
yay -S hop-openhwp-bin
# or
paru -S hop-openhwp-bin
```

## Building the Windows installer (.msi)

You need, on Windows x64:

* [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload
* [Rust](https://rustup.rs/) (the MSVC toolchain, `x86_64-pc-windows-msvc`)
* [Node.js](https://nodejs.org/) 22 or later, and pnpm 10 (`npm install -g pnpm@10.33.0`)
* WebView2 (already included in Windows 10/11)

Then, from the repository root:

```sh
git config --global core.longpaths true
git submodule update --init --depth 1 third_party/rhwp
pnpm install --frozen-lockfile
pnpm tauri build --bundles msi
```

You can also build the MSI on GitHub without installing anything: push this repository to your own GitHub account, open **Actions → HOP Desktop Release → Run workflow**, tick only **Build Windows x64**, and download the `hop-desktop-windows-x64-bundle` artifact when the run finishes.

The full `rhwp` submodule is several GB because of its sample documents. If that is too slow, a sparse checkout of the pinned commit without `mydocs/`, `pdf/`, `samples/`, and `tools/` is enough to build.

Tauri downloads WiX automatically. The installer is written to `apps/desktop/src-tauri/target/release/bundle/msi/`.

See the [development guide](docs/DEVELOPMENT.md) for more detail.

## Development

Setting up a development environment, run commands, project structure, and the relationship with `rhwp` are described in the [development guide](docs/DEVELOPMENT.md).

## Credits

HOP is based on [rhwp](https://github.com/edwardkim/rhwp). Many thanks to the developer who published the HWP engine.

License: MIT
