import type { MessageServer } from "./messageServer.js";

/**
 * Holds the plugin-wide MessageServer instance. Actions are registered by the
 * SDK before `plugin.ts` finishes wiring the server, so indirection avoids
 * circular imports.
 */
export const server: { instance?: MessageServer } = {};
