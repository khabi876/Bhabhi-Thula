/**
 * Bhabhi Thulla - Pakistani Multiplayer Card Game
 * Main Application Component
 */

import React, { useEffect, useState } from 'react';
import { socketClient } from './services/socketClient';
import { MasterPrivilegedState, PrivatePlayerState } from './engine/types';
import { MainMenu } from './components/MainMenu';
import { LobbyView } from './components/LobbyView';
import { GameTable } from './components/GameTable';
import { MasterTestingModal } from './components/MasterTestingModal';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { SettingsModal } from './components/SettingsModal';
import { LegalModal } from './components/LegalModal';

export default function App() {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('bhabhi_username') || '';
  });
  const [gameState, setGameState] = useState<PrivatePlayerState | null>(null);
  const [masterState, setMasterState] = useState<MasterPrivilegedState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  // Initial room code from URL query parameter (e.g. ?room=4829)
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setInitialRoomCode(roomParam.toUpperCase());
      }
    }
  }, []);

  const handleUpdateUsername = (name: string) => {
    setUsername(name);
    localStorage.setItem('bhabhi_username', name);
  };

  // Socket connection & event subscriptions
  useEffect(() => {
    socketClient.connect();

    const unsubConn = socketClient.subscribeConnection((connected) => {
      setIsConnected(connected);
    });

    const unsubState = socketClient.subscribeState((state) => {
      setGameState(state);
      setErrorMessage(null);
    });

    const unsubMaster = socketClient.subscribeMaster((mState) => {
      setMasterState(mState);
    });

    const unsubErr = socketClient.subscribeError((code, message) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    return () => {
      unsubConn();
      unsubState();
      unsubMaster();
      unsubErr();
    };
  }, []);

  // Quick Play vs AI: create room & automatically start
  const handleQuickPlayVsAI = async (chosenName: string) => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: chosenName,
          targetPlayerCount: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize AI match');

      sessionStorage.setItem(
        'bhabhi_session',
        JSON.stringify({
          playerId: data.playerId,
          sessionToken: data.sessionToken,
          roomId: data.roomId,
          roomCode: data.roomCode,
        })
      );

      socketClient.send({
        type: 'JOIN_ROOM',
        roomCode: data.roomCode,
        username: chosenName,
        sessionToken: data.sessionToken,
      });

      // Auto start game with 3 AI bots (Bilal, Tariq, Zainab)
      setTimeout(() => {
        socketClient.send({ type: 'START_GAME' });
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error starting Quick Play');
    }
  };

  // Host Game
  const handleHostGame = async (chosenName: string, targetPlayers: 3 | 4) => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: chosenName,
          targetPlayerCount: targetPlayers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      sessionStorage.setItem(
        'bhabhi_session',
        JSON.stringify({
          playerId: data.playerId,
          sessionToken: data.sessionToken,
          roomId: data.roomId,
          roomCode: data.roomCode,
        })
      );

      socketClient.send({
        type: 'JOIN_ROOM',
        roomCode: data.roomCode,
        username: chosenName,
        sessionToken: data.sessionToken,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error hosting room');
    }
  };

  // Join Game
  const handleJoinGame = async (chosenName: string, code: string) => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: chosenName,
          roomCode: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');

      sessionStorage.setItem(
        'bhabhi_session',
        JSON.stringify({
          playerId: data.playerId,
          sessionToken: data.sessionToken,
          roomId: data.roomId,
          roomCode: data.roomCode,
        })
      );

      socketClient.send({
        type: 'JOIN_ROOM',
        roomCode: data.roomCode,
        username: chosenName,
        sessionToken: data.sessionToken,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error joining room');
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    socketClient.send({ type: 'LEAVE_ROOM' });
    sessionStorage.removeItem('bhabhi_session');
    setGameState(null);
    setMasterState(null);
  };

  // Rematch
  const handleRematch = () => {
    socketClient.send({ type: 'RESTART_REMATCH' });
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#062114] text-[#F8FAFC] overflow-hidden select-none">
      {/* Toast Error Notification */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-semibold shadow-2xl backdrop-blur-sm animate-bounce flex items-center gap-2">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* View routing based on active game state */}
      {!gameState ? (
        <MainMenu
          isConnected={isConnected}
          username={username}
          onChangeUsername={handleUpdateUsername}
          onQuickPlayVsAI={handleQuickPlayVsAI}
          onHostGame={handleHostGame}
          onJoinGame={handleJoinGame}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLegal={(type) => setLegalModalType(type)}
          initialRoomCode={initialRoomCode}
        />
      ) : gameState.status === 'LOBBY' ? (
        <LobbyView state={gameState} onLeave={handleLeaveRoom} />
      ) : (
        <GameTable
          state={gameState}
          onOpenMaster={() => setIsMasterOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      )}

      {/* Match Summary Modal (Endgame Podium & Bhabhi Crown) */}
      {gameState && gameState.status === 'GAME_OVER' && (
        <MatchSummaryModal
          isOpen={true}
          players={gameState.players}
          bhabhiPlayerId={gameState.bhabhiPlayerId}
          escapedPlayerIds={gameState.escapedPlayerIds}
          totalTricks={gameState.trickNumber}
          onRematch={handleRematch}
          onReturnHome={handleLeaveRoom}
        />
      )}

      {/* Master Testing Modal */}
      <MasterTestingModal
        isOpen={isMasterOpen}
        onClose={() => setIsMasterOpen(false)}
        gameState={gameState}
        masterState={masterState}
      />

      {/* Rules Guide Modal */}
      <HowToPlayModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenLegal={(type) => {
          setIsSettingsOpen(false);
          setLegalModalType(type);
        }}
      />

      {/* Legal Modal (Privacy & Terms) */}
      {legalModalType && (
        <LegalModal
          isOpen={true}
          type={legalModalType}
          onClose={() => setLegalModalType(null)}
        />
      )}
    </div>
  );
}
