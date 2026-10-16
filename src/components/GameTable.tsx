/**
 * GameTable Component
 * Landscape-first Pakistani card room table with authentic felt texture,
 * player seats, card fanning, center trick arena, Thulla shockwaves, and speech bubbles.
 */

import React, { useEffect, useState } from 'react';
import { Card, PlayedCard, Player, PrivatePlayerState, Suit } from '../engine/types';
import { PlayingCard } from './PlayingCard';
import { socketClient } from '../services/socketClient';
import { soundEffects } from '../services/soundEffects';
import { commentaryService } from '../services/commentary';
import {
  RotateCcw,
  Sparkles,
  Zap,
  Shield,
  Volume2,
  VolumeX,
  Smartphone,
  Crown,
  ChevronRight,
  Flag,
  KeyRound,
  X,
} from 'lucide-react';

interface GameTableProps {
  state: PrivatePlayerState;
  onOpenMaster?: () => void;
  onOpenSettings?: () => void;
  onOpenRules?: () => void;
}

const SUIT_ICONS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

export const GameTable: React.FC<GameTableProps> = ({
  state,
  onOpenMaster,
  onOpenSettings,
  onOpenRules,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showThullaBanner, setShowThullaBanner] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissPortraitTip, setDismissPortraitTip] = useState(false);

  // End Game password modal state
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [endGamePassword, setEndGamePassword] = useState('');
  const [endGameError, setEndGameError] = useState<string | null>(null);

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 768);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Monitor trick resolution & commentary for sound/visual triggers
  useEffect(() => {
    if (state.lastTrickResult) {
      if (state.lastTrickResult.isThulla) {
        soundEffects.playThullaImpact();
        commentaryService.speak('THULLA');
        setIsShaking(true);
        setShowThullaBanner(true);
        const timer1 = setTimeout(() => setIsShaking(false), 500);
        const timer2 = setTimeout(() => setShowThullaBanner(false), 2200);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else {
        soundEffects.playTrickSafe();
      }
    }
  }, [state.stateVersion, state.lastTrickResult]);

  // Turn ping for the active human player
  useEffect(() => {
    if (state.isMyTurn) {
      soundEffects.playYourTurnPing();
      if (state.trickNumber === 1 && state.currentTrick.length === 0) {
        commentaryService.speak('ACE_OF_SPADES');
      }
    }
  }, [state.isMyTurn, state.trickNumber]);

  // Separate seats relative to "My Player"
  const myPlayerId = state.myPlayerId;
  const myIndex = state.players.findIndex((p) => p.id === myPlayerId);
  const totalSeats = state.players.length;

  // Re-order players so "Me" is always at bottom seat
  const seatOrder: Player[] = [];
  if (myIndex !== -1) {
    for (let i = 0; i < totalSeats; i++) {
      seatOrder.push(state.players[(myIndex + i) % totalSeats]);
    }
  } else {
    seatOrder.push(...state.players);
  }

  const me = seatOrder[0];
  const opponents = seatOrder.slice(1);

  const handleCardClick = (card: Card) => {
    if (!state.isMyTurn) return;
    if (!state.legalCardIds.includes(card.id)) return;

    soundEffects.playCardSnap();
    socketClient.send({
      type: 'PLAY_CARD',
      cardId: card.id,
      actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    });
    setSelectedCardId(null);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#062114] select-none ${
        isShaking ? 'animate-shake' : ''
      }`}
    >
      {/* Portrait Prompt if on narrow mobile screens */}
      {isPortrait && !dismissPortraitTip && (
        <div className="absolute top-12 inset-x-4 z-40 p-3 rounded-2xl bg-amber-500/90 text-zinc-950 shadow-xl backdrop-blur-sm flex items-center justify-between text-xs font-semibold animate-bounce">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 rotate-90" />
            <span>Rotate phone to Landscape for best card experience!</span>
          </div>
          <button
            onClick={() => setDismissPortraitTip(true)}
            className="px-2 py-1 rounded bg-black/20 text-[11px] hover:bg-black/40"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top HUD Bar */}
      <div className="w-full flex items-center justify-between px-3 sm:px-6 py-2 bg-black/40 border-b border-amber-500/20 z-20 backdrop-blur-sm text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-black text-amber-400 text-sm tracking-wider">
              BHABHI THULLA
            </span>
            <span className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/30 font-mono px-2 py-0.5 rounded-full">
              Trick #{state.trickNumber}
            </span>
          </div>
          {state.leadSuit && (
            <div className="hidden sm:flex items-center gap-1 bg-black/50 px-2.5 py-0.5 rounded-full border border-emerald-800 text-[11px]">
              <span className="text-emerald-400/70">Lead Suit:</span>
              <span className="font-bold text-amber-300">
                {SUIT_ICONS[state.leadSuit]} {state.leadSuit}
              </span>
            </div>
          )}
        </div>

        {/* Live Commentary Bubble in HUD */}
        {state.commentary && (
          <div className="hidden md:flex items-center gap-2 bg-[#09321f]/90 border border-amber-500/30 px-3 py-1 rounded-full text-xs shadow">
            <span className="text-amber-400 font-bold">
              {state.commentary.speakerName}:
            </span>
            <span className="text-white font-medium">
              &quot;{state.commentary.text}&quot;
            </span>
            <span className="text-amber-300 font-urdu text-[11px]">
              ({state.commentary.urduText})
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {me?.isMaster && onOpenMaster && (
            <button
              onClick={onOpenMaster}
              className="py-1 px-2.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[11px] hover:bg-amber-500/30 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" /> Master Panel
            </button>
          )}
          <button
            onClick={() => {
              setEndGamePassword('');
              setEndGameError(null);
              setShowEndGameModal(true);
            }}
            className="py-1 px-2.5 rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-300 hover:text-white hover:bg-rose-900 transition-colors flex items-center gap-1 text-[11px] font-semibold"
            title="End match early with password authorization"
          >
            <Flag className="w-3.5 h-3.5" /> End Game
          </button>
          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="py-1 px-2.5 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-200 text-[11px] hover:bg-emerald-900 transition-colors"
            >
              Rules
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="py-1 px-2.5 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-200 text-[11px] hover:bg-emerald-900 transition-colors"
            >
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Main Card Room Table (The Oval Felt Table) */}
      <div className="relative flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center p-2 sm:p-4">
        {/* Felt Oval Background with Rich Walnut Wood Edge */}
        <div className="absolute inset-2 sm:inset-4 rounded-[40px] sm:rounded-[60px] bg-gradient-to-b from-[#0e482c] via-[#0B3B24] to-[#072416] border-[10px] sm:border-[16px] border-[#2D1810] shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_10px_30px_rgba(0,0,0,0.9)] overflow-hidden pointer-events-none">
          {/* Subtle gold inlay ring */}
          <div className="absolute inset-2 rounded-[30px] sm:rounded-[50px] border border-amber-500/20" />
          {/* Center Haveli motif watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <span className="font-serif font-black text-8xl sm:text-9xl tracking-widest text-amber-400">
              ♠
            </span>
          </div>
        </div>

        {/* TOP OPPONENTS ROW */}
        <div className="relative w-full z-10 flex justify-around items-start pt-2 px-4">
          {opponents.map((opp, idx) => {
            const isTurn = state.currentTurnPlayerId === opp.id;
            const hasEscaped = state.escapedPlayerIds.includes(opp.id);
            const isBhabhi = state.bhabhiPlayerId === opp.id;

            return (
              <div
                key={opp.id}
                className="flex flex-col items-center relative transition-transform"
              >
                {/* Speech Bubble if recent commentary */}
                {state.commentary && isTurn && (
                  <div className="absolute -top-7 whitespace-nowrap bg-amber-400 text-zinc-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce">
                    {state.commentary.text}
                  </div>
                )}

                {/* Avatar with turn ring */}
                <div
                  className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-serif font-black text-white text-base sm:text-lg shadow-lg border-2 transition-all ${
                    isTurn
                      ? 'border-amber-400 ring-4 ring-amber-400/40 bg-gradient-to-br from-amber-500 to-emerald-800 scale-105'
                      : 'border-emerald-700/80 bg-gradient-to-br from-[#0c3620] to-[#05180d]'
                  }`}
                >
                  {hasEscaped && (
                    <div className="absolute -top-2 -right-1 bg-emerald-500 text-zinc-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-white">
                      #{opp.escapedRank}
                    </div>
                  )}
                  {isBhabhi && (
                    <div className="absolute -top-3 text-amber-400 animate-bounce">
                      <Crown className="w-6 h-6 fill-amber-400" />
                    </div>
                  )}
                  {opp.username.charAt(0).toUpperCase()}
                </div>

                {/* Name & Card Count Badges */}
                <div className="mt-1 flex flex-col items-center">
                  <span className="font-bold text-[11px] sm:text-xs text-white truncate max-w-[90px] sm:max-w-[120px]">
                    {opp.username} {opp.isBot && <span className="text-[9px] text-emerald-400/70 font-mono">(AI)</span>}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold">
                      {opp.cardsCount} cards
                    </span>
                    {isTurn && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold text-[9px] animate-pulse">
                        TURN
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Mini Face-down Hand preview for opponent */}
                {!hasEscaped && (
                  <div className="flex -space-x-4 mt-1 opacity-80 scale-75 sm:scale-90">
                    {Array.from({ length: Math.min(opp.cardsCount, 5) }).map((_, cIdx) => (
                      <PlayingCard key={cIdx} isFaceDown size="sm" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CENTER TRICK ARENA */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center p-3 sm:p-5">
          {/* THULLA Shockwave Alert Banner */}
          {showThullaBanner && (
            <div className="absolute -top-8 z-30 px-6 py-2 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-zinc-950 font-serif font-black text-xl sm:text-3xl tracking-wider shadow-2xl border-2 border-amber-200 animate-thullaPop text-center">
              <div>Oye! THULLA LAG GAYA!</div>
              <div className="text-xs font-sans font-bold text-white tracking-normal mt-0.5">
                {state.lastTrickResult?.commentaryText}
              </div>
            </div>
          )}

          {/* Table Center Trick Cards */}
          <div className="min-h-[100px] sm:min-h-[130px] flex items-center justify-center">
            {state.currentTrick.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4 border border-dashed border-emerald-500/20 rounded-2xl bg-black/20">
                <span className="text-xs text-amber-300/60 font-serif">
                  {state.isMyTurn
                    ? 'Your turn to lead the trick! Play a card.'
                    : 'Waiting for trick play...'}
                </span>
                {state.trickNumber === 1 && (
                  <span className="text-[11px] text-amber-400 font-bold mt-1">
                    ♠ Ace of Spades (Hukam ka Ikka) Must Lead
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center -space-x-3 sm:-space-x-4">
                {state.currentTrick.map((played, idx) => {
                  const player = state.players.find((p) => p.id === played.playerId);
                  const isOffSuit = state.leadSuit && played.card.suit !== state.leadSuit;

                  return (
                    <div
                      key={played.card.id + idx}
                      className="flex flex-col items-center animate-slideDown"
                    >
                      <div className="relative">
                        <PlayingCard
                          card={played.card}
                          size="md"
                          className={isOffSuit ? 'ring-2 ring-rose-500 shadow-rose-950' : ''}
                        />
                        {isOffSuit && (
                          <div className="absolute -top-2 -right-2 bg-rose-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border border-white">
                            THULLA!
                          </div>
                        )}
                      </div>
                      <span className="mt-1 text-[10px] font-semibold text-white bg-black/70 px-2 py-0.5 rounded-full border border-emerald-800 truncate max-w-[80px]">
                        {player?.username}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SEAT: THE HUMAN PLAYER */}
        <div className="relative w-full z-20 flex flex-col items-center pb-2">
          {/* Player status header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2 bg-black/60 border border-amber-500/30 px-3 py-1 rounded-full">
              <span className="font-bold text-white text-xs">
                {me?.username}
              </span>
              <span className="text-amber-300 font-mono text-xs font-semibold">
                ({state.myCards.length} cards)
              </span>
              {state.isMyTurn && (
                <span className="bg-amber-400 text-zinc-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow">
                  YOUR TURN
                </span>
              )}
            </div>
            {state.isMyTurn && state.legalCardIds.length > 0 && (
              <span className="text-[11px] text-amber-300 font-medium hidden sm:inline">
                Tap highlighted card to play
              </span>
            )}
          </div>

          {/* Cards Hand Fan */}
          <div className="w-full max-w-full overflow-x-auto py-2 px-4 flex justify-center no-scrollbar">
            {state.myCards.length === 0 ? (
              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-center animate-bounce">
                <span className="text-emerald-300 font-serif font-black text-sm sm:text-base">
                  🎉 Bach Gaye! (You have escaped!)
                </span>
                <p className="text-[11px] text-emerald-200/70">
                  You successfully cleared all cards in position #{me?.escapedRank}!
                </p>
              </div>
            ) : (
              <div className="flex items-end -space-x-4 sm:-space-x-6 hover:-space-x-3 transition-all duration-200">
                {state.myCards.map((card, idx) => {
                  const isLegal = state.isMyTurn && state.legalCardIds.includes(card.id);
                  const isSelected = selectedCardId === card.id;

                  // Gentle curvature angle
                  const total = state.myCards.length;
                  const angle = (idx - (total - 1) / 2) * 2.5;

                  return (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="md"
                      isLegal={isLegal}
                      isSelected={isSelected}
                      rotation={angle}
                      onClick={() => handleCardClick(card)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Game Password Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#072416] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-400" />
                <h3 className="font-serif font-bold text-amber-300 text-lg">
                  End Game Option
                </h3>
              </div>
              <button
                onClick={() => setShowEndGameModal(false)}
                className="p-1 rounded-lg text-emerald-300/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-emerald-200/80 mb-4 leading-relaxed">
              Ending the game will stop current turns, calculate rankings based on remaining cards, and crown the official Bhabhi.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEndGameError(null);
                if (!endGamePassword) {
                  setEndGameError('Please enter the password to end the game.');
                  return;
                }
                if (endGamePassword.trim() !== 'malik123') {
                  setEndGameError('Incorrect password! (Required password: malik123)');
                  return;
                }
                socketClient.send({
                  type: 'FORCE_END_GAME',
                  password: endGamePassword.trim(),
                });
                setShowEndGameModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Enter Password (malik123):
                </label>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={endGamePassword}
                  onChange={(e) => {
                    setEndGamePassword(e.target.value);
                    setEndGameError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-sm font-mono placeholder:text-emerald-500/40"
                  autoFocus
                />
                {endGameError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40 mt-2">
                    {endGameError}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEndGameModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-950 border border-emerald-700/50 text-xs font-semibold text-emerald-200 hover:bg-emerald-900"
                >
                  Cancel & Continue Playing
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition-all"
                >
                  Confirm & End Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
