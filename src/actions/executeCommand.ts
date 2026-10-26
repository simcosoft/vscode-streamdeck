import { action, KeyDownEvent } from "@elgato/streamdeck";
import { ExecuteCommandMessage, MessageIds } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type ExecuteCommandSettings = {
  command?: string;
  arguments?: string;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.executecommand" })
export class ExecuteCommandAction extends KeyAction<ExecuteCommandSettings> {
  protected readonly defaultSettings: ExecuteCommandSettings = {
    command: "",
    arguments: ""
  };

  override async onKeyDown(ev: KeyDownEvent<ExecuteCommandSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: ExecuteCommandMessage = {
      command: settings?.command,
      arguments: settings?.arguments
    };

    server.instance?.currentClient?.send(MessageIds.ExecuteCommand, message);
  }
}
