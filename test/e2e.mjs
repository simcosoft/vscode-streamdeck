/**
 * End-to-end protocol test. Runs the compiled plugin against:
 *  - a mock Stream Deck app (WebSocket server the plugin connects to), and
 *  - mock VS Code extensions (WebSocket clients of the plugin's message server).
 *
 * Verifies byte-level compatibility with the nicollasricas/vscode-deck
 * extension protocol: envelope { id, data }, double JSON encoding, the
 * X-VSSessionID handshake header, and active-session switching.
 *
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginEntry = path.join(projectRoot, "build", "com.nicollasr.streamdeckvsc.mac.sdPlugin", "bin", "plugin.js");
const pluginRoot = path.dirname(path.dirname(pluginEntry));

const SD_PORT = 45717; // mock Stream Deck app
// Dedicated message-server port: must not clash with the plugin actually
// installed in Stream Deck (default 48969), so tests can run alongside it.
const PLUGIN_PORT = 45719;
const settingsIni = path.join(pluginRoot, "settings.ini");

const SDK_INFO = JSON.stringify({
  application: { language: "en", platform: "mac", platformVersion: "13.0", version: "7.1.0" },
  plugin: { version: "1.0.0" },
  devices: [{ id: "dev-1", name: "Stream Deck", size: { columns: 8, rows: 4 }, type: 2 }]
});

function waitForMessage(socket, predicate, label, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for: ${label}`)), timeoutMs);

    const handler = (raw) => {
      const parsed = JSON.parse(raw.toString());
      if (predicate(parsed)) {
        clearTimeout(timer);
        socket.off("message", handler);
        resolve(parsed);
      }
    };

    socket.on("message", handler);
  });
}

function send(socket, message) {
  socket.send(JSON.stringify(message));
}

function withTimeout(promise, label, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout waiting for: ${label}`)), timeoutMs))
  ]);
}

async function main() {
  // 1. Mock Stream Deck app.
  const mockSD = new WebSocketServer({ port: SD_PORT });
  const sdSocketPromise = withTimeout(
    new Promise((resolve) => mockSD.once("connection", resolve)),
    "plugin connection to Stream Deck"
  );

  const extSockets = [];
  let sdSocket;

  // 2. Launch the plugin, pointing it at the mock Stream Deck app.
  // cwd must be the .sdPlugin folder: the SDK reads ./manifest.json relative to cwd.
  // settings.ini routes the plugin's message server to the test port; removed in `finally`.
  fs.writeFileSync(settingsIni, `[general]\nport=${PLUGIN_PORT}\n`);

  const plugin = spawn("node", [
    pluginEntry,
    "-port", String(SD_PORT),
    "-pluginUUID", "com.nicollasr.streamdeckvsc.mac",
    "-registerEvent", "registerPlugin",
    "-info", SDK_INFO
  ], { cwd: pluginRoot, stdio: ["ignore", "pipe", "pipe"] });

  const pluginLog = [];
  globalThis.__pluginLog = pluginLog;
  plugin.stdout.on("data", (d) => pluginLog.push(d.toString()));
  plugin.stderr.on("data", (d) => pluginLog.push(d.toString()));
  plugin.on("error", (error) => console.error("Plugin spawn error:", error.message));
  plugin.on("exit", (code, signal) => console.log(`Plugin process exited: code=${code} signal=${signal}`));

  try {
    sdSocket = await sdSocketPromise;

    // Plugin must register itself with Stream Deck.
    const registration = await waitForMessage(sdSocket, (m) => m.event === "registerPlugin", "plugin registration");
    assert.equal(registration.uuid, "com.nicollasr.streamdeckvsc.mac");
    console.log("✔ plugin registered with Stream Deck");

    // 3. First VS Code extension connects with the session header.
    const ext1 = new WebSocket(`ws://127.0.0.1:${PLUGIN_PORT}`, { headers: { "X-VSSessionID": "session-1" } });
    extSockets.push(ext1);
    await new Promise((resolve) => ext1.once("open", resolve));

    // Single client is auto-activated and notified via broadcast.
    const activated1 = await waitForMessage(ext1, (m) => m.id === "ActiveSessionChangedMessage", "auto-activation of ext1");
    assert.deepEqual(JSON.parse(activated1.data), { sessionId: "session-1" });
    console.log("✔ single client auto-activated (ActiveSessionChangedMessage broadcast)");

    // 4. willAppear with empty settings → plugin writes defaults back.
    send(sdSocket, {
      event: "willAppear",
      action: "com.nicollasr.streamdeckvsc.executecommand",
      context: "ctx-1",
      device: "dev-1",
      payload: { settings: {}, coordinates: { column: 0, row: 0 }, controller: "Keypad", isInMultiAction: false }
    });

    const setSettings = await waitForMessage(sdSocket, (m) => m.event === "setSettings", "default settings write");
    assert.equal(setSettings.context, "ctx-1");
    assert.deepEqual(setSettings.payload, { command: "", arguments: "" });
    console.log("✔ default settings written on willAppear");

    // 5. keyDown → active extension receives a double-encoded envelope.
    const commandReceived = waitForMessage(ext1, (m) => m.id === "ExecuteCommandMessage", "ExecuteCommandMessage to ext1");
    send(sdSocket, {
      event: "keyDown",
      action: "com.nicollasr.streamdeckvsc.executecommand",
      context: "ctx-1",
      device: "dev-1",
      payload: {
        settings: { command: "workbench.action.files.save", arguments: "{\"a\":1}" },
        coordinates: { column: 0, row: 0 },
        controller: "Keypad",
        isInMultiAction: false
      }
    });

    const envelope = await commandReceived;
    assert.deepEqual(JSON.parse(envelope.data), { command: "workbench.action.files.save", arguments: "{\"a\":1}" });
    console.log("✔ keyDown → ExecuteCommandMessage with double-encoded data");

    // 6. Second extension claims the active session; broadcasts go to all.
    const ext2 = new WebSocket(`ws://127.0.0.1:${PLUGIN_PORT}`, { headers: { "X-VSSessionID": "session-2" } });
    extSockets.push(ext2);
    await new Promise((resolve) => ext2.once("open", resolve));

    const activatedOn1 = waitForMessage(ext1, (m) => m.id === "ActiveSessionChangedMessage" && JSON.parse(m.data).sessionId === "session-2", "broadcast to ext1");
    const activatedOn2 = waitForMessage(ext2, (m) => m.id === "ActiveSessionChangedMessage", "broadcast to ext2");

    send(ext2, { id: "ChangeActiveSessionMessage", data: JSON.stringify({ sessionId: "session-2" }) });
    await Promise.all([activatedOn1, activatedOn2]);
    console.log("✔ ChangeActiveSessionMessage switches active session, broadcast to all clients");

    // 7. After the switch, key presses go ONLY to ext2.
    const toExt2 = waitForMessage(ext2, (m) => m.id === "ExecuteCommandMessage", "ExecuteCommandMessage to ext2");
    let ext1Received = false;
    ext1.on("message", () => { ext1Received = true; });

    send(sdSocket, {
      event: "keyDown",
      action: "com.nicollasr.streamdeckvsc.executecommand",
      context: "ctx-1",
      device: "dev-1",
      payload: { settings: { command: "workbench.action.files.save", arguments: "" }, coordinates: { column: 0, row: 0 }, controller: "Keypad", isInMultiAction: false }
    });

    await toExt2;
    assert.equal(ext1Received, false, "ext1 must not receive key messages after losing the active session");
    console.log("✔ key presses are routed only to the active session");

    // 8. Disconnect ext2 → remaining single client is auto-activated again.
    const reactivated = waitForMessage(ext1, (m) => m.id === "ActiveSessionChangedMessage" && JSON.parse(m.data).sessionId === "session-1", "re-activation of ext1");
    ext2.close();
    await reactivated;
    console.log("✔ remaining client auto-activated after disconnect");

    ext1.close();
    console.log("\nAll protocol checks passed.");
  } finally {
    plugin.kill("SIGKILL");
    fs.rmSync(settingsIni, { force: true });
    for (const socket of extSockets) {
      socket.terminate();
    }
    sdSocket?.terminate();
    mockSD.close();
  }
}

main()
  .catch((error) => {
    console.error("✘", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (process.exitCode) {
      console.error("--- plugin output ---");
      console.error(globalThis.__pluginLog?.join("") || "(empty)");
    }
    // Open handles (mock servers/sockets) would otherwise keep the process alive.
    setTimeout(() => process.exit(process.exitCode ?? 0), 500).unref();
  });
