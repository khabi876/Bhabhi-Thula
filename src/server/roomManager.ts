/**
 * Server-Side Room and Game State Manager
 * Authoritative lifecycle for Bhabhi Thulla lobbies and live matches.
 */

import {
  Card,
  GameRules,
  MasterPrivilegedState,
  PlayedCard,
  Player,
  PrivatePlayerState,
  PublicGameState,
  RoomStatus,
  Suit,
  TrickResult,
} from '../engine/types';
import {
  createStandardDeck,
  dealCards,
  getLegalMoves,
  getNextPlayerId,
  resolveTrick,
} from '../engine/bhabhiEngine';
import { chooseBotMove } from '../engine/aiBot';
import { gameStorage } from './storage';
import crypto from 'crypto';

export interface RoomSession {
  id: string;
  roomCode: string;
  status: RoomStatus;
  rules: GameRules;
  players: Player[];
  allHands: Record<string, Card[]>;
  currentTurnPlayerId: string | null;
  leadSuit: Suit | null;
  currentTrick: PlayedCard[];
  trickNumber: number;
  escapedPlayerIds: string[];
  bhabhiPlayerId: string | null;
  stateVersion: number;
  lastTrickResult: TrickResult | null;
  commentary: {
    speakerName: string;
    text: string;
    urduText: string;
    timestamp: number;
    isThulla?: boolean;
  } | null;
  recentLogs: string[];
  createdAt: number;
  gameStartedAt?: number;
  // Session tokens mapping: token -> playerId
  sessionTokens: Map<string, string>;
  // Action deduplication set (actionId -> timestamp)
  processedActionIds: Map<string, number>;
  // Bot fill enabled in lobby
  isBotFillEnabled: boolean;
  // Total thullas in this match
  thullaCount: number;
}

const BOT_NAMES = ['Bilal', 'Tariq', 'Zainab', 'Hamza', 'Ayesha'];

export class RoomManager {
  private rooms: Map<string, RoomSession> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  // Master tokens: authorized tokens for username K#ub@!b
  private authorizedMasterTokens: Set<string> = new Set();
  // Rate limiting tracker for join/create
  private rateLimitMap: Map<string, number[]> = new Map();

  // Callback to broadcast state to room sockets
  private broadcastCallback?: (
    roomId: string,
    targetPlayerId?: string
  ) => void;

  setBroadcastCallback(
    fn: (roomId: string, targetPlayerId?: string) => void
  ) {
    this.broadcastCallback = fn;
  }

  isRateLimited(ip: string, maxRequests = 20, windowMs = 60000): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(ip) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);
    valid.push(now);
    this.rateLimitMap.set(ip, valid);
    return valid.length > maxRequests;
  }

  generateRoomCode(): string {
    let attempts = 0;
    while (attempts < 1000) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      if (!this.codeToRoomId.has(code)) {
        return code;
      }
      attempts++;
    }
    return crypto.randomBytes(2).toString('hex').toUpperCase();
  }

  createRoom(
    hostUsername: string,
    targetPlayerCount: 3 | 4 = 4,
    customRules?: Partial<GameRules>
  ): { room: RoomSession; hostPlayer: Player; sessionToken: string } {
    const cleanUsername = hostUsername.trim().slice(0, 20);
    if (!cleanUsername) {
      throw new Error('Username cannot be empty');
    }

    const roomId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();
    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(24).toString('hex');

    const rules: GameRules = {
      targetPlayerCount,
      threePlayerDealMode: customRules?.threePlayerDealMode || 'EQUAL_51',
      firstTrickRule: 'MUST_PLAY_ACE_SPADES',
      nextLeadAfterThulla:
        customRules?.nextLeadAfterThulla || 'THULLA_PLAYER_LEADS',
    };

    const hostPlayer: Player = {
      id: playerId,
      username: cleanUsername,
      isHost: true,
      isBot: false,
      connectionStatus: 'CONNECTED',
      cardsCount: 0,
      avatarSeed: 1,
      seatIndex: 0,
      isMaster: cleanUsername === 'K#ub@!b',
    };

    const room: RoomSession = {
      id: roomId,
      roomCode,
      status: 'LOBBY',
      rules,
      players: [hostPlayer],
      allHands: {},
      currentTurnPlayerId: null,
      leadSuit: null,
      currentTrick: [],
      trickNumber: 0,
      escapedPlayerIds: [],
      bhabhiPlayerId: null,
      stateVersion: 1,
      lastTrickResult: null,
      commentary: {
        speakerName: 'Game Master',
        text: `Room created! Room code: ${roomCode}`,
        urduText: `کمرہ تیار ہے! کوڈ: ${roomCode}`,
        timestamp: Date.now(),
      },
      recentLogs: [`Room created by ${cleanUsername}`],
      createdAt: Date.now(),
      sessionTokens: new Map([[sessionToken, playerId]]),
      processedActionIds: new Map(),
      isBotFillEnabled: true,
      thullaCount: 0,
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);

    return { room, hostPlayer, sessionToken };
  }

  joinRoom(
    roomCode: string,
    username: string,
    existingSessionToken?: string
  ): { room: RoomSession; player: Player; sessionToken: string } {
    const roomId = this.codeToRoomId.get(roomCode.trim());
    if (!roomId) {
      throw new Error('Room not found. Check the 4-digit code.');
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room does not exist');
    }

    // 1. Check for reconnection via sessionToken
    if (existingSessionToken && room.sessionTokens.has(existingSessionToken)) {
      const playerId = room.sessionTokens.get(existingSessionToken)!;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.connectionStatus = 'CONNECTED';
        room.stateVersion += 1;
        room.recentLogs.push(`${player.username} reconnected`);
        return { room, player, sessionToken: existingSessionToken };
      }
    }

    // 2. Joining as a new player
    if (room.status !== 'LOBBY') {
      throw new Error('Game is already in progress');
    }

    if (room.players.length >= room.rules.targetPlayerCount) {
      throw new Error(`Room is full (${room.rules.targetPlayerCount} players max)`);
    }

    let cleanUsername = username.trim().slice(0, 20);
    if (!cleanUsername) {
      throw new Error('Username cannot be empty');
    }

    // Deduplicate username in the same room
    const existingNames = room.players.map((p) => p.username.toLowerCase());
    if (existingNames.includes(cleanUsername.toLowerCase())) {
      cleanUsername = `${cleanUsername} (${room.players.length + 1})`;
    }

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(24).toString('hex');
    const newPlayer: Player = {
      id: playerId,
      username: cleanUsername,
      isHost: false,
      isBot: false,
      connectionStatus: 'CONNECTED',
      cardsCount: 0,
      avatarSeed: room.players.length + 1,
      seatIndex: room.players.length,
      isMaster: cleanUsername === 'K#ub@!b',
    };

    room.players.push(newPlayer);
    room.sessionTokens.set(sessionToken, playerId);
    room.stateVersion += 1;
    room.recentLogs.push(`${cleanUsername} joined the room`);

    return { room, player: newPlayer, sessionToken };
  }

  toggleBotFill(roomId: string, playerId: string): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) throw new Error('Only the host can toggle AI bots');
    if (room.status !== 'LOBBY') throw new Error('Cannot change in active game');

    room.isBotFillEnabled = !room.isBotFillEnabled;
    room.stateVersion += 1;
    return room;
  }

  updateRules(
    roomId: string,
    playerId: string,
    newRules: Partial<GameRules>
  ): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) throw new Error('Only the host can modify rules');
    if (room.status !== 'LOBBY') throw new Error('Cannot change in active game');

    if (newRules.targetPlayerCount) {
      room.rules.targetPlayerCount = newRules.targetPlayerCount;
    }
    if (newRules.threePlayerDealMode) {
      room.rules.threePlayerDealMode = newRules.threePlayerDealMode;
    }
    if (newRules.nextLeadAfterThulla) {
      room.rules.nextLeadAfterThulla = newRules.nextLeadAfterThulla;
    }

    room.stateVersion += 1;
    return room;
  }

  startGame(roomId: string, playerId: string): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) throw new Error('Only the host can start the game');
    if (room.status !== 'LOBBY') throw new Error('Game already started');

    // Fill remaining spots with AI Bots if enabled or needed
    while (room.players.length < room.rules.targetPlayerCount) {
      const botIndex = room.players.length;
      const botName = BOT_NAMES[botIndex % BOT_NAMES.length];
      const botId = `bot_${crypto.randomUUID().slice(0, 8)}`;
      const botPlayer: Player = {
        id: botId,
        username: botName,
        isHost: false,
        isBot: true,
        connectionStatus: 'CONNECTED',
        cardsCount: 0,
        avatarSeed: botIndex + 1,
        seatIndex: botIndex,
      };
      room.players.push(botPlayer);
      room.recentLogs.push(`AI Player ${botName} joined the table`);
    }

    const playerIds = room.players.map((p) => p.id);
    const { hands, leaderId } = dealCards(playerIds, room.rules);

    room.allHands = hands;
    for (const p of room.players) {
      p.cardsCount = hands[p.id].length;
      p.escapedRank = undefined;
    }

    room.status = 'PLAYING';
    room.currentTurnPlayerId = leaderId;
    room.leadSuit = null;
    room.currentTrick = [];
    room.trickNumber = 1;
    room.escapedPlayerIds = [];
    room.bhabhiPlayerId = null;
    room.lastTrickResult = null;
    room.thullaCount = 0;
    room.gameStartedAt = Date.now();
    room.stateVersion += 1;

    const leaderName =
      room.players.find((p) => p.id === leaderId)?.username || 'First player';
    room.commentary = {
      speakerName: 'Ustad (Commentator)',
      text: `${leaderName} holds the Ace of Spades (Hukam ka Ikka)! Game begins!`,
      urduText: `${leaderName} کے پاس حکم کا اِکا ہے! کھیل شروع!`,
      timestamp: Date.now(),
    };
    room.recentLogs.push(`Cards dealt. ${leaderName} starts trick 1.`);

    // If first turn is an AI Bot, trigger it
    this.scheduleBotTurnIfNeeded(room);

    return room;
  }

  playCard(
    roomId: string,
    playerId: string,
    cardId: string,
    actionId: string
  ): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    // 1. Action deduplication
    if (room.processedActionIds.has(actionId)) {
      return room; // Already processed
    }
    room.processedActionIds.set(actionId, Date.now());

    // 2. Validate state
    if (room.status !== 'PLAYING') {
      throw new Error('Game is not currently accepting moves');
    }

    if (room.currentTurnPlayerId !== playerId) {
      throw new Error("It is not this player's turn");
    }

    const hand = room.allHands[playerId];
    if (!hand) throw new Error('Player hand not found');

    const card = hand.find((c) => c.id === cardId);
    if (!card) throw new Error('Card does not exist in player hand');

    // 3. Validate legal move
    const legalCardIds = getLegalMoves(
      hand,
      room.trickNumber,
      room.currentTrick,
      room.leadSuit,
      room.rules
    );

    if (!legalCardIds.includes(cardId)) {
      throw new Error('Illegal card play under Bhabhi Thulla rules');
    }

    // 4. Remove card from player hand
    room.allHands[playerId] = hand.filter((c) => c.id !== cardId);
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.cardsCount = room.allHands[playerId].length;
    }

    // 5. If this is the first card of the trick, set the lead suit
    if (room.currentTrick.length === 0) {
      room.leadSuit = card.suit;
    }

    const playedCard: PlayedCard = {
      card,
      playerId,
      timestamp: Date.now(),
    };
    room.currentTrick.push(playedCard);

    // 6. Check if this play is a THULLA!
    const isThulla = room.leadSuit !== null && card.suit !== room.leadSuit;

    // Active players who have not escaped yet
    const activePlayers = room.players.filter(
      (p) => !room.escapedPlayerIds.includes(p.id)
    );

    const isTrickComplete =
      isThulla || room.currentTrick.length >= activePlayers.length;

    if (isTrickComplete) {
      // Trick is resolved!
      room.status = 'RESOLVING_TRICK';
      room.stateVersion += 1;

      const playerNames: Record<string, string> = {};
      for (const p of room.players) {
        playerNames[p.id] = p.username;
      }

      const result = resolveTrick(
        room.trickNumber,
        room.leadSuit!,
        room.currentTrick,
        room.rules,
        playerNames
      );

      room.lastTrickResult = result;
      if (result.isThulla) {
        room.thullaCount += 1;
        room.commentary = {
          speakerName: 'Ustad (Commentator)',
          text: result.commentaryText || 'Oye! Thulla lag gaya!',
          urduText: result.urduCommentary || 'اوئے! ٹھلا لگ گیا!',
          timestamp: Date.now(),
          isThulla: true,
        };
      } else {
        room.commentary = {
          speakerName: 'Ustad (Commentator)',
          text: result.commentaryText || 'Safe trick!',
          urduText: result.urduCommentary || 'صاف ہاتھ!',
          timestamp: Date.now(),
        };
      }

      // Broadcast the trick completion state
      this.broadcastState(room.id);

      // Settle trick after delay for visual feedback
      setTimeout(() => {
        this.settleTrickResolution(room.id, result);
      }, 1600);

      return room;
    }

    // Trick continues: advance turn to next active player
    const nextPlayerId = getNextPlayerId(
      playerId,
      room.players,
      room.escapedPlayerIds
    );
    room.currentTurnPlayerId = nextPlayerId;
    room.stateVersion += 1;

    this.broadcastState(room.id);
    this.scheduleBotTurnIfNeeded(room);

    return room;
  }

  private settleTrickResolution(roomId: string, result: TrickResult) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'RESOLVING_TRICK') return;

    // If it was a Thulla, transfer collected cards to the penalty recipient
    if (result.isThulla && result.penaltyPlayerId) {
      const penaltyHand = room.allHands[result.penaltyPlayerId] || [];
      const collectedCards = result.playedCards.map((p) => p.card);
      room.allHands[result.penaltyPlayerId] = [...penaltyHand, ...collectedCards];
      const penaltyPlayer = room.players.find(
        (p) => p.id === result.penaltyPlayerId
      );
      if (penaltyPlayer) {
        penaltyPlayer.cardsCount = room.allHands[result.penaltyPlayerId].length;
      }
    }

    // Check for players who have escaped (0 cards left)
    for (const p of room.players) {
      if (
        !room.escapedPlayerIds.includes(p.id) &&
        room.allHands[p.id]?.length === 0
      ) {
        room.escapedPlayerIds.push(p.id);
        const rank = room.escapedPlayerIds.length;
        p.escapedRank = rank;
        room.recentLogs.push(
          `🎉 ${p.username} escaped in position #${rank} (Bach gaya!)`
        );
        room.commentary = {
          speakerName: 'Ustad (Commentator)',
          text: `Wah! ${p.username} escaped and got away!`,
          urduText: `واہ! ${p.username} نکل گیا اور بچ گیا!`,
          timestamp: Date.now(),
        };
      }
    }

    // Check if Game Over: Only 1 player remaining with cards
    const remainingActivePlayers = room.players.filter(
      (p) => !room.escapedPlayerIds.includes(p.id)
    );

    if (remainingActivePlayers.length <= 1) {
      room.status = 'GAME_OVER';
      const bhabhi = remainingActivePlayers[0];
      if (bhabhi) {
        room.bhabhiPlayerId = bhabhi.id;
        bhabhi.escapedRank = room.players.length; // Last place
        room.recentLogs.push(`👑 GAME OVER: ${bhabhi.username} is the BHABHI!`);
        room.commentary = {
          speakerName: 'Ustad (Commentator)',
          text: `Haaye! ${bhabhi.username} ban gaya BHABHI!`,
          urduText: `ہائے! ${bhabhi.username} بن گیا بھابھی!`,
          timestamp: Date.now(),
        };

        // Record match in storage
        gameStorage.recordMatchSummary({
          id: crypto.randomUUID(),
          roomId: room.id,
          roomCode: room.roomCode,
          playerCount: room.players.length,
          players: room.players.map((p) => ({
            id: p.id,
            username: p.username,
            isBot: p.isBot,
            escapedRank: p.escapedRank,
            finalCardCount: room.allHands[p.id]?.length || 0,
          })),
          bhabhiPlayer: {
            id: bhabhi.id,
            username: bhabhi.username,
          },
          totalTricks: room.trickNumber,
          totalThullas: room.thullaCount,
          durationSeconds: Math.round(
            (Date.now() - (room.gameStartedAt || Date.now())) / 1000
          ),
          endedAt: Date.now(),
        });
      }
      room.stateVersion += 1;
      this.broadcastState(room.id);
      return;
    }

    // Reset trick table for next round
    room.currentTrick = [];
    room.leadSuit = null;
    room.trickNumber += 1;
    room.status = 'PLAYING';

    // Next leader
    let nextLeader = result.nextLeaderId;
    if (room.escapedPlayerIds.includes(nextLeader)) {
      // If the intended leader just escaped, pass lead to the next eligible player
      nextLeader =
        getNextPlayerId(nextLeader, room.players, room.escapedPlayerIds) ||
        remainingActivePlayers[0].id;
    }

    room.currentTurnPlayerId = nextLeader;
    room.stateVersion += 1;

    this.broadcastState(room.id);
    this.scheduleBotTurnIfNeeded(room);
  }

  private scheduleBotTurnIfNeeded(room: RoomSession) {
    if (room.status !== 'PLAYING' || !room.currentTurnPlayerId) return;

    const currentTurnPlayer = room.players.find(
      (p) => p.id === room.currentTurnPlayerId
    );

    if (currentTurnPlayer && currentTurnPlayer.isBot) {
      const botId = currentTurnPlayer.id;
      // Realistic thinking delay between 900ms and 1500ms
      const delay = 900 + Math.random() * 500;
      setTimeout(() => {
        try {
          const freshRoom = this.rooms.get(room.id);
          if (
            !freshRoom ||
            freshRoom.status !== 'PLAYING' ||
            freshRoom.currentTurnPlayerId !== botId
          ) {
            return;
          }

          const botHand = freshRoom.allHands[botId] || [];
          if (botHand.length === 0) return;

          const legalCards = getLegalMoves(
            botHand,
            freshRoom.trickNumber,
            freshRoom.currentTrick,
            freshRoom.leadSuit,
            freshRoom.rules
          );

          if (legalCards.length === 0) return;

          const chosenCardId = chooseBotMove(
            botHand,
            legalCards,
            freshRoom.currentTrick,
            freshRoom.leadSuit
          );

          this.playCard(freshRoom.id, botId, chosenCardId, crypto.randomUUID());
        } catch (err) {
          console.error('Error executing bot move:', err);
        }
      }, delay);
    }
  }

  rematch(roomId: string, playerId: string): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not in room');

    // Reset game state to lobby or re-deal
    const playerIds = room.players.map((p) => p.id);
    const { hands, leaderId } = dealCards(playerIds, room.rules);

    room.allHands = hands;
    for (const p of room.players) {
      p.cardsCount = hands[p.id].length;
      p.escapedRank = undefined;
    }

    room.status = 'PLAYING';
    room.currentTurnPlayerId = leaderId;
    room.leadSuit = null;
    room.currentTrick = [];
    room.trickNumber = 1;
    room.escapedPlayerIds = [];
    room.bhabhiPlayerId = null;
    room.lastTrickResult = null;
    room.thullaCount = 0;
    room.gameStartedAt = Date.now();
    room.stateVersion += 1;

    const leaderName =
      room.players.find((p) => p.id === leaderId)?.username || 'Leader';
    room.commentary = {
      speakerName: 'Ustad (Commentator)',
      text: `Rematch started! ${leaderName} holds the Ace of Spades!`,
      urduText: `دوبارہ مقابلہ شروع! ${leaderName} کے پاس حکم کا اِکا ہے!`,
      timestamp: Date.now(),
    };
    room.recentLogs.push(`Rematch started by ${player.username}`);

    this.broadcastState(room.id);
    this.scheduleBotTurnIfNeeded(room);

    return room;
  }

  forceEndGame(roomId: string, playerId: string, password: string): RoomSession {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not in room');

    if (password !== 'malik123') {
      throw new Error('Incorrect password to end the game');
    }

    if (room.status !== 'PLAYING' && room.status !== 'RESOLVING_TRICK') {
      throw new Error('Game is not currently active');
    }

    // Determine rankings based on remaining cards
    const unescaped = room.players.filter(
      (p) => !room.escapedPlayerIds.includes(p.id)
    );

    // Sort unescaped players by remaining cards count ascending
    unescaped.sort((a, b) => {
      const aCount = room.allHands[a.id]?.length || 0;
      const bCount = room.allHands[b.id]?.length || 0;
      return aCount - bCount;
    });

    let currentRank = room.escapedPlayerIds.length + 1;
    for (let i = 0; i < unescaped.length - 1; i++) {
      unescaped[i].escapedRank = currentRank++;
      room.escapedPlayerIds.push(unescaped[i].id);
    }

    const bhabhi = unescaped[unescaped.length - 1] || unescaped[0];
    if (bhabhi) {
      room.bhabhiPlayerId = bhabhi.id;
      bhabhi.escapedRank = room.players.length;
    }

    room.status = 'GAME_OVER';
    room.stateVersion += 1;
    const bhabhiName = bhabhi ? bhabhi.username : 'Player';
    room.recentLogs.push(
      `Game manually ended with authorized password by ${player.username}. ${bhabhiName} is the Bhabhi!`
    );
    room.commentary = {
      speakerName: 'Ustad (Commentator)',
      text: `Game ended by password! ${bhabhiName} has the most cards and is declared Bhabhi!`,
      urduText: `پاسورڈ کے ذریعے کھیل ختم! سب سے زیادہ تاش ہونے کی وجہ سے ${bhabhiName} بھابھی بن گیا!`,
      timestamp: Date.now(),
    };

    gameStorage.recordMatchSummary({
      id: crypto.randomUUID(),
      roomId: room.id,
      roomCode: room.roomCode,
      playerCount: room.players.length,
      players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        escapedRank: p.escapedRank,
        finalCardCount: room.allHands[p.id]?.length || 0,
      })),
      bhabhiPlayer: bhabhi
        ? { id: bhabhi.id, username: bhabhi.username }
        : null,
      totalTricks: room.trickNumber,
      totalThullas: room.thullaCount,
      durationSeconds: Math.round(
        (Date.now() - (room.gameStartedAt || Date.now())) / 1000
      ),
      endedAt: Date.now(),
    });

    this.broadcastState(room.id);
    return room;
  }

  // Master Testing Mode Authorization & Privileged Inspection
  authorizeMaster(passcode: string, username: string): { success: boolean; token?: string } {
    const expectedPasscode =
      process.env.MASTER_ACCESS_PASSCODE || 'bhabhi_master_secret';

    if (username !== 'K#ub@!b') {
      gameStorage.logMasterAction(
        'MASTER_AUTH_REJECTED',
        username,
        'Username does not match reserved Master account'
      );
      return { success: false };
    }

    if (passcode !== expectedPasscode) {
      gameStorage.logMasterAction(
        'MASTER_AUTH_FAILED',
        username,
        'Invalid passcode provided'
      );
      return { success: false };
    }

    const token = `master_${crypto.randomBytes(32).toString('hex')}`;
    this.authorizedMasterTokens.add(token);

    gameStorage.logMasterAction(
      'MASTER_AUTH_GRANTED',
      username,
      'Authorized Master testing session created'
    );

    return { success: true, token };
  }

  isMasterTokenValid(token?: string): boolean {
    if (!token) return false;
    return this.authorizedMasterTokens.has(token);
  }

  getMasterPrivilegedState(roomId: string, token: string): MasterPrivilegedState {
    if (!this.isMasterTokenValid(token)) {
      throw new Error('Unauthorized Master inspection attempt');
    }

    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const cardsInPlay = Object.values(room.allHands).reduce(
      (sum, h) => sum + h.length,
      0
    );

    gameStorage.logMasterAction(
      'MASTER_INSPECT_ROOM',
      'K#ub@!b',
      `Inspected room ${room.roomCode} (v${room.stateVersion})`
    );

    return {
      roomId: room.id,
      stateVersion: room.stateVersion,
      allPlayerHands: room.allHands,
      serverAuditLogs: gameStorage.getMasterAuditLogs(),
      diagnostics: {
        totalDeckCount: 52,
        cardsInPlay,
        cardsInWaste: 52 - cardsInPlay - room.currentTrick.length,
        connectedSockets: room.players.filter(
          (p) => p.connectionStatus === 'CONNECTED'
        ).length,
        roomMemoryUptimeMs: Date.now() - room.createdAt,
      },
    };
  }

  triggerMasterAction(
    roomId: string,
    token: string,
    actionType: 'FORCE_BOT_MOVE' | 'RESET_GAME'
  ) {
    if (!this.isMasterTokenValid(token)) {
      throw new Error('Unauthorized Master action');
    }

    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    gameStorage.logMasterAction(
      'MASTER_ACTION_TRIGGERED',
      'K#ub@!b',
      `Triggered ${actionType} on room ${room.roomCode}`
    );

    if (actionType === 'FORCE_BOT_MOVE' && room.currentTurnPlayerId) {
      const curPlayer = room.players.find(
        (p) => p.id === room.currentTurnPlayerId
      );
      if (curPlayer) {
        const hand = room.allHands[curPlayer.id] || [];
        const legal = getLegalMoves(
          hand,
          room.trickNumber,
          room.currentTrick,
          room.leadSuit,
          room.rules
        );
        if (legal.length > 0) {
          this.playCard(
            room.id,
            curPlayer.id,
            legal[0],
            `master_${Date.now()}`
          );
        }
      }
    } else if (actionType === 'RESET_GAME') {
      room.status = 'LOBBY';
      room.allHands = {};
      room.currentTrick = [];
      room.currentTurnPlayerId = null;
      room.stateVersion += 1;
      this.broadcastState(room.id);
    }
  }

  // State projection for private players
  getPrivateState(room: RoomSession, playerId: string): PrivatePlayerState {
    const myHand = room.allHands[playerId] || [];
    const isMyTurn =
      room.status === 'PLAYING' && room.currentTurnPlayerId === playerId;
    const legalCardIds = isMyTurn
      ? getLegalMoves(
          myHand,
          room.trickNumber,
          room.currentTrick,
          room.leadSuit,
          room.rules
        )
      : [];

    return {
      roomId: room.id,
      roomCode: room.roomCode,
      status: room.status,
      rules: room.rules,
      players: room.players,
      currentTurnPlayerId: room.currentTurnPlayerId,
      leadSuit: room.leadSuit,
      currentTrick: room.currentTrick,
      trickNumber: room.trickNumber,
      escapedPlayerIds: room.escapedPlayerIds,
      bhabhiPlayerId: room.bhabhiPlayerId,
      stateVersion: room.stateVersion,
      lastTrickResult: room.lastTrickResult,
      commentary: room.commentary,
      recentLogs: room.recentLogs.slice(-10),
      myCards: myHand,
      legalCardIds,
      myPlayerId: playerId,
      isMyTurn,
    };
  }

  getRoom(roomId: string): RoomSession | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): RoomSession | undefined {
    const id = this.codeToRoomId.get(code);
    return id ? this.rooms.get(id) : undefined;
  }

  private broadcastState(roomId: string) {
    if (this.broadcastCallback) {
      this.broadcastCallback(roomId);
    }
  }
}

export const roomManager = new RoomManager();
