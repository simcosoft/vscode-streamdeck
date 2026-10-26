/**
 * Wire protocol between the Stream Deck plugin (WebSocket server) and the
 * VS Code extension (WebSocket client). Must stay byte-compatible with the
 * original .NET plugin and the nicollasricas/vscode-deck extension.
 *
 * Envelope (both directions):
 *   { "id": "<MessageClassName>", "data": "<JSON string>" }
 * Note: `data` is a JSON *string* (double-encoded), `id` is the original
 * C#/TypeScript class name.
 */
export interface Message {
  id: string;
  data: string;
}

export const MessageIds = {
  ExecuteCommand: "ExecuteCommandMessage",
  ExecuteTerminalCommand: "ExecuteTerminalCommandMessage",
  InsertSnippet: "InsertSnippetMessage",
  ChangeLanguage: "ChangeLanguageMessage",
  CreateTerminal: "CreateTerminalMessage",
  OpenFolder: "OpenFolderMessage",
  ChangeActiveSession: "ChangeActiveSessionMessage",
  ActiveSessionChanged: "ActiveSessionChangedMessage"
} as const;

export interface ExecuteCommandMessage {
  command?: string;
  arguments?: string;
}

export interface ExecuteTerminalCommandMessage {
  command?: string;
}

export interface InsertSnippetMessage {
  name?: string;
}

export interface ChangeLanguageMessage {
  languageId?: string;
}

export interface CreateTerminalMessage {
  preserveFocus: boolean;
  name?: string;
  shellPath?: string;
  shellArgs?: string;
  workingDirectory?: string;
}

export interface OpenFolderMessage {
  path?: string;
  newWindow: boolean;
}

export interface ChangeActiveSessionMessage {
  sessionId: string;
}

export interface ActiveSessionChangedMessage {
  sessionId: string;
}

/** Serializes a payload into the double-encoded envelope the extension expects. */
export function serializeMessage(id: string, payload: unknown): string {
  const envelope: Message = { id, data: JSON.stringify(payload) };
  return JSON.stringify(envelope);
}
