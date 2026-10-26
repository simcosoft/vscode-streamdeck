import { SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

/**
 * Base class for all key actions. Mirrors the original .NET KeyBase<T>:
 * when an action appears with empty settings, the defaults are written back
 * so the property inspector shows them.
 */
export abstract class KeyAction<T extends JsonObject> extends SingletonAction<T> {
  protected abstract readonly defaultSettings: T;

  override async onWillAppear(ev: WillAppearEvent<T>): Promise<void> {
    const settings = ev.payload.settings;

    if (!settings || Object.keys(settings).length === 0) {
      await ev.action.setSettings(this.defaultSettings);
    }
  }
}
