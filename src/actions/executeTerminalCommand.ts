import { action, KeyDownEvent } from "@elgato/streamdeck";
import { ExecuteTerminalCommandMessage, MessageIds } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type TerminalCommandSettings = {
  command?: string;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.executeterminalcommand" })
export class ExecuteTerminalCommandAction extends KeyAction<TerminalCommandSettings> {
  protected readonly defaultSettings: TerminalCommandSettings = {
    command: ""
  };

  override async onKeyDown(ev: KeyDownEvent<TerminalCommandSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: ExecuteTerminalCommandMessage = {
      command: settings?.command
    };

    server.instance?.currentClient?.send(MessageIds.ExecuteTerminalCommand, message);
  }
}
