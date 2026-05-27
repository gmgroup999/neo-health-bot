import { config } from './config';
import { logger } from './logger';
import {
  dbUpsertSession,
  dbGetSession,
  dbGetAllSessions,
  dbMarkNudged,
  dbSetPaused,
  dbUpdateActivity,
  type DbSession,
} from './db';

export interface UserSession {
  userId: number;
  username: string;
  displayName: string;
  sessionStarted: Date;
  lastActivity: Date;
  lastNudged: Date | null;
  pausedUntil: Date | null;
}

/** Millisecond helpers */
const MS_PER_MIN  = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;

function toSession(r: DbSession): UserSession {
  return {
    userId:        r.user_id,
    username:      r.username,
    displayName:   r.display_name,
    sessionStarted: new Date(r.session_started),
    lastActivity:   new Date(r.last_activity),
    lastNudged:     r.last_nudged ? new Date(r.last_nudged) : null,
    pausedUntil:    r.paused_until ? new Date(r.paused_until) : null,
  };
}

function displayName(firstName?: string, lastName?: string, username?: string): string {
  if (firstName) return [firstName, lastName].filter(Boolean).join(' ');
  if (username)  return `@${username}`;
  return 'คุณ';
}

/** Called whenever a user sends a message */
export function recordActivity(
  userId: number,
  firstName?: string,
  lastName?: string,
  username?: string
): void {
  const now    = Date.now();
  const name   = displayName(firstName, lastName, username);
  const uname  = username ?? String(userId);
  const existing = dbGetSession(userId);

  if (existing) {
    const inactiveMin = (now - existing.last_activity) / MS_PER_MIN;
    const sessionStarted = inactiveMin >= config.session.inactivityResetMinutes
      ? now   // reset
      : existing.session_started;

    if (inactiveMin >= config.session.inactivityResetMinutes) {
      logger.info(`Session reset for ${name} (inactive ${inactiveMin.toFixed(1)} min)`);
    }

    dbUpdateActivity(userId, uname, name, sessionStarted, now);
  } else {
    dbUpsertSession({
      user_id:         userId,
      username:        uname,
      display_name:    name,
      session_started: now,
      last_activity:   now,
      last_nudged:     null,
      paused_until:    null,
    });
    logger.info(`New session started for ${name}`);
  }
}

export function getSession(userId: number): UserSession | undefined {
  const r = dbGetSession(userId);
  return r ? toSession(r) : undefined;
}

export function getAllSessions(): UserSession[] {
  return dbGetAllSessions().map(toSession);
}

export function getSessionDurationHours(session: UserSession): number {
  return (Date.now() - session.sessionStarted.getTime()) / MS_PER_HOUR;
}

export function minutesSinceLastActivity(session: UserSession): number {
  return (Date.now() - session.lastActivity.getTime()) / MS_PER_MIN;
}

export function minutesSinceLastNudge(session: UserSession): number {
  if (!session.lastNudged) return Infinity;
  return (Date.now() - session.lastNudged.getTime()) / MS_PER_MIN;
}

export function isNudgePaused(session: UserSession): boolean {
  if (!session.pausedUntil) return false;
  return Date.now() < session.pausedUntil.getTime();
}

export function markNudged(userId: number): void {
  dbMarkNudged(userId, Date.now());
}

export function pauseNudges(userId: number, hours: number): void {
  dbSetPaused(userId, Date.now() + hours * MS_PER_HOUR);
}

export function resumeNudges(userId: number): void {
  dbSetPaused(userId, null);
}

export function getUsersDueForNudge(): UserSession[] {
  return getAllSessions().filter((session) => {
    if (isNudgePaused(session)) return false;
    if (minutesSinceLastActivity(session) >= config.session.inactivityResetMinutes) return false;
    if (getSessionDurationHours(session) < config.session.thresholdHours) return false;
    if (minutesSinceLastNudge(session) < config.session.cooldownMinutes) return false;
    return true;
  });
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} นาที`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} ชั่วโมง`;
  return `${h} ชั่วโมง ${m} นาที`;
}
