/**
 * Server persistence and audit store
 * Safely persists room metadata, match histories, player statistics, and master audit logs.
 */

import { GameRules, TrickResult } from '../engine/types';

export interface MatchSummary {
  id: string;
  roomId: string;
  roomCode: string;
  playerCount: number;
  players: {
    id: string;
    username: string;
    isBot: boolean;
    escapedRank?: number;
    finalCardCount: number;
  }[];
  bhabhiPlayer: {
    id: string;
    username: string;
  } | null;
  totalTricks: number;
  totalThullas: number;
  durationSeconds: number;
  endedAt: number;
}

export interface MasterAuditEvent {
  timestamp: number;
  action: string;
  actor: string;
  details: string;
  ip?: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  bhabhiCount: number; // Losses
  escapedFirstCount: number; // 1st place wins
  thullasGiven: number;
  thullasReceived: number;
}

class GameStorage {
  private matchSummaries: MatchSummary[] = [];
  private masterAuditLogs: MasterAuditEvent[] = [];
  private playerStats: Map<string, PlayerStats> = new Map();

  recordMatchSummary(summary: MatchSummary) {
    this.matchSummaries.unshift(summary);
    if (this.matchSummaries.length > 50) {
      this.matchSummaries.pop();
    }

    // Update player stats
    for (const p of summary.players) {
      const stats = this.playerStats.get(p.username) || {
        gamesPlayed: 0,
        bhabhiCount: 0,
        escapedFirstCount: 0,
        thullasGiven: 0,
        thullasReceived: 0,
      };

      stats.gamesPlayed += 1;
      if (summary.bhabhiPlayer?.id === p.id) {
        stats.bhabhiCount += 1;
      }
      if (p.escapedRank === 1) {
        stats.escapedFirstCount += 1;
      }
      this.playerStats.set(p.username, stats);
    }
  }

  logMasterAction(action: string, actor: string, details: string, ip?: string) {
    const entry: MasterAuditEvent = {
      timestamp: Date.now(),
      action,
      actor,
      details,
      ip: ip ? ip.replace(/^.*:/, '') : undefined,
    };
    this.masterAuditLogs.unshift(entry);
    if (this.masterAuditLogs.length > 100) {
      this.masterAuditLogs.pop();
    }
  }

  getMasterAuditLogs(): MasterAuditEvent[] {
    return [...this.masterAuditLogs];
  }

  getRecentSummaries(): MatchSummary[] {
    return [...this.matchSummaries];
  }

  getPlayerStats(username: string): PlayerStats {
    return (
      this.playerStats.get(username) || {
        gamesPlayed: 0,
        bhabhiCount: 0,
        escapedFirstCount: 0,
        thullasGiven: 0,
        thullasReceived: 0,
      }
    );
  }
}

export const gameStorage = new GameStorage();
