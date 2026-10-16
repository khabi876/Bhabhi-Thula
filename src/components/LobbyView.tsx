/**
 * LobbyView Component
 * Displays 4-digit room code, scan-to-join QR code, connected players, and host controls.
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PrivatePlayerState } from '../engine/types';
import { socketClient } from '../services/socketClient';
import {
  Users,
  Copy,
  Check,
  QrCode,
  Play,
  Bot,
  Settings2,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface LobbyViewProps {
  state: PrivatePlayerState;
  onLeave: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ state, onLeave }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = me?.isHost ?? false;

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?room=${state.roomCode}`
      : `room=${state.roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#062114',
        light: '#FAF8F5',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed generating QR code:', err));
  }, [joinUrl]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(state.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    socketClient.send({ type: 'START_GAME' });
  };

  const handleToggleBotFill = () => {
    socketClient.send({ type: 'TOGGLE_BOT_FILL' });
  };

  const handleRuleChange = (field: 'threePlayerDealMode' | 'nextLeadAfterThulla', val: any) => {
    socketClient.send({
      type: 'UPDATE_RULES',
      rules: { [field]: val },
    });
  };

  const canStart = isHost && state.players.length >= 1;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-center items-center p-4 sm:p-6 animate-fadeIn">
      <div className="w-full bg-gradient-to-b from-[#09321f] via-[#062416] to-[#04170E] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Top Header with Room Code */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
          <div className="text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-300/80">
              Multiplayer Game Lobby
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-serif font-black text-3xl sm:text-4xl tracking-wider text-white">
                ROOM: <span className="text-amber-400 font-mono">{state.roomCode}</span>
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-black/40 border border-amber-500/30 text-amber-300 hover:text-white hover:bg-black/60 transition-colors"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Actions (QR & Invite) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold hover:bg-emerald-900 transition-all flex items-center gap-1.5 shadow"
            >
              <QrCode className="w-4 h-4 text-amber-400" /> Show QR Code
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Copy className="w-4 h-4" /> Copy Invite Link
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-emerald-300/80 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" /> Connected Players ({state.players.length} / {state.rules.targetPlayerCount})
            </span>
            <span>Target: {state.rules.targetPlayerCount} Players</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: state.rules.targetPlayerCount }).map((_, idx) => {
              const player = state.players[idx];
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${
                    player
                      ? 'bg-black/40 border-amber-500/40 shadow-md'
                      : 'bg-black/20 border-dashed border-emerald-900/60 text-emerald-400/40'
                  }`}
                >
                  {player ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-emerald-700 flex items-center justify-center text-white font-serif font-black text-lg border-2 border-amber-400 shadow mb-2">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white text-sm truncate max-w-full">
                        {player.username}
                      </span>
                      <div className="flex gap-1 mt-1.5">
                        {player.isHost && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold">
                            Host
                          </span>
                        )}
                        {player.id === state.myPlayerId && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                            You
                          </span>
                        )}
                        {player.isBot && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
                            AI Bot
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-4 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border border-dashed border-emerald-800/80 flex items-center justify-center text-emerald-600 mb-2">
                        <Users className="w-5 h-5 opacity-40" />
                      </div>
                      <span className="text-xs text-emerald-400/50">
                        {isHost ? 'Will fill with AI or friend' : 'Waiting for player...'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Rules Configuration (Host only / view for others) */}
        <div className="p-4 rounded-2xl bg-black/30 border border-emerald-800/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
            <Settings2 className="w-4 h-4" /> Room Rules & Settings
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* 3-Player Deal Rule */}
            {state.rules.targetPlayerCount === 3 && (
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/40 space-y-1">
                <span className="text-emerald-300/80 font-semibold block">
                  3-Player Dealing Mode:
                </span>
                {isHost ? (
                  <select
                    value={state.rules.threePlayerDealMode}
                    onChange={(e) =>
                      handleRuleChange('threePlayerDealMode', e.target.value)
                    }
                    className="w-full mt-1 p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-white text-xs"
                  >
                    <option value="EQUAL_51">
                      51 Cards (Remove 2♣ - Equal 17 each) [Standard]
                    </option>
                    <option value="EXTRA_52">
                      52 Cards (18, 17, 17 - ♠A holder gets 18)
                    </option>
                  </select>
                ) : (
                  <span className="text-white font-mono">
                    {state.rules.threePlayerDealMode === 'EQUAL_51'
                      ? '51 Cards (Remove 2♣ - Equal 17 each)'
                      : '52 Cards (18, 17, 17)'}
                  </span>
                )}
              </div>
            )}

            {/* Next Lead After Thulla */}
            <div className="p-3 rounded-xl bg-black/40 border border-emerald-900/40 space-y-1">
              <span className="text-emerald-300/80 font-semibold block">
                Next Lead After Thulla:
              </span>
              {isHost ? (
                <select
                  value={state.rules.nextLeadAfterThulla}
                  onChange={(e) =>
                    handleRuleChange('nextLeadAfterThulla', e.target.value)
                  }
                  className="w-full mt-1 p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-white text-xs"
                >
                  <option value="THULLA_PLAYER_LEADS">
                    Player who threw Thulla leads next [Traditional]
                  </option>
                  <option value="PENALTY_HOLDER_LEADS">
                    Player who collected penalty leads next
                  </option>
                </select>
              ) : (
                <span className="text-white font-mono">
                  {state.rules.nextLeadAfterThulla === 'THULLA_PLAYER_LEADS'
                    ? 'Thulla thrower leads next'
                    : 'Penalty recipient leads next'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={onLeave}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Leave Lobby
          </button>

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full sm:w-auto py-3.5 px-8 rounded-2xl font-serif font-black text-base bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-current" /> Start Game Now
            </button>
          ) : (
            <div className="text-xs text-amber-300/80 font-medium italic flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
              Waiting for host to start the match...
            </div>
          )}
        </div>
      </div>

      {/* QR Code Popup Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#072416] border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4">
            <h4 className="font-serif font-bold text-amber-300 text-lg">
              Scan QR to Join Room
            </h4>
            <p className="text-xs text-emerald-200/70">
              Point your smartphone camera to instantly join this room.
            </p>
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto">
                <img
                  src={qrDataUrl}
                  alt="Room QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            )}
            <div className="font-mono text-sm text-amber-400 font-bold">
              Room Code: {state.roomCode}
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
