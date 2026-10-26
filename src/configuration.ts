import fs from "node:fs";
import path from "node:path";

/**
 * Plugin configuration, loaded from the optional `settings.ini` file located
 * in the plugin root (next to `manifest.json`):
 *
 *   [general]
 *   host=127.0.0.1
 *   port=48969
 */
export class Configuration {
  host: string = "127.0.0.1";
  port: number = 48969;
}

export function loadConfiguration(pluginRoot: string): Configuration {
  const configuration = new Configuration();
  const iniPath = path.join(pluginRoot, "settings.ini");

  let content: string;
  try {
    content = fs.readFileSync(iniPath, "utf8");
  } catch {
    // settings.ini is optional — fall back to defaults.
    return configuration;
  }

  let inGeneralSection = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("[") && line.endsWith("]")) {
      inGeneralSection = line.slice(1, -1).trim().toLowerCase() === "general";
      continue;
    }

    if (!inGeneralSection || line.startsWith(";") || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "host" && value.length > 0) {
      configuration.host = value;
    } else if (key === "port") {
      const port = Number.parseInt(value, 10);
      if (!Number.isNaN(port)) {
        configuration.port = port;
      }
    }
  }

  return configuration;
}
