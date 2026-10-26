import { WebSocket } from "ws";
import { serializeMessage } from "../messages.js";

/**
 * A connected VS Code extension instance. `sessionId` comes from the
 * `X-VSSessionID` HTTP header sent by the extension during the handshake.
 */
export class Client {
  constructor(
    public readonly socket: WebSocket,
    public readonly sessionId?: string
  ) {}

  send(id: string, payload: unknown): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(serializeMessage(id, payload));
  }
}
