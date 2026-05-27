import { UserSession, formatDuration, getSessionDurationHours } from './tracker';

/** Nudge message templates (Thai) */
const templates = [
  (name: string, duration: string) =>
    `${name} — นั่งมา ${duration} แล้ว ลุกเดิน 5 นาทีก่อนนะครับ 🦵`,
  (name: string, _duration: string) =>
    `เบรคสมองสักครู่ครับ ${name} — ยืดคอ หมุนไหล่ แล้วค่อยกลับมา ☕️`,
  (name: string, _duration: string) =>
    `${name} นั่งนานแล้วครับ — ลุกไปจิบน้ำ + เดินสัก 2 รอบก่อนนะ 💧`,
  (name: string, _duration: string) =>
    `พัก 5 นาทีก่อนนะครับ ${name} — สมองจะทำงานได้ดีขึ้น 🧠`,
  (name: string, _duration: string) =>
    `ขอ 5 นาทีนะครับ ${name} — ยืดขา หายใจลึกๆ แล้วค่อย deploy ต่อ 😄`,
  (name: string, duration: string) =>
    `${name} ครับ — ${duration} แล้วนะ อย่าลืมลุกยืดเส้นสักหน่อย 🧘`,
  (name: string, _duration: string) =>
    `ออกไปหายใจรับอากาศบ้างนะครับ ${name} — แค่ 5 นาที สมองจะสดชื่นขึ้นเยอะเลย 🌿`,
  (name: string, duration: string) =>
    `${name} — ระบบแจ้งเตือนว่านั่งมา ${duration} แล้ว ลุกออกไปขยับขาหน่อยนะครับ 🚶`,
];

let lastTemplateIndex = -1;

/** Pick a nudge message, rotating templates to avoid repetition */
export function buildNudgeMessage(session: UserSession): string {
  const duration = formatDuration(getSessionDurationHours(session));
  const name = session.displayName;

  // Advance and wrap, never repeat back-to-back
  let idx: number;
  do {
    idx = Math.floor(Math.random() * templates.length);
  } while (idx === lastTemplateIndex && templates.length > 1);

  lastTemplateIndex = idx;
  return templates[idx](name, duration);
}

/** Status message for /status command */
export function buildStatusMessage(session: UserSession): string {
  const hours = getSessionDurationHours(session);
  const duration = formatDuration(hours);

  if (hours < 0.5) {
    return `✅ ${session.displayName} — session เพิ่งเริ่ม (${duration}) ยังโอเคอยู่ครับ`;
  }
  if (hours < 2) {
    return `⏳ ${session.displayName} — นั่งมา ${duration} แล้ว อีกนิดก็ถึงเวลาพักแล้ว!`;
  }
  return `⚠️ ${session.displayName} — นั่งมา ${duration} แล้วครับ! ถึงเวลาลุกพักได้เลย 🦵`;
}
