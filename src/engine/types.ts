/**
 * Bhabhi Thulla - Core Game Types
 * Traditional Pakistani Card Game (Get Away)
 */

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // e.g., 'SPADES_A', 'HEARTS_10'
  suit: Suit;
  rank: Rank;
  value: number; // 2..14 (Ace = 14)
}

export interface PlayedCard {
  card: Card;
  playerId: string;
  timestamp: number;
}

export interface GameRules {
  targetPlayerCount: 3 | 4;
  // 3-Player dealing mode:
  // 'EQUAL_51': 51 cards (remove 2 of Clubs so each gets 17)
  // 'EXTRA_52': 52 cards (Ace of Spades holder gets 18, others 17)
  threePlayerDealMode: 'EQUAL_51' | 'EXTRA_52';
  // First trick rule:
  // 'MUST_PLAY_ACE_SPADES': player holding ♠A MUST play it as the first lead card
  firstTrickRule: 'MUST_PLAY_ACE_SPADES';
  // Next lead after Thulla:
  // 'THULLA_PLAYER_LEADS': The player who played the Thulla leads next
  // 'PENALTY_HOLDER_LEADS': The player who collected the trick leads next
  nextLeadAfterThulla: 'THULLA_PLAYER_LEADS' | 'PENALTY_HOLDER_LEADS';
}

export type PlayerConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isBot: boolean;
  connectionStatus: PlayerConnectionStatus;
  cardsCount: number;
  escapedRank?: number; // 1 for first to escape, 2 for second, etc.
  avatarSeed: number;
  seatIndex: number;
  isMaster?: boolean;
}

export type RoomStatus = 'LOBBY' | 'DEALING' | 'PLAYING' | 'RESOLVING_TRICK' | 'GAME_OVER';

export interface TrickResult {
  trickNumber: number;
  leadSuit: Suit;
  playedCards: PlayedCard[];
  isThulla: boolean;
  thullaCard?: Card;
  thullaPlayerId?: string;
  penaltyPlayerId?: string; // Player who collected the cards
  winnerPlayerId?: string;  // Player who won the trick if safe
  nextLeaderId: string;
  cardsCollectedCount: number;
  commentaryText?: string;
  urduCommentary?: string;
}

export interface PublicGameState {
  roomId: string;
  roomCode: string;
  status: RoomStatus;
  rules: GameRules;
  players: Player[];
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
}

export interface PrivatePlayerState extends PublicGameState {
  myCards: Card[];
  legalCardIds: string[];
  myPlayerId: string;
  isMyTurn: boolean;
}

export interface MasterPlayerInspection {
  player: Player;
  cards: Card[];
  legalCardIds: string[];
}

export interface MasterPrivilegedState {
  roomId: string;
  stateVersion: number;
  allPlayerHands: Record<string, Card[]>;
  serverAuditLogs: {
    timestamp: number;
    action: string;
    actor: string;
    details: string;
  }[];
  diagnostics: {
    totalDeckCount: number;
    cardsInPlay: number;
    cardsInWaste: number;
    connectedSockets: number;
    roomMemoryUptimeMs: number;
  };
}

export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomCode: string; username: string; sessionToken?: string }
  | { type: 'CREATE_ROOM'; username: string; targetPlayerCount: 3 | 4; rules?: Partial<GameRules> }
  | { type: 'START_GAME' }
  | { type: 'TOGGLE_BOT_FILL' }
  | { type: 'UPDATE_RULES'; rules: Partial<GameRules> }
  | { type: 'PLAY_CARD'; cardId: string; actionId: string }
  | { type: 'REQUEST_STATE_SYNC' }
  | { type: 'MASTER_AUTH'; passcode: string }
  | { type: 'MASTER_INSPECT_PLAYER'; targetPlayerId: string }
  | { type: 'MASTER_TRIGGER_TEST_ACTION'; actionType: 'FORCE_BOT_MOVE' | 'RESET_GAME' }
  | { type: 'RESTART_REMATCH' }
  | { type: 'FORCE_END_GAME'; password: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'HEARTBEAT' };

export type ServerMessage =
  | { type: 'JOIN_SUCCESS'; playerId: string; sessionToken: string; roomId: string; roomCode: string }
  | { type: 'STATE_UPDATE'; state: PrivatePlayerState }
  | { type: 'MASTER_AUTH_SUCCESS'; privilegedState: MasterPrivilegedState }
  | { type: 'MASTER_STATE_UPDATE'; privilegedState: MasterPrivilegedState }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'PONG' };
