/**
 * MainMenu Component
 * Atmospheric start screen, username input, Quick Play vs AI, Host Room, and Join Room flows.
 */

import React, { useState } from 'react';
import {
  Play,
  Users,
  PlusCircle,
  LogIn,
  BookOpen,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface MainMenuProps {
  isConnected: boolean;
  username: string;
  onChangeUsername: (name: string) => void;
  onQuickPlayVsAI: (username: string) => void;
  onHostGame: (username: string, targetPlayers: 3 | 4) => void;
  onJoinGame: (username: string, code: string) => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
  initialRoomCode?: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  isConnected,
  username,
  onChangeUsername,
  onQuickPlayVsAI,
  onHostGame,
  onJoinGame,
  onOpenRules,
  onOpenSettings,
  onOpenLegal,
  initialRoomCode = '',
}) => {
  const [viewMode, setViewMode] = useState<'main' | 'host' | 'join'>('main');
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [targetPlayers, setTargetPlayers] = useState<3 | 4>(4);
  const [validationError, setValidationError] = useState<string | null>(null);

  const cleanUsername = username.trim();

  const validateUsername = (): boolean => {
    if (!cleanUsername) {
      setValidationError('Please enter a username before continuing.');
      return false;
    }
    if (cleanUsername.length > 20) {
      setValidationError('Username must be 20 characters or fewer.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleQuickPlay = () => {
    if (!validateUsername()) return;
    onQuickPlayVsAI(cleanUsername);
  };

  const handleHost = () => {
    if (!validateUsername()) return;
    onHostGame(cleanUsername, targetPlayers);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUsername()) return;
    if (!roomCodeInput.trim() || roomCodeInput.trim().length < 4) {
      setValidationError('Please enter a valid 4-digit room code.');
      return;
    }
    onJoinGame(cleanUsername, roomCodeInput.trim());
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-between items-center p-4 sm:p-6 text-slate-100 overflow-y-auto">
      {/* Top Status Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 text-xs">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multiplayer Server Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/60 border border-rose-700/50 px-2.5 py-1 rounded-full">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Connecting to Server...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRules}
            className="p-1.5 sm:px-3 sm:py-1 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-200 hover:bg-emerald-900 transition-colors flex items-center gap-1 text-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rules Guide</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:px-3 sm:py-1 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-200 hover:bg-emerald-900 transition-colors flex items-center gap-1 text-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Hero Center Section */}
      <div className="my-auto w-full max-w-lg flex flex-col items-center text-center space-y-6 py-4">
        {/* Title Lockup */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-widest mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Traditional Pakistani Card Game
          </div>
          <h1 className="font-serif font-black text-4xl sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-wider drop-shadow-lg">
            BHABHI THULLA
          </h1>
          <p className="text-sm sm:text-base text-emerald-200/90 font-medium">
            بچ جانا &bull; Also known as <span className="text-amber-300 font-semibold">Get Away</span>
          </p>
        </div>

        {/* Username Input Box */}
        <div className="w-full bg-gradient-to-b from-[#0B3B24] to-[#072416] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              Enter Your Name (کھلاڑی کا نام)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter username (e.g. Asad, Zoya)"
                value={username}
                onChange={(e) => {
                  onChangeUsername(e.target.value);
                  setValidationError(null);
                }}
                maxLength={20}
                className="w-full py-3 px-4 rounded-xl bg-black/40 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-sm font-semibold placeholder:text-emerald-400/40"
              />
              {cleanUsername === 'K#ub@!b' && (
                <span className="absolute right-3 top-3 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Master ID
                </span>
              )}
            </div>
            {validationError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {validationError}
              </p>
            )}
          </div>

          {/* VIEW: MAIN BUTTONS */}
          {viewMode === 'main' && (
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleQuickPlay}
                className="w-full py-3.5 px-6 rounded-2xl font-serif font-black text-base bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> Quick Play vs AI Opponents
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setViewMode('host')}
                  className="py-3 px-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 hover:border-amber-400/60 text-emerald-100 font-bold text-xs sm:text-sm hover:bg-emerald-900 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <PlusCircle className="w-4 h-4 text-amber-400" /> Host Game
                </button>
                <button
                  onClick={() => setViewMode('join')}
                  className="py-3 px-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 hover:border-amber-400/60 text-emerald-100 font-bold text-xs sm:text-sm hover:bg-emerald-900 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <LogIn className="w-4 h-4 text-amber-400" /> Join Room
                </button>
              </div>
            </div>
          )}

          {/* VIEW: HOST OPTIONS */}
          {viewMode === 'host' && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="text-left space-y-1.5">
                <span className="text-xs text-emerald-300/80 font-semibold block">
                  Select Match Player Count:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetPlayers(4)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPlayers === 4
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                        : 'bg-emerald-950 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    4 Players (13 cards each)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPlayers(3)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPlayers === 3
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                        : 'bg-emerald-950 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    3 Players (17 cards each)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('main')}
                  className="py-2.5 px-4 rounded-xl bg-black/40 border border-emerald-800 text-xs font-semibold text-emerald-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleHost}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow"
                >
                  Create Room & Get 4-Digit Code
                </button>
              </div>
            </div>
          )}

          {/* VIEW: JOIN ROOM FORM */}
          {viewMode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4 pt-1 animate-fadeIn">
              <div className="text-left space-y-1.5">
                <label className="text-xs text-emerald-300/80 font-semibold block">
                  Enter 4-Digit Room Code:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4829"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full py-2.5 px-4 rounded-xl bg-black/40 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-center font-mono text-lg font-bold tracking-widest placeholder:text-emerald-500/40"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('main')}
                  className="py-2.5 px-4 rounded-xl bg-black/40 border border-emerald-800 text-xs font-semibold text-emerald-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow"
                >
                  Join Room Now
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer & Compliance */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 py-2 text-[11px] text-emerald-400/60 border-t border-emerald-950">
        <span>&copy; 2026 Bhabhi Thulla Multiplayer &bull; Traditional Pakistani Card Game</span>
        <div className="flex gap-3">
          <button
            onClick={() => onOpenLegal('privacy')}
            className="hover:text-amber-300 underline"
          >
            Privacy Policy
          </button>
          <span>&bull;</span>
          <button
            onClick={() => onOpenLegal('terms')}
            className="hover:text-amber-300 underline"
          >
            Terms & Conditions
          </button>
        </div>
      </div>
    </div>
  );
};
