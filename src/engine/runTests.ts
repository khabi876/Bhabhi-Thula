/**
 * Automated test suite for Bhabhi Thulla Game Engine
 * Validates 52-card uniqueness, 3/4-player dealing, suit-following, Thulla resolution, and escaping.
 */

import {
  createStandardDeck,
  dealCards,
  getLegalMoves,
  resolveTrick,
  shuffleDeck,
} from './bhabhiEngine';
import { chooseBotMove } from './aiBot';
import { Card, GameRules, PlayedCard } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- STARTING BHABHI THULLA ENGINE TESTS ---');

// Test 1: Standard 52-card deck uniqueness
const deck = createStandardDeck();
assert(deck.length === 52, 'Deck must contain exactly 52 cards');
const uniqueIds = new Set(deck.map((c) => c.id));
assert(uniqueIds.size === 52, 'All 52 cards must have unique IDs');

// Test 2: Shuffling integrity
const shuffled = shuffleDeck(deck);
assert(shuffled.length === 52, 'Shuffled deck must still contain 52 cards');
const shuffledSet = new Set(shuffled.map((c) => c.id));
assert(shuffledSet.size === 52, 'Shuffling must not duplicate or lose any cards');

// Test 3: 4-Player dealing
const defaultRules: GameRules = {
  targetPlayerCount: 4,
  threePlayerDealMode: 'EQUAL_51',
  firstTrickRule: 'MUST_PLAY_ACE_SPADES',
  nextLeadAfterThulla: 'THULLA_PLAYER_LEADS',
};
const fourPlayers = ['p1', 'p2', 'p3', 'p4'];
const deal4 = dealCards(fourPlayers, defaultRules);
for (const p of fourPlayers) {
  assert(deal4.hands[p].length === 13, `4-player deal: ${p} must have 13 cards`);
}
assert(
  deal4.hands[deal4.leaderId].some((c) => c.id === 'SPADES_A'),
  'The leader of first trick must hold Ace of Spades'
);

// Test 4: 3-Player dealing (Equal 51 mode: removes 2 of Clubs)
const threeRules51: GameRules = {
  ...defaultRules,
  targetPlayerCount: 3,
  threePlayerDealMode: 'EQUAL_51',
};
const threePlayers = ['p1', 'p2', 'p3'];
const deal3_51 = dealCards(threePlayers, threeRules51);
for (const p of threePlayers) {
  assert(deal3_51.hands[p].length === 17, `3-player deal (51 mode): ${p} must have 17 cards`);
}
const allCardsIn3 = Object.values(deal3_51.hands).flat();
assert(
  !allCardsIn3.some((c) => c.id === 'CLUBS_2'),
  '3-player deal 51-mode must have removed 2 of Clubs'
);

// Test 5: 3-Player dealing (52 mode: 18, 17, 17)
const threeRules52: GameRules = {
  ...defaultRules,
  targetPlayerCount: 3,
  threePlayerDealMode: 'EXTRA_52',
};
const deal3_52 = dealCards(threePlayers, threeRules52);
const counts = threePlayers.map((p) => deal3_52.hands[p].length).sort((a, b) => a - b);
assert(
  counts[0] === 17 && counts[1] === 17 && counts[2] === 18,
  '3-player deal (52 mode) must distribute 17, 17, and 18 cards'
);

// Test 6: First trick rule (Must play Ace of Spades)
const handWithAceOfSpades: Card[] = [
  { id: 'SPADES_A', suit: 'SPADES', rank: 'A', value: 14 },
  { id: 'HEARTS_K', suit: 'HEARTS', rank: 'K', value: 13 },
  { id: 'CLUBS_7', suit: 'CLUBS', rank: '7', value: 7 },
];
const legalFirstTrick = getLegalMoves(handWithAceOfSpades, 1, [], null, defaultRules);
assert(
  legalFirstTrick.length === 1 && legalFirstTrick[0] === 'SPADES_A',
  'First trick lead MUST be Ace of Spades'
);

// Test 7: Suit-following enforcement
const handMixed: Card[] = [
  { id: 'SPADES_10', suit: 'SPADES', rank: '10', value: 10 },
  { id: 'SPADES_4', suit: 'SPADES', rank: '4', value: 4 },
  { id: 'HEARTS_A', suit: 'HEARTS', rank: 'A', value: 14 },
];
const playedCards: PlayedCard[] = [
  { card: { id: 'SPADES_A', suit: 'SPADES', rank: 'A', value: 14 }, playerId: 'p1', timestamp: Date.now() },
];
const legalMovesSpades = getLegalMoves(handMixed, 1, playedCards, 'SPADES', defaultRules);
assert(
  legalMovesSpades.length === 2 &&
    legalMovesSpades.includes('SPADES_10') &&
    legalMovesSpades.includes('SPADES_4') &&
    !legalMovesSpades.includes('HEARTS_A'),
  'Player with Spades MUST follow Spades and cannot play Hearts'
);

// Test 8: Void in lead suit allows Thulla (any off-suit card)
const handVoidInSpades: Card[] = [
  { id: 'HEARTS_K', suit: 'HEARTS', rank: 'K', value: 13 },
  { id: 'DIAMONDS_A', suit: 'DIAMONDS', rank: 'A', value: 14 },
];
const legalMovesVoid = getLegalMoves(handVoidInSpades, 2, playedCards, 'SPADES', defaultRules);
assert(
  legalMovesVoid.length === 2 &&
    legalMovesVoid.includes('HEARTS_K') &&
    legalMovesVoid.includes('DIAMONDS_A'),
  'Player void in lead suit can play any card (Thulla)'
);

// Test 9: Clean Trick Resolution (No Thulla)
const cleanTrick: PlayedCard[] = [
  { card: { id: 'HEARTS_7', suit: 'HEARTS', rank: '7', value: 7 }, playerId: 'p1', timestamp: 1 },
  { card: { id: 'HEARTS_Q', suit: 'HEARTS', rank: 'Q', value: 12 }, playerId: 'p2', timestamp: 2 },
  { card: { id: 'HEARTS_9', suit: 'HEARTS', rank: '9', value: 9 }, playerId: 'p3', timestamp: 3 },
  { card: { id: 'HEARTS_4', suit: 'HEARTS', rank: '4', value: 4 }, playerId: 'p4', timestamp: 4 },
];
const cleanResult = resolveTrick(2, 'HEARTS', cleanTrick, defaultRules, {
  p1: 'Ali',
  p2: 'Bilal',
  p3: 'Tariq',
  p4: 'Zainab',
});
assert(cleanResult.isThulla === false, 'Trick with all matching suit must NOT be Thulla');
assert(cleanResult.winnerPlayerId === 'p2', 'Highest Heart (Queen) must win the clean trick');
assert(cleanResult.nextLeaderId === 'p2', 'Winner of clean trick leads next');

// Test 10: Thulla Trick Resolution!
// p1 plays ♠K (lead), p2 plays ♠10, p3 plays ♥A (THULLA!)
const thullaTrick: PlayedCard[] = [
  { card: { id: 'SPADES_K', suit: 'SPADES', rank: 'K', value: 13 }, playerId: 'p1', timestamp: 1 },
  { card: { id: 'SPADES_10', suit: 'SPADES', rank: '10', value: 10 }, playerId: 'p2', timestamp: 2 },
  { card: { id: 'HEARTS_A', suit: 'HEARTS', rank: 'A', value: 14 }, playerId: 'p3', timestamp: 3 }, // Off-suit!
];
const thullaResult = resolveTrick(3, 'SPADES', thullaTrick, defaultRules, {
  p1: 'Ali',
  p2: 'Bilal',
  p3: 'Tariq',
});
assert(thullaResult.isThulla === true, 'Off-suit card must trigger Thulla');
assert(thullaResult.thullaPlayerId === 'p3', 'p3 played the off-suit Thulla');
assert(
  thullaResult.penaltyPlayerId === 'p1',
  'p1 played the highest card of the lead suit (♠K) and must take the penalty'
);
assert(
  thullaResult.nextLeaderId === 'p3',
  'In THULLA_PLAYER_LEADS mode, the Thulla thrower (p3) leads next'
);
assert(
  thullaResult.cardsCollectedCount === 3,
  'Penalty recipient must collect all 3 cards from the trick'
);

// Test 11: AI Bot strategic move
const botMove = chooseBotMove(handVoidInSpades, ['HEARTS_K', 'DIAMONDS_A'], playedCards, 'SPADES');
assert(
  botMove === 'DIAMONDS_A',
  'Bot throwing Thulla should strategically dump highest card (♦A)'
);

// Test 12: Force End Game with Password malik123
import { roomManager } from '../server/roomManager';
const { room: testRoom, hostPlayer } = roomManager.createRoom('HostTest', 4);
roomManager.startGame(testRoom.id, hostPlayer.id);

// Should fail with wrong password
let failedWithWrongPass = false;
try {
  roomManager.forceEndGame(testRoom.id, hostPlayer.id, 'wrongpass');
} catch (e: any) {
  failedWithWrongPass = true;
}
assert(failedWithWrongPass, 'forceEndGame must reject incorrect password');

// Should succeed with malik123
const endedRoom = roomManager.forceEndGame(testRoom.id, hostPlayer.id, 'malik123');
assert(endedRoom.status === 'GAME_OVER', 'forceEndGame must transition room status to GAME_OVER');
assert(endedRoom.bhabhiPlayerId !== null, 'forceEndGame must crown a Bhabhi');

console.log('--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
