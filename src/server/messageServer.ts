import { IncomingMessage } from "node:http";
import streamDeck from "@elgato/streamdeck";
import { WebSocket, WebSocketServer } from "ws";
import {
  ActiveSessionChangedMessage,
  ChangeActiveSessionMessage,
  Message,
  MessageIds
} from "../messages.js";
import { Client } from "./client.js";

/**
 * WebSocket server the VS Code extensions connect to. Behaviour mirrors the
 * original .NET implementation (Fleck-based):
 *
 * - every VS Code window connects with an `X-VSSessionID` header;
 * - when exactly one client remains (after connect/disconnect), it becomes
 *   the active session automatically;
 * - a client may claim the active session by sending ChangeActiveSessionMessage;
 * - ActiveSessionChangedMessage is broadcast to all clients;
 * - key presses are forwarded only to the active client (`currentClient`).
 */
export class MessageServer {
  private readonly wss: WebSocketServer;
  private readonly connections = new Map<WebSocket, Client>();

  currentClient?: Client;

  constructor(
    private readonly host: string,
    private readonly port: number
  ) {
    this.wss = new WebSocketServer({ host, port });
  }

  start(): void {
    this.wss.on("listening", () => {
      streamDeck.logger.info(`Starting server ws://${this.host}:${this.port}`);
    });

    this.wss.on("error", (error) => {
      streamDeck.logger.error(`Message server error: ${error.message}`);
    });

    this.wss.on("connection", (socket, request) => this.onConnected(socket, request));
  }

  stop(): void {
    for (const socket of this.connections.keys()) {
      socket.close();
    }

    this.connections.clear();
    this.currentClient = undefined;
    this.wss.close();
  }

  private onConnected(socket: WebSocket, request: IncomingMessage): void {
    const header = request.headers["x-vssessionid"];
    const sessionId = Array.isArray(header) ? header[0] : header;

    this.connections.set(socket, new Client(socket, sessionId));

    socket.on("close", () => this.onDisconnected(socket));
    socket.on("error", () => socket.close());
    socket.on("message", (raw) => this.onMessage(socket, raw.toString()));

    this.tryActivateRemainingClient();
  }

  private onDisconnected(socket: WebSocket): void {
    const disconnected = this.connections.get(socket);

    this.connections.delete(socket);

    if (disconnected && this.currentClient === disconnected) {
      this.currentClient = undefined;
    }

    this.tryActivateRemainingClient();
  }

  private tryActivateRemainingClient(): void {
    if (this.connections.size === 1) {
      const [client] = this.connections.values();

      if (client.sessionId) {
        this.setActiveSession(client, client.sessionId);
      }
    }
  }

  private onMessage(socket: WebSocket, rawMessage: string): void {
    streamDeck.logger.info(rawMessage);

    let message: Message | undefined;
    try {
      message = JSON.parse(rawMessage) as Message;
    } catch {
      return;
    }

    if (message?.data && message.id === MessageIds.ChangeActiveSession) {
      const client = this.connections.get(socket);
      if (!client) {
        return;
      }

      try {
        const changeActiveSession = JSON.parse(message.data) as ChangeActiveSessionMessage;
        this.setActiveSession(client, changeActiveSession.sessionId);
      } catch (error) {
        streamDeck.logger.error(`Invalid ChangeActiveSessionMessage: ${String(error)}`);
      }
    }
  }

  private setActiveSession(client: Client, sessionId: string): void {
    this.currentClient = client;

    const notification: ActiveSessionChangedMessage = { sessionId };
    for (const connection of this.connections.values()) {
      connection.send(MessageIds.ActiveSessionChanged, notification);
    }
  }
}
