/**
 * MatchSummaryModal Component
 * Celebratory endgame podium displaying rankings, Bhabhi crown, Thulla counts, and rematch CTA.
 */

import React from 'react';
import { Player } from '../engine/types';
import { Crown, Trophy, RotateCcw, Home, Sparkles } from 'lucide-react';

interface MatchSummaryModalProps {
  isOpen: boolean;
  players: Player[];
  bhabhiPlayerId: string | null;
  escapedPlayerIds: string[];
  totalTricks: number;
  onRematch: () => void;
  onReturnHome: () => void;
}

export const MatchSummaryModal: React.FC<MatchSummaryModalProps> = ({
  isOpen,
  players,
  bhabhiPlayerId,
  escapedPlayerIds,
  totalTricks,
  onRematch,
  onReturnHome,
}) => {
  if (!isOpen) return null;

  const bhabhiPlayer = players.find((p) => p.id === bhabhiPlayerId);
  const escapedPlayers = escapedPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0B3B24] via-[#072416] to-[#04150D] border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
        {/* Top Glow & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Match Concluded
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-amber-400 tracking-wide drop-shadow">
          Khel Khatam! (Game Over)
        </h2>
        <p className="text-xs text-emerald-200/70 mt-1 mb-6">
          Total Tricks Resolved: {totalTricks}
        </p>

        {/* The BHABHI Spotlight */}
        {bhabhiPlayer && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-red-900/40 to-rose-950/60 border border-rose-500/40 shadow-inner flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-950 mb-2 border-2 border-amber-300">
              <Crown className="w-8 h-8 text-white animate-bounce" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-300">
              The Official Bhabhi
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {bhabhiPlayer.username}
            </span>
            <p className="text-xs text-rose-200/80 font-urdu mt-1">
              ہائے! {bhabhiPlayer.username} بن گیا بھابھی!
            </p>
          </div>
        )}

        {/* Escape Order (Winners Podium) */}
        <div className="space-y-2 mb-6 text-left">
          <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider block">
            Escaped Players (Bach Gaye):
          </span>
          <div className="space-y-1.5">
            {escapedPlayers.map((player, index) => {
              const rank = index + 1;
              const medalColor =
                rank === 1
                  ? 'bg-amber-400 text-zinc-950 border-amber-300'
                  : rank === 2
                  ? 'bg-slate-300 text-zinc-900 border-slate-200'
                  : 'bg-amber-700 text-white border-amber-600';

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-emerald-800/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${medalColor}`}
                    >
                      {rank}
                    </span>
                    <span className="font-semibold text-white text-sm">
                      {player.username}
                    </span>
                    {player.isBot && (
                      <span className="text-[10px] text-emerald-400/60 font-mono">
                        (AI)
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-emerald-400 font-mono">
                    Escaped #{rank}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRematch}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Play Rematch
          </button>
          <button
            onClick={onReturnHome}
            className="py-3 px-5 rounded-xl font-semibold text-sm bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-900 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
