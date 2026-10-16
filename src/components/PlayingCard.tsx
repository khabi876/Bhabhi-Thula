/**
 * PlayingCard Component
 * High-fidelity playing card rendering with suit icons, court art, and responsive fanning.
 */

import React from 'react';
import { Card, Suit } from '../engine/types';

interface PlayingCardProps {
  card?: Card;
  isFaceDown?: boolean;
  isLegal?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  rotation?: number;
  offsetY?: number;
}

const SUIT_ICONS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

const SUIT_COLORS: Record<Suit, { text: string; bg: string }> = {
  SPADES: { text: 'text-zinc-900', bg: 'bg-zinc-100' },
  HEARTS: { text: 'text-rose-600', bg: 'bg-rose-50' },
  DIAMONDS: { text: 'text-red-600', bg: 'bg-red-50' },
  CLUBS: { text: 'text-emerald-950', bg: 'bg-emerald-50' },
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isFaceDown = false,
  isLegal = false,
  isSelected = false,
  onClick,
  className = '',
  size = 'md',
  rotation = 0,
  offsetY = 0,
}) => {
  const sizeClasses = {
    sm: 'w-11 h-16 text-[10px]',
    md: 'w-14 h-20 sm:w-16 sm:h-24 text-xs sm:text-sm',
    lg: 'w-20 h-28 sm:w-24 sm:h-36 text-base sm:text-lg',
  }[size];

  if (isFaceDown || !card) {
    return (
      <div
        onClick={onClick}
        style={{
          transform: `rotate(${rotation}deg) translateY(${offsetY}px)`,
        }}
        className={`relative ${sizeClasses} rounded-lg select-none flex-shrink-0 transition-transform duration-200 border border-amber-600/40 bg-gradient-to-br from-[#0B3B24] via-[#082A1A] to-[#04170E] shadow-md shadow-black/60 flex items-center justify-center overflow-hidden p-1 ${className}`}
      >
        {/* Intricate Card Back Pattern */}
        <div className="w-full h-full border border-amber-500/30 rounded flex items-center justify-center relative bg-[#09321f]">
          <div className="absolute inset-1 border border-amber-400/20 rounded-sm opacity-60 pointer-events-none" />
          <div className="text-amber-400/50 font-serif font-black text-xs sm:text-sm tracking-widest text-center rotate-45 select-none">
            ♠ ♦ ♣ ♥
          </div>
        </div>
      </div>
    );
  }

  const { text: textColor } = SUIT_COLORS[card.suit];
  const suitIcon = SUIT_ICONS[card.suit];
  const isCourt = ['J', 'Q', 'K', 'A'].includes(card.rank);

  return (
    <div
      onClick={isLegal && onClick ? onClick : undefined}
      style={{
        transform: `rotate(${rotation}deg) translateY(${isSelected ? offsetY - 16 : offsetY}px)`,
      }}
      className={`relative ${sizeClasses} rounded-lg select-none flex-shrink-0 transition-all duration-150 font-sans shadow-md shadow-black/50 border overflow-hidden bg-[#FAF8F5] ${textColor} ${
        isLegal
          ? 'cursor-pointer hover:-translate-y-4 hover:shadow-xl hover:shadow-amber-500/20 hover:border-amber-400 ring-1 ring-amber-400/40'
          : onClick
          ? 'opacity-65 cursor-not-allowed border-zinc-300'
          : 'border-zinc-300'
      } ${isSelected ? 'ring-2 ring-amber-400 -translate-y-4' : ''} ${className}`}
    >
      {/* Top Left Index */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className="font-extrabold font-mono tracking-tighter text-[11px] sm:text-xs">
          {card.rank}
        </span>
        <span className="text-[10px] sm:text-xs leading-none">{suitIcon}</span>
      </div>

      {/* Center Art / Pip Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isCourt ? (
          <div className="flex flex-col items-center opacity-90">
            <span className="text-xl sm:text-2xl font-serif font-black">
              {suitIcon}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-0.5">
              {card.rank === 'A'
                ? 'ACE'
                : card.rank === 'K'
                ? 'KING'
                : card.rank === 'Q'
                ? 'QUEEN'
                : 'JACK'}
            </span>
          </div>
        ) : (
          <span className="text-2xl sm:text-3xl opacity-85">{suitIcon}</span>
        )}
      </div>

      {/* Bottom Right Inverted Index */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className="font-extrabold font-mono tracking-tighter text-[11px] sm:text-xs">
          {card.rank}
        </span>
        <span className="text-[10px] sm:text-xs leading-none">{suitIcon}</span>
      </div>

      {/* Legal glow indicator */}
      {isLegal && (
        <div className="absolute top-0 inset-x-0 h-1 bg-amber-400/80 rounded-t" />
      )}
    </div>
  );
};
