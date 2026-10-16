/**
 * Master Testing Modal Component
 * Privileged diagnostic & card inspection panel for authorized test accounts.
 */

import React, { useState } from 'react';
import { MasterPrivilegedState, PrivatePlayerState } from '../engine/types';
import { PlayingCard } from './PlayingCard';
import { socketClient } from '../services/socketClient';
import {
  ShieldAlert,
  X,
  Users,
  Eye,
  Activity,
  RotateCcw,
  Play,
  KeyRound,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface MasterTestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: PrivatePlayerState | null;
  masterState: MasterPrivilegedState | null;
}

export const MasterTestingModal: React.FC<MasterTestingModalProps> = ({
  isOpen,
  onClose,
  gameState,
  masterState,
}) => {
  const [activeTab, setActiveTab] = useState<
    'inspector' | 'cards' | 'state' | 'diagnostics' | 'audit'
  >('inspector');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!passcode.trim()) {
      setAuthError('Please enter the server Master passcode');
      return;
    }
    socketClient.send({
      type: 'MASTER_AUTH',
      passcode: passcode.trim(),
    });
  };

  const handleForceBotMove = () => {
    socketClient.send({
      type: 'MASTER_TRIGGER_TEST_ACTION',
      actionType: 'FORCE_BOT_MOVE',
    });
  };

  const handleResetGame = () => {
    if (confirm('Reset room to lobby state? This will clear active hands.')) {
      socketClient.send({
        type: 'MASTER_TRIGGER_TEST_ACTION',
        actionType: 'RESET_GAME',
      });
    }
  };

  const isAuthorized = !!masterState;
  const players = gameState?.players || [];
  const activePlayer =
    players.find((p) => p.id === (selectedPlayerId || gameState?.players[0]?.id)) ||
    players[0];

  const inspectedCards =
    (activePlayer && masterState?.allPlayerHands?.[activePlayer.id]) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#082315] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/20 bg-[#05170d]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-amber-300 text-base sm:text-lg tracking-wide">
                  Master Testing Panel
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  Private QA Mode
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/70">
                Reserved account identifier: <code className="text-amber-200 font-mono">K#ub@!b</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate if not authenticated */}
        {!isAuthorized ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-7 h-7" />
            </div>
            <div className="max-w-md">
              <h4 className="font-semibold text-lg text-white">
                Server Master Authorization Required
              </h4>
              <p className="text-xs text-emerald-200/70 mt-1">
                Display name matches reserved Master identity, but server privileges
                require authenticated passcode verification to prevent client impersonation.
              </p>
            </div>

            <form
              onSubmit={handleAuthSubmit}
              className="w-full max-w-sm flex flex-col gap-3 mt-2"
            >
              <input
                type="password"
                placeholder="Enter Master Access Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-sm placeholder:text-emerald-400/40 text-center font-mono"
              />
              {authError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 py-1.5 px-3 rounded border border-rose-800/40">
                  {authError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 font-semibold text-zinc-950 text-sm shadow transition-all"
                >
                  Authorize Master Session
                </button>
                <button
                  type="button"
                  onClick={() => setPasscode('bhabhi_master_secret')}
                  className="py-2 px-3 rounded-lg bg-emerald-950 border border-emerald-700/40 text-xs text-emerald-300 hover:bg-emerald-900 transition-colors"
                  title="Fill default testing passcode"
                >
                  Use QA Secret
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authorized Master Panel */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab navigation */}
            <div className="flex border-b border-amber-500/20 bg-[#061c10] px-4 text-xs font-medium">
              <button
                onClick={() => setActiveTab('inspector')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'inspector'
                    ? 'border-amber-400 text-amber-300 font-semibold bg-emerald-950/30'
                    : 'border-transparent text-emerald-300/70 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> Player Inspector
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'cards'
                    ? 'border-amber-400 text-amber-300 font-semibold bg-emerald-950/30'
                    : 'border-transparent text-emerald-300/70 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" /> Card View
              </button>
              <button
                onClick={() => setActiveTab('state')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'state'
                    ? 'border-amber-400 text-amber-300 font-semibold bg-emerald-950/30'
                    : 'border-transparent text-emerald-300/70 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" /> Game State
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'diagnostics'
                    ? 'border-amber-400 text-amber-300 font-semibold bg-emerald-950/30'
                    : 'border-transparent text-emerald-300/70 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" /> Diagnostics
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Tab 1: Player Inspector */}
              {activeTab === 'inspector' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-300/70">
                    <span>Connected players in room ({players.length})</span>
                    <span>Room Code: {gameState?.roomCode}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {players.map((p) => {
                      const isTurn = gameState?.currentTurnPlayerId === p.id;
                      const hasEscaped = gameState?.escapedPlayerIds.includes(p.id);
                      const isBhabhi = gameState?.bhabhiPlayerId === p.id;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPlayerId(p.id);
                            setActiveTab('cards');
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isTurn
                              ? 'bg-amber-500/10 border-amber-400/50 shadow-md shadow-amber-500/10'
                              : 'bg-black/30 border-emerald-800/40 hover:border-emerald-600/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {p.username}
                              </span>
                              {p.isHost && (
                                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 rounded">
                                  Host
                                </span>
                              )}
                              {p.isBot && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 rounded">
                                  AI Bot
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                p.connectionStatus === 'CONNECTED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {p.connectionStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-emerald-200/80">
                            <div>
                              <span className="text-emerald-400/50 block text-[9px] uppercase">
                                Cards Left
                              </span>
                              <span className="font-bold text-white text-sm">
                                {p.cardsCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-emerald-400/50 block text-[9px] uppercase">
                                Turn Status
                              </span>
                              <span
                                className={
                                  isTurn
                                    ? 'text-amber-400 font-bold'
                                    : 'text-zinc-400'
                                }
                              >
                                {isTurn ? 'ACTIVE' : 'WAITING'}
                              </span>
                            </div>
                            <div>
                              <span className="text-emerald-400/50 block text-[9px] uppercase">
                                Escape Status
                              </span>
                              <span
                                className={
                                  hasEscaped
                                    ? 'text-emerald-400 font-bold'
                                    : isBhabhi
                                    ? 'text-rose-400 font-bold'
                                    : 'text-zinc-400'
                                }
                              >
                                {hasEscaped
                                  ? `Rank #${p.escapedRank}`
                                  : isBhabhi
                                  ? 'BHABHI'
                                  : 'IN PLAY'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-emerald-900/40 flex items-center justify-between text-[10px] text-emerald-400/70 font-mono">
                            <span>ID: {p.id.slice(0, 10)}...</span>
                            <span className="text-amber-400 underline">
                              Inspect Hand →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Card View */}
              {activeTab === 'cards' && (
                <div className="space-y-4">
                  {/* Player Selector Bar */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlayerId(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                          (selectedPlayerId || players[0]?.id) === p.id
                            ? 'bg-amber-500 text-zinc-950 shadow'
                            : 'bg-emerald-950 border border-emerald-700/50 text-emerald-200 hover:bg-emerald-900'
                        }`}
                      >
                        {p.username} ({masterState.allPlayerHands?.[p.id]?.length || 0} cards)
                      </button>
                    ))}
                  </div>

                  {activePlayer && (
                    <div className="bg-black/30 border border-emerald-800/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            Hand of: {activePlayer.username}
                          </h4>
                          <p className="text-[11px] text-emerald-300/70 font-mono">
                            Total cards: {inspectedCards.length} · Seat #{activePlayer.seatIndex}
                          </p>
                        </div>
                      </div>

                      {inspectedCards.length === 0 ? (
                        <div className="py-8 text-center text-emerald-300/50 text-xs">
                          {gameState?.escapedPlayerIds.includes(activePlayer.id)
                            ? 'Player has escaped! All cards cleared.'
                            : 'No cards currently in hand.'}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {inspectedCards.map((c) => (
                            <PlayingCard
                              key={c.id}
                              card={c}
                              size="sm"
                              className="shadow"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Game State Inspector */}
              {activeTab === 'state' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Room Status
                      </span>
                      <span className="text-white font-bold">{gameState?.status}</span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Trick Number
                      </span>
                      <span className="text-white font-bold">{gameState?.trickNumber}</span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Lead Suit
                      </span>
                      <span className="text-amber-400 font-bold">
                        {gameState?.leadSuit || 'None (Leading)'}
                      </span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        State Version
                      </span>
                      <span className="text-white font-bold">
                        v{gameState?.stateVersion}
                      </span>
                    </div>
                  </div>

                  {/* Actions for authorized QA */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                    <span className="text-amber-300 font-bold text-xs">
                      QA Test Interventions (Server Authoritative)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={handleForceBotMove}
                        className="py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" /> Force Active Bot Move
                      </button>
                      <button
                        onClick={() => {
                          const pw = prompt('Enter password to force end game (malik123):');
                          if (pw) {
                            socketClient.send({
                              type: 'FORCE_END_GAME',
                              password: pw,
                            });
                          }
                        }}
                        className="py-1.5 px-3 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> End Game (malik123)
                      </button>
                      <button
                        onClick={handleResetGame}
                        className="py-1.5 px-3 rounded bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Game to Lobby
                      </button>
                    </div>
                  </div>

                  {/* Recent Game Activity Log */}
                  <div className="bg-black/40 p-3 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400/60 uppercase block mb-1">
                      Recent Server Logs
                    </span>
                    <div className="space-y-1 text-[11px] text-emerald-200/80">
                      {gameState?.recentLogs.map((log, i) => (
                        <div key={i}>• {log}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Diagnostics & Audit Log */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Deck In Play
                      </span>
                      <span className="text-white font-bold">
                        {masterState.diagnostics.cardsInPlay} / {masterState.diagnostics.totalDeckCount}
                      </span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Waste Pile
                      </span>
                      <span className="text-white font-bold">
                        {masterState.diagnostics.cardsInWaste}
                      </span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Sockets Connected
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {masterState.diagnostics.connectedSockets}
                      </span>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400/50 uppercase block">
                        Room Uptime
                      </span>
                      <span className="text-white font-bold">
                        {Math.round(masterState.diagnostics.roomMemoryUptimeMs / 1000)}s
                      </span>
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-emerald-900/40 space-y-2">
                    <span className="text-[11px] font-bold text-amber-300 block">
                      Server Security & Audit Trail
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
                      {masterState.serverAuditLogs.map((entry, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-amber-400 font-semibold">
                              [{entry.action}]
                            </span>{' '}
                            <span className="text-white">{entry.details}</span>
                          </div>
                          <span className="text-emerald-400/50 text-[10px]">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
