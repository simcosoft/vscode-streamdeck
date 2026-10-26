import { action, KeyDownEvent } from "@elgato/streamdeck";
import { CreateTerminalMessage, MessageIds } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type CreateTerminalSettings = {
  preserveFocus?: boolean;
  name?: string;
  shellPath?: string;
  shellArgs?: string;
  workingDirectory?: string;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.createterminal" })
export class CreateTerminalAction extends KeyAction<CreateTerminalSettings> {
  protected readonly defaultSettings: CreateTerminalSettings = {
    preserveFocus: false,
    name: "",
    shellPath: "",
    shellArgs: "",
    workingDirectory: ""
  };

  override async onKeyDown(ev: KeyDownEvent<CreateTerminalSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: CreateTerminalMessage = {
      preserveFocus: settings?.preserveFocus ?? false,
      name: settings?.name,
      shellPath: settings?.shellPath,
      shellArgs: settings?.shellArgs,
      workingDirectory: settings?.workingDirectory
    };

    server.instance?.currentClient?.send(MessageIds.CreateTerminal, message);
  }
}
