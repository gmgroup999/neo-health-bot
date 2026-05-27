import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { logger } from './logger';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'neo-health.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db: DatabaseType = new Database(DB_PATH);

// WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ── Schema ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    user_id         INTEGER PRIMARY KEY,
    username        TEXT    NOT NULL DEFAULT '',
    display_name    TEXT    NOT NULL DEFAULT '',
    session_started INTEGER NOT NULL,
    last_activity   INTEGER NOT NULL,
    last_nudged     INTEGER,
    paused_until    INTEGER
  );
`);

logger.info(`SQLite DB ready: ${DB_PATH}`);

// ── Helpers ──────────────────────────────────────────────────

export interface DbSession {
  user_id: number;
  username: string;
  display_name: string;
  session_started: number; // unix ms
  last_activity: number;
  last_nudged: number | null;
  paused_until: number | null;
}

const stmts = {
  upsert: db.prepare(`
    INSERT INTO sessions (user_id, username, display_name, session_started, last_activity, last_nudged, paused_until)
    VALUES (@user_id, @username, @display_name, @session_started, @last_activity, @last_nudged, @paused_until)
    ON CONFLICT(user_id) DO UPDATE SET
      username        = excluded.username,
      display_name    = excluded.display_name,
      session_started = excluded.session_started,
      last_activity   = excluded.last_activity,
      last_nudged     = excluded.last_nudged,
      paused_until    = excluded.paused_until
  `),

  get: db.prepare<[number], DbSession>('SELECT * FROM sessions WHERE user_id = ?'),

  all: db.prepare<[], DbSession>('SELECT * FROM sessions'),

  updateActivity: db.prepare(`
    UPDATE sessions SET last_activity = @last_activity, display_name = @display_name,
    username = @username, session_started = @session_started WHERE user_id = @user_id
  `),

  markNudged: db.prepare('UPDATE sessions SET last_nudged = ? WHERE user_id = ?'),

  setPaused: db.prepare('UPDATE sessions SET paused_until = ? WHERE user_id = ?'),
};

export function dbUpsertSession(s: DbSession): void {
  stmts.upsert.run(s);
}

export function dbGetSession(userId: number): DbSession | undefined {
  return stmts.get.get(userId);
}

export function dbGetAllSessions(): DbSession[] {
  return stmts.all.all();
}

export function dbMarkNudged(userId: number, time: number): void {
  stmts.markNudged.run(time, userId);
}

export function dbSetPaused(userId: number, until: number | null): void {
  stmts.setPaused.run(until, userId);
}

export function dbUpdateActivity(
  userId: number,
  username: string,
  displayName: string,
  sessionStarted: number,
  lastActivity: number
): void {
  stmts.updateActivity.run({
    user_id: userId,
    username,
    display_name: displayName,
    session_started: sessionStarted,
    last_activity: lastActivity,
  });
}
