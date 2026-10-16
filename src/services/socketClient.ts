/**
 * Client-Side WebSocket Manager
 * Resilient real-time connection with auto-reconnection and event dispatching.
 */

import {
  ClientMessage,
  MasterPrivilegedState,
  PrivatePlayerState,
  ServerMessage,
} from '../engine/types';

type StateListener = (state: PrivatePlayerState) => void;
type MasterStateListener = (state: MasterPrivilegedState) => void;
type ErrorListener = (code: string, message: string) => void;
type ConnectionListener = (connected: boolean) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private masterListeners: Set<MasterStateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isExplicitlyClosed = false;

  public connected: boolean = false;
  public lastState: PrivatePlayerState | null = null;
  public lastMasterState: MasterPrivilegedState | null = null;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyConnection(true);
        this.startHeartbeat();

        // Restore active session if available in sessionStorage
        const savedSession = sessionStorage.getItem('bhabhi_session');
        if (savedSession) {
          try {
            const data = JSON.parse(savedSession);
            if (data.roomCode && data.username && data.sessionToken) {
              this.send({
                type: 'JOIN_ROOM',
                roomCode: data.roomCode,
                username: data.username,
                sessionToken: data.sessionToken,
              });
            }
          } catch (e) {
            console.error('Failed restoring session:', e);
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Error parsing server message:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.notifyConnection(false);
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection notice:', err);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'JOIN_SUCCESS': {
        sessionStorage.setItem(
          'bhabhi_session',
          JSON.stringify({
            playerId: msg.playerId,
            sessionToken: msg.sessionToken,
            roomId: msg.roomId,
            roomCode: msg.roomCode,
          })
        );
        break;
      }
      case 'STATE_UPDATE': {
        this.lastState = msg.state;
        for (const listener of this.stateListeners) {
          listener(msg.state);
        }
        break;
      }
      case 'MASTER_AUTH_SUCCESS':
      case 'MASTER_STATE_UPDATE': {
        this.lastMasterState = msg.privilegedState;
        for (const listener of this.masterListeners) {
          listener(msg.privilegedState);
        }
        break;
      }
      case 'ERROR': {
        for (const listener of this.errorListeners) {
          listener(msg.code, msg.message);
        }
        break;
      }
      case 'PONG': {
        break;
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'HEARTBEAT' });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('Socket not open, cannot send message:', msg.type);
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.notifyConnection(false);
  }

  subscribeState(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    if (this.lastState) fn(this.lastState);
    return () => this.stateListeners.delete(fn);
  }

  subscribeMaster(fn: MasterStateListener): () => void {
    this.masterListeners.add(fn);
    if (this.lastMasterState) fn(this.lastMasterState);
    return () => this.masterListeners.delete(fn);
  }

  subscribeError(fn: ErrorListener): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  subscribeConnection(fn: ConnectionListener): () => void {
    this.connectionListeners.add(fn);
    fn(this.connected);
    return () => this.connectionListeners.delete(fn);
  }

  private notifyConnection(status: boolean) {
    for (const listener of this.connectionListeners) {
      listener(status);
    }
  }
}

export const socketClient = new SocketClient();
