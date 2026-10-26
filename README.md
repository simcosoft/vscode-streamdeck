# Stream Deck for Visual Studio Code — Node.js/TypeScript plugin

A port of the Stream Deck plugin from C#/.NET to Node.js/TypeScript using the official Elgato Stream Deck SDK (`@elgato/streamdeck`). Fully compatible with the existing VS Code extension [Stream Deck for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=nicollasr.vscode-streamdeck) — the communication protocol is unchanged.

Target platform: **macOS on Apple Silicon (ARM64)**, Stream Deck 7.1+.

## Actions

| Action | UUID | Settings |
|---|---|---|
| Execute Command | `com.nicollasr.streamdeckvsc.executecommand` | `command`, `arguments` (JSON string) |
| Execute Terminal Command | `com.nicollasr.streamdeckvsc.executeterminalcommand` | `command` |
| Insert Snippet | `com.nicollasr.streamdeckvsc.insertsnippet` | `name` |
| Change Language | `com.nicollasr.streamdeckvsc.changelanguage` | `languageId` |
| Create Terminal | `com.nicollasr.streamdeckvsc.createterminal` | `name`, `preserveFocus`, `shellPath`, `shellArgs`, `workingDirectory` |
| Open Folder | `com.nicollasr.streamdeckvsc.openfolder` | `path`, `newWindow` |

## Project layout

```
├── com.nicollasr.streamdeckvsc.mac.sdPlugin/   # plugin sources (assets)
│   ├── Images/                                 # icons (unchanged)
│   ├── PropertyInspector/                      # settings UI (unchanged)
│   ├── manifest.json
│   └── settings.ini                            # optional
├── build/
│   └── com.nicollasr.streamdeckvsc.mac.sdPlugin/   # ready-to-use plugin (generated)
│       └── bin/plugin.js                           # bundled output
├── src/
│   ├── plugin.ts                               # entry point: settings.ini, server, action registration
│   ├── actions/                                # 6 actions + base KeyAction
│   ├── server/                                 # WebSocket server for VS Code extensions
│   ├── messages.ts                             # protocol DTOs and envelope
│   └── configuration.ts                        # settings.ini
└── test/e2e.mjs                                # protocol e2e test (mock SD + mock extension)
```

## Requirements

- Node.js 24+ (for building); Stream Deck 7.1+ (its embedded Node runtime runs the plugin).
- VS Code extension `nicollasr.vscode-streamdeck` — unchanged.

## Build and verify

```sh
npm install     # reproducible via package-lock.json
npm run build   # TypeScript → build/…sdPlugin (Rollup, CJS) + asset copying
npm test        # build + protocol e2e check against mock clients
npm run pack    # com.nicollasr.streamdeckvsc.mac.streamDeckPlugin (installer)
```

The same commands are available via the [Makefile](Makefile): `make build` (default target), `make watch`, `make test`, `make pack`, `make install` (build + copy into the Stream Deck plugins directory), `make clean`. Full list with descriptions: `make help`.

The e2e test starts the message server on a dedicated port 45719 (via a temporary `settings.ini` in `build/…sdPlugin`, removed after the run), so it does not conflict with the plugin installed and running in Stream Deck, which listens on port 48969.

GitHub releases are published automatically: when a `v*` tag is pushed (the version must match `package.json`), GitHub Actions builds the project, runs the e2e test, and attaches the ready-to-install `.streamDeckPlugin` to the Release.

## Installation on macOS (Apple Silicon)

Option A — ready-made installer from GitHub (no build required):
1. Download `com.nicollasr.streamdeckvsc.mac.streamDeckPlugin` from the [Releases](../../releases) page.
2. Double-click the file → Stream Deck will offer to install it.

Option B — build the installer yourself:
1. `npm run pack`
2. Double-click `com.nicollasr.streamdeckvsc.mac.streamDeckPlugin` → Stream Deck will offer to install it.

Option C — manual (for development); `make install` performs steps 1–2 at once:
1. `npm run build`
2. Copy the folder into the Stream Deck plugins directory:
   ```sh
   rm -rf ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/com.nicollasr.streamdeckvsc.mac.sdPlugin
   cp -R build/com.nicollasr.streamdeckvsc.mac.sdPlugin ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/
   ```
3. Restart the Stream Deck app.

Development with hot reload: `npm run watch` (rebuilds and restarts the plugin).

## Settings (optional)

`settings.ini` in the `.sdPlugin` root (defaults shown):

```ini
[general]
host=127.0.0.1
port=48969
```

If you change the port, remember to update `streamdeck.serverHost`/`streamdeck.serverPort` in the VS Code settings accordingly.

## Manual on-device verification checklist

For each action: assign it to a key, fill in the settings in the Property Inspector, make sure the VS Code status bar shows `Deck | Connected | Active` (clicking the status bar activates the session), then press the key.

1. **Execute Command**: `workbench.action.files.save` → the file is saved; also try a command with JSON arguments.
2. **Execute Terminal Command**: `ls` → the command runs in the active terminal.
3. **Insert Snippet**: the name of an existing snippet → the snippet is inserted into the editor.
4. **Change Language**: `markdown` → the document language changes.
5. **Create Terminal**: with `name`/`workingDirectory` → a terminal is created; `preserveFocus` keeps the focus.
6. **Open Folder**: a folder path, `newWindow` on/off → the folder opens.
7. **Multiple windows**: open two VS Code windows → commands go only to the active window; switching focus changes the active session.
8. **Reconnection**: restart VS Code → the extension reconnects (~5 s), the plugin keeps working.
