/**
 * Full-Stack Entry Point: Express HTTP Server + WebSocket Server + Vite Middleware
 * Bhabhi Thulla Multiplayer Engine
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import dotenv from 'dotenv';
import { roomManager } from './src/server/roomManager';
import { ClientMessage, ServerMessage } from './src/engine/types';
import { gameStorage } from './src/server/storage';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());

// Security headers middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// REST Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Create Room Schema
const CreateRoomSchema = z.object({
  username: z.string().trim().min(1).max(20),
  targetPlayerCount: z.union([z.literal(3), z.literal(4)]).default(4),
  rules: z
    .object({
      threePlayerDealMode: z.enum(['EQUAL_51', 'EXTRA_52']).optional(),
      nextLeadAfterThulla: z
        .enum(['THULLA_PLAYER_LEADS', 'PENALTY_HOLDER_LEADS'])
        .optional(),
    })
    .optional(),
});

app.post('/api/rooms/create', (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (roomManager.isRateLimited(clientIp, 15, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    const validated = CreateRoomSchema.parse(req.body);
    const { room, hostPlayer, sessionToken } = roomManager.createRoom(
      validated.username,
      validated.targetPlayerCount,
      validated.rules
    );

    res.json({
      success: true,
      roomId: room.id,
      roomCode: room.roomCode,
      playerId: hostPlayer.id,
      sessionToken,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create room' });
  }
});

// Join Room Schema
const JoinRoomSchema = z.object({
  roomCode: z.string().trim().min(4).max(6),
  username: z.string().trim().min(1).max(20),
  sessionToken: z.string().optional(),
});

app.post('/api/rooms/join', (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (roomManager.isRateLimited(clientIp, 30, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    const validated = JoinRoomSchema.parse(req.body);
    const { room, player, sessionToken } = roomManager.joinRoom(
      validated.roomCode,
      validated.username,
      validated.sessionToken
    );

    res.json({
      success: true,
      roomId: room.id,
      roomCode: room.roomCode,
      playerId: player.id,
      sessionToken,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to join room' });
  }
});

// Master Mode Auth Endpoint
const MasterAuthSchema = z.object({
  username: z.string(),
  passcode: z.string(),
});

app.post('/api/master/auth', (req: Request, res: Response) => {
  try {
    const validated = MasterAuthSchema.parse(req.body);
    const result = roomManager.authorizeMaster(validated.passcode, validated.username);
    if (!result.success || !result.token) {
      return res.status(401).json({
        success: false,
        error: 'Master authorization denied. Invalid credentials.',
      });
    }

    res.json({
      success: true,
      masterToken: result.token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Authentication error' });
  }
});

// Legal Pages API
app.get('/api/legal/privacy', (_req, res) => {
  res.json({
    title: 'Privacy Policy',
    effectiveDate: '2026-10-15',
    content:
      'Bhabhi Thulla Multiplayer respects your privacy. We do not sell, rent, or monetize any personal data. Display names and game statistics are used solely for match coordination in volatile memory and local sessions. No tracking cookies or advertising telemetry are stored.',
  });
});

app.get('/api/legal/terms', (_req, res) => {
  res.json({
    title: 'Terms and Conditions',
    effectiveDate: '2026-10-15',
    content:
      'Bhabhi Thulla is provided as a recreational digital adaptation of the traditional Pakistani card game. Real-money gambling is strictly forbidden. Users agree to respect other players and play in accordance with fair game conduct.',
  });
});

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface ClientSocketContext {
  ws: WebSocket;
  roomId?: string;
  playerId?: string;
  sessionToken?: string;
  isAlive: boolean;
  masterToken?: string;
}

const socketClients = new Map<WebSocket, ClientSocketContext>();

// Broadcast helper: sends tailored private state to each socket
function broadcastRoomState(roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  for (const [ws, ctx] of socketClients.entries()) {
    if (ctx.roomId === roomId && ws.readyState === WebSocket.OPEN && ctx.playerId) {
      try {
        const privateState = roomManager.getPrivateState(room, ctx.playerId);
        const msg: ServerMessage = {
          type: 'STATE_UPDATE',
          state: privateState,
        };
        ws.send(JSON.stringify(msg));

        // If this client is also an authorized Master session, send privileged state update!
        if (ctx.masterToken && roomManager.isMasterTokenValid(ctx.masterToken)) {
          const privilegedState = roomManager.getMasterPrivilegedState(
            roomId,
            ctx.masterToken
          );
          ws.send(
            JSON.stringify({
              type: 'MASTER_STATE_UPDATE',
              privilegedState,
            })
          );
        }
      } catch (err) {
        console.error('Error sending state to socket:', err);
      }
    }
  }
}

roomManager.setBroadcastCallback((roomId) => {
  broadcastRoomState(roomId);
});

// WebSocket message handler
wss.on('connection', (ws: WebSocket) => {
  const ctx: ClientSocketContext = {
    ws,
    isAlive: true,
  };
  socketClients.set(ws, ctx);

  ws.on('pong', () => {
    ctx.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'HEARTBEAT': {
          ctx.isAlive = true;
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        }

        case 'JOIN_ROOM': {
          try {
            const { room, player, sessionToken } = roomManager.joinRoom(
              msg.roomCode,
              msg.username,
              msg.sessionToken
            );

            ctx.roomId = room.id;
            ctx.playerId = player.id;
            ctx.sessionToken = sessionToken;

            ws.send(
              JSON.stringify({
                type: 'JOIN_SUCCESS',
                playerId: player.id,
                sessionToken,
                roomId: room.id,
                roomCode: room.roomCode,
              })
            );

            broadcastRoomState(room.id);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'JOIN_FAILED',
                message: err.message || 'Could not join room',
              })
            );
          }
          break;
        }

        case 'START_GAME': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.startGame(ctx.roomId, ctx.playerId);
            broadcastRoomState(ctx.roomId);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'START_GAME_FAILED',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'TOGGLE_BOT_FILL': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.toggleBotFill(ctx.roomId, ctx.playerId);
            broadcastRoomState(ctx.roomId);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'BOT_TOGGLE_FAILED',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'UPDATE_RULES': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.updateRules(ctx.roomId, ctx.playerId, msg.rules);
            broadcastRoomState(ctx.roomId);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'RULES_UPDATE_FAILED',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'PLAY_CARD': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.playCard(
              ctx.roomId,
              ctx.playerId,
              msg.cardId,
              msg.actionId
            );
            // State broadcast handled inside playCard / settleTrick
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'INVALID_MOVE',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'REQUEST_STATE_SYNC': {
          if (ctx.roomId && ctx.playerId) {
            const room = roomManager.getRoom(ctx.roomId);
            if (room) {
              const privateState = roomManager.getPrivateState(
                room,
                ctx.playerId
              );
              ws.send(
                JSON.stringify({
                  type: 'STATE_UPDATE',
                  state: privateState,
                })
              );
            }
          }
          break;
        }

        case 'RESTART_REMATCH': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.rematch(ctx.roomId, ctx.playerId);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'REMATCH_FAILED',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'FORCE_END_GAME': {
          if (!ctx.roomId || !ctx.playerId) return;
          try {
            roomManager.forceEndGame(ctx.roomId, ctx.playerId, msg.password);
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'END_GAME_FAILED',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'MASTER_AUTH': {
          const room = ctx.roomId ? roomManager.getRoom(ctx.roomId) : undefined;
          const player = room?.players.find((p) => p.id === ctx.playerId);
          const username = player?.username || 'K#ub@!b';

          const authRes = roomManager.authorizeMaster(msg.passcode, username);
          if (authRes.success && authRes.token) {
            ctx.masterToken = authRes.token;
            if (ctx.roomId) {
              const privilegedState = roomManager.getMasterPrivilegedState(
                ctx.roomId,
                authRes.token
              );
              ws.send(
                JSON.stringify({
                  type: 'MASTER_AUTH_SUCCESS',
                  privilegedState,
                })
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'MASTER_AUTH_DENIED',
                message: 'Invalid Master passcode or unauthorized account identity.',
              })
            );
          }
          break;
        }

        case 'MASTER_TRIGGER_TEST_ACTION': {
          if (!ctx.roomId || !ctx.masterToken) return;
          try {
            roomManager.triggerMasterAction(
              ctx.roomId,
              ctx.masterToken,
              msg.actionType
            );
          } catch (err: any) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                code: 'MASTER_ACTION_ERROR',
                message: err.message,
              })
            );
          }
          break;
        }

        case 'LEAVE_ROOM': {
          if (ctx.roomId && ctx.playerId) {
            const room = roomManager.getRoom(ctx.roomId);
            if (room) {
              const p = room.players.find((pl) => pl.id === ctx.playerId);
              if (p) {
                p.connectionStatus = 'DISCONNECTED';
                room.recentLogs.push(`${p.username} left the room`);
                broadcastRoomState(room.id);
              }
            }
          }
          ctx.roomId = undefined;
          ctx.playerId = undefined;
          break;
        }
      }
    } catch (err: any) {
      console.error('WebSocket message handling error:', err);
    }
  });

  ws.on('close', () => {
    if (ctx.roomId && ctx.playerId) {
      const room = roomManager.getRoom(ctx.roomId);
      if (room) {
        const player = room.players.find((p) => p.id === ctx.playerId);
        if (player) {
          player.connectionStatus = 'DISCONNECTED';
          room.stateVersion += 1;
          broadcastRoomState(room.id);
        }
      }
    }
    socketClients.delete(ws);
  });
});

// Periodic heartbeat ping to keep connections alive and clean dead sockets
const heartbeatInterval = setInterval(() => {
  for (const [ws, ctx] of socketClients.entries()) {
    if (!ctx.isAlive) {
      ws.terminate();
      socketClients.delete(ws);
      continue;
    }
    ctx.isAlive = false;
    ws.ping();
  }
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Vite Integration (Dev Mode: Vite middleware / Production: Static serving)
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`♠️ Bhabhi Thulla Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
