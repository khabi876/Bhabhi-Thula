/**
 * AI Bot Logic for Bhabhi Thulla
 * Makes intelligent, legal moves adhering to Pakistani Bhabhi Thulla strategy.
 */

import { Card, PlayedCard, Suit } from './types';

export function chooseBotMove(
  hand: Card[],
  legalCardIds: string[],
  currentTrick: PlayedCard[],
  leadSuit: Suit | null
): string {
  if (legalCardIds.length === 0) {
    throw new Error('Bot has no legal moves');
  }
  if (legalCardIds.length === 1) {
    return legalCardIds[0];
  }

  const legalCards = hand.filter((c) => legalCardIds.includes(c.id));

  // Case 1: Giving a Thulla! (None of the legal cards match the lead suit)
  const isThrowingThulla = leadSuit && !legalCards.some((c) => c.suit === leadSuit);
  if (isThrowingThulla) {
    // Strategic joy of Bhabhi: Dump your HIGHEST off-suit card on the victim!
    // E.g. dump King or Ace of another suit so you don't get stuck with it later!
    legalCards.sort((a, b) => b.value - a.value);
    return legalCards[0].id;
  }

  // Case 2: Following suit
  if (leadSuit) {
    const leadCards = legalCards.filter((c) => c.suit === leadSuit);
    if (leadCards.length > 0) {
      // Look at current highest lead card on table
      const playedLeadCards = currentTrick.filter((p) => p.card.suit === leadSuit);
      const currentHighestLeadValue = playedLeadCards.reduce(
        (max, p) => Math.max(max, p.card.value),
        0
      );

      // In Bhabhi, being the highest lead card carries the risk of taking a Thulla
      // if someone downstream is void in the suit.
      // If we have cards lower than current highest, playing low is very safe!
      const lowerCards = leadCards.filter((c) => c.value < currentHighestLeadValue);
      if (lowerCards.length > 0) {
        // Play highest among the lower cards (preserves lowest for later or dumps medium)
        lowerCards.sort((a, b) => b.value - a.value);
        return lowerCards[0].id;
      }

      // If we only have higher cards, play the lowest of our higher cards to minimize risk
      leadCards.sort((a, b) => a.value - b.value);
      return leadCards[0].id;
    }
  }

  // Case 3: Leading the trick
  // Choose suit where we have safe distribution (e.g. low card or long suit)
  // Avoid leading high singletons that might attract a Thulla
  legalCards.sort((a, b) => a.value - b.value);
  return legalCards[0].id;
}
