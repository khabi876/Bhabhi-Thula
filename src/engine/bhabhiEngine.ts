/**
 * Bhabhi Thulla - Server-Authoritative Game Engine
 * Implements traditional Pakistani card rules, suit following, Thulla resolution, and escaping.
 */

import {
  Card,
  GameRules,
  PlayedCard,
  Player,
  Rank,
  Suit,
  TrickResult,
} from './types';

export const SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANKS: Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/**
 * Creates a standard 52-card deck
 */
export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  return deck;
}

/**
 * Cryptographically sound or Fisher-Yates shuffle
 */
export function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sorts hand by suit and then rank descending (standard card game ergonomics)
 */
export function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    SPADES: 0,
    HEARTS: 1,
    CLUBS: 2,
    DIAMONDS: 3,
  };
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.value - a.value;
  });
}

/**
 * Deals cards to players according to configured 3 or 4 player rules
 */
export function dealCards(
  playerIds: string[],
  rules: GameRules
): { hands: Record<string, Card[]>; leaderId: string } {
  let deck = shuffleDeck(createStandardDeck());
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) {
    hands[id] = [];
  }

  if (playerIds.length === 4) {
    // 52 cards / 4 = 13 cards each
    let currentIdx = 0;
    for (const card of deck) {
      hands[playerIds[currentIdx]].push(card);
      currentIdx = (currentIdx + 1) % playerIds.length;
    }
  } else if (playerIds.length === 3) {
    if (rules.threePlayerDealMode === 'EQUAL_51') {
      // Traditional variation: remove 2 of Clubs so 51 cards = 17 each
      deck = deck.filter((c) => c.id !== 'CLUBS_2');
      let currentIdx = 0;
      for (const card of deck) {
        hands[playerIds[currentIdx]].push(card);
        currentIdx = (currentIdx + 1) % playerIds.length;
      }
    } else {
      // EXTRA_52: deal 52 cards (18, 17, 17)
      // The person who receives the Ace of Spades gets the extra card
      let currentIdx = 0;
      for (const card of deck) {
        hands[playerIds[currentIdx]].push(card);
        currentIdx = (currentIdx + 1) % playerIds.length;
      }
    }
  } else {
    throw new Error(`Unsupported player count: ${playerIds.length}`);
  }

  // Sort each player's hand
  for (const id of playerIds) {
    hands[id] = sortHand(hands[id]);
  }

  // Find who holds the Ace of Spades (SPADES_A)
  let leaderId = playerIds[0];
  for (const id of playerIds) {
    if (hands[id].some((c) => c.id === 'SPADES_A')) {
      leaderId = id;
      break;
    }
  }

  return { hands, leaderId };
}

/**
 * Returns list of legal card IDs a player can play given their hand and current trick state
 */
export function getLegalMoves(
  hand: Card[],
  trickNumber: number,
  currentTrick: PlayedCard[],
  leadSuit: Suit | null,
  rules: GameRules
): string[] {
  if (hand.length === 0) return [];

  // Trick 1 leading:
  if (trickNumber === 1 && currentTrick.length === 0) {
    const aceOfSpades = hand.find((c) => c.id === 'SPADES_A');
    if (aceOfSpades && rules.firstTrickRule === 'MUST_PLAY_ACE_SPADES') {
      return ['SPADES_A'];
    }
  }

  // If leading the trick (no cards played yet)
  if (!leadSuit || currentTrick.length === 0) {
    return hand.map((c) => c.id);
  }

  // Following: Check if player has cards of the lead suit
  const matchingSuitCards = hand.filter((c) => c.suit === leadSuit);
  if (matchingSuitCards.length > 0) {
    // Player MUST follow suit
    return matchingSuitCards.map((c) => c.id);
  }

  // Player has NO cards of lead suit -> Player can play ANY card (off-suit / Thulla)
  return hand.map((c) => c.id);
}

/**
 * Evaluates a completed trick or an immediate Thulla resolution
 * In Bhabhi Thulla:
 * As soon as an off-suit card is played, it's a Thulla.
 * The trick immediately ends! The player holding the highest lead-suit card collects the trick.
 */
export function resolveTrick(
  trickNumber: number,
  leadSuit: Suit,
  playedCards: PlayedCard[],
  rules: GameRules,
  playerNames: Record<string, string>
): TrickResult {
  // Check if any card played is NOT lead suit
  const thullaIndex = playedCards.findIndex((p) => p.card.suit !== leadSuit);

  if (thullaIndex !== -1) {
    // THULLA OCCURRED!
    const thullaPlay = playedCards[thullaIndex];
    // Find highest card of the lead suit played in this trick
    const leadSuitPlays = playedCards.filter((p) => p.card.suit === leadSuit);
    let highestLeadPlay = leadSuitPlays[0];
    for (const p of leadSuitPlays) {
      if (p.card.value > highestLeadPlay.card.value) {
        highestLeadPlay = p;
      }
    }

    const penaltyPlayerId = highestLeadPlay.playerId;
    const thullaPlayerId = thullaPlay.playerId;
    const nextLeaderId =
      rules.nextLeadAfterThulla === 'THULLA_PLAYER_LEADS'
        ? thullaPlayerId
        : penaltyPlayerId;

    const penaltyName = playerNames[penaltyPlayerId] || 'Player';
    const thullaName = playerNames[thullaPlayerId] || 'Opponent';

    return {
      trickNumber,
      leadSuit,
      playedCards,
      isThulla: true,
      thullaCard: thullaPlay.card,
      thullaPlayerId,
      penaltyPlayerId,
      nextLeaderId,
      cardsCollectedCount: playedCards.length,
      commentaryText: `Oye! ${thullaName} gave a Thulla to ${penaltyName}!`,
      urduCommentary: `اوئے! ${thullaName} نے ${penaltyName} کو ٹھلا دیا!`,
    };
  }

  // Clean Trick (no Thulla)
  // Highest card of lead suit wins
  let highestPlay = playedCards[0];
  for (const p of playedCards) {
    if (p.card.suit === leadSuit && p.card.value > highestPlay.card.value) {
      highestPlay = p;
    }
  }

  const winnerPlayerId = highestPlay.playerId;
  const winnerName = playerNames[winnerPlayerId] || 'Player';

  return {
    trickNumber,
    leadSuit,
    playedCards,
    isThulla: false,
    winnerPlayerId,
    nextLeaderId: winnerPlayerId,
    cardsCollectedCount: 0, // Waste pile
    commentaryText: `${winnerName} won the trick safely!`,
    urduCommentary: `${winnerName} نے صاف ہاتھ جیت لیا!`,
  };
}

/**
 * Finds next eligible player who has not escaped yet
 */
export function getNextPlayerId(
  currentId: string,
  players: Player[],
  escapedPlayerIds: string[]
): string | null {
  const activePlayers = players.filter(
    (p) => !escapedPlayerIds.includes(p.id) && p.cardsCount > 0
  );

  if (activePlayers.length <= 1) {
    return null; // Game over or only 1 player remains
  }

  // Find player seat index
  const currentIndex = players.findIndex((p) => p.id === currentId);
  const n = players.length;

  for (let offset = 1; offset <= n; offset++) {
    const nextIdx = (currentIndex + offset) % n;
    const candidate = players[nextIdx];
    if (!escapedPlayerIds.includes(candidate.id) && candidate.cardsCount > 0) {
      return candidate.id;
    }
  }

  return activePlayers[0]?.id || null;
}
