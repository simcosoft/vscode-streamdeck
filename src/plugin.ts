import path from "node:path";
import streamDeck from "@elgato/streamdeck";
import { loadConfiguration } from "./configuration.js";
import { server } from "./server/instance.js";
import { MessageServer } from "./server/messageServer.js";

// Registering actions (the @action decorator assigns the manifest UUID,
// registerAction routes the events to the action instances).
import { ChangeLanguageAction } from "./actions/changeLanguage.js";
import { CreateTerminalAction } from "./actions/createTerminal.js";
import { ExecuteCommandAction } from "./actions/executeCommand.js";
import { ExecuteTerminalCommandAction } from "./actions/executeTerminalCommand.js";
import { InsertSnippetAction } from "./actions/insertSnippet.js";
import { OpenFolderAction } from "./actions/openFolder.js";

try {
  // The plugin entry point is launched by Stream Deck as `node bin/plugin.js`;
  // the plugin root holds the optional settings.ini.
  const pluginRoot = process.argv[1]
    ? path.resolve(path.dirname(process.argv[1]), "..")
    : process.cwd();

  const configuration = loadConfiguration(pluginRoot);

  server.instance = new MessageServer(configuration.host, configuration.port);
  server.instance.start();

  streamDeck.actions.registerAction(new ChangeLanguageAction());
  streamDeck.actions.registerAction(new CreateTerminalAction());
  streamDeck.actions.registerAction(new ExecuteCommandAction());
  streamDeck.actions.registerAction(new ExecuteTerminalCommandAction());
  streamDeck.actions.registerAction(new InsertSnippetAction());
  streamDeck.actions.registerAction(new OpenFolderAction());

  process.on("uncaughtException", (error) => {
    streamDeck.logger.error(error.message);
  });

  process.on("exit", () => server.instance?.stop());

  // Connects to Stream Deck and keeps the process alive.
  streamDeck.connect();
} catch (error) {
  streamDeck.logger.error(error instanceof Error ? error.message : String(error));
}
