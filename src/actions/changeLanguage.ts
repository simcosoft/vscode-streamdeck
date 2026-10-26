import { action, KeyDownEvent } from "@elgato/streamdeck";
import { ChangeLanguageMessage, MessageIds } from "../messages.js";
import { server } from "../server/instance.js";
import { KeyAction } from "./keyAction.js";

export type ChangeLanguageSettings = {
  languageId?: string;
};

@action({ UUID: "com.nicollasr.streamdeckvsc.changelanguage" })
export class ChangeLanguageAction extends KeyAction<ChangeLanguageSettings> {
  protected readonly defaultSettings: ChangeLanguageSettings = {
    languageId: ""
  };

  override async onKeyDown(ev: KeyDownEvent<ChangeLanguageSettings>): Promise<void> {
    const settings = ev.payload.settings;

    const message: ChangeLanguageMessage = {
      languageId: settings?.languageId
    };

    server.instance?.currentClient?.send(MessageIds.ChangeLanguage, message);
  }
}
