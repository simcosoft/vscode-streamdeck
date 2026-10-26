import { action, KeyDownEvent } from "@elgato/streamdeck";
import { MessageIds, OpenFolderMessage } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type OpenFolderSettings = {
  path?: string;
  newWindow?: boolean;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.openfolder" })
export class OpenFolderAction extends KeyAction<OpenFolderSettings> {
  protected readonly defaultSettings: OpenFolderSettings = {
    path: "",
    newWindow: false
  };

  override async onKeyDown(ev: KeyDownEvent<OpenFolderSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: OpenFolderMessage = {
      path: settings?.path,
      newWindow: settings?.newWindow ?? false
    };

    server.instance?.currentClient?.send(MessageIds.OpenFolder, message);
  }
}
