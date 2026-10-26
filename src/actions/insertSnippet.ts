import { action, KeyDownEvent } from "@elgato/streamdeck";
import { InsertSnippetMessage, MessageIds } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type InsertSnippetSettings = {
  name?: string;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.insertsnippet" })
export class InsertSnippetAction extends KeyAction<InsertSnippetSettings> {
  protected readonly defaultSettings: InsertSnippetSettings = {
    name: ""
  };

  override async onKeyDown(ev: KeyDownEvent<InsertSnippetSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: InsertSnippetMessage = {
      name: settings?.name
    };

    server.instance?.currentClient?.send(MessageIds.InsertSnippet, message);
  }
}
