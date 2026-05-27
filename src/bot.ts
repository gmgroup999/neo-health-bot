import { Bot, InputFile } from 'grammy';
import fs from 'fs';
import { config } from './config';
import { logger } from './logger';
import {
  recordActivity,
  getSession,
  getUsersDueForNudge,
  markNudged,
  pauseNudges,
  resumeNudges,
  getSessionDurationHours,
  formatDuration,
  isNudgePaused,
} from './tracker';
import { buildNudgeMessage, buildStatusMessage } from './nudge';
import { textToSpeech, cleanupTTS } from './tts';

// ────────────────────────────────────────────────────────────
//  Bot instance (grammy)
// ────────────────────────────────────────────────────────────

export const bot = new Bot(config.telegram.botToken);

logger.info('NEO Health Bot starting up…');

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

function isQuietHours(): boolean {
  // Server runs UTC — use Bangkok timezone (UTC+7) for quiet-hour logic
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10
  );
  const { start, end } = config.quiet;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

async function sendNudge(chatId: number | string, text: string): Promise<void> {
  await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });

  let ttsFile: string | null = null;
  try {
    ttsFile = await textToSpeech(text);
    await bot.api.sendVoice(chatId, new InputFile(fs.createReadStream(ttsFile), 'nudge.ogg'));
    logger.info(`Nudge sent to chat ${chatId}`);
  } catch (err) {
    logger.error('TTS/voice send failed', err);
  } finally {
    if (ttsFile) cleanupTTS(ttsFile);
  }
}

// ────────────────────────────────────────────────────────────
//  Activity tracking — all group messages
// ────────────────────────────────────────────────────────────

bot.on('message', (ctx) => {
  const from = ctx.from;
  if (!from || from.is_bot) return;
  recordActivity(from.id, from.first_name, from.last_name, from.username);
});

// ────────────────────────────────────────────────────────────
//  Commands
// ────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 <b>NEO Health Bot พร้อมใช้งานแล้วครับ!</b>\n\n` +
      `🔔 แจ้งเตือนทุก 15 นาที เมื่อนั่งต่อเนื่อง <b>${config.session.thresholdHours} ชั่วโมง</b>\n` +
      `🔇 Quiet Hours: <b>${config.quiet.start}:00 – ${config.quiet.end}:00</b>\n\n` +
      `📋 <b>คำสั่ง:</b>\n` +
      `/status — ดู session ปัจจุบัน\n` +
      `/pause — หยุดแจ้งเตือน 2 ชั่วโมง\n` +
      `/resume — เปิดแจ้งเตือนอีกครั้ง\n` +
      `/test — ทดสอบส่ง nudge ทันที`,
    { parse_mode: 'HTML' }
  );
});

bot.command('status', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const session = getSession(from.id);
  if (!session) {
    await ctx.reply('❌ ยังไม่มีข้อมูล session — ส่งข้อความใดก็ได้เพื่อเริ่ม');
    return;
  }

  let text = buildStatusMessage(session);
  if (isNudgePaused(session) && session.pausedUntil) {
    const remainMin = Math.ceil((session.pausedUntil.getTime() - Date.now()) / 60000);
    text += `\n\n⏸ Nudge หยุดอยู่อีก <b>${remainMin} นาที</b>`;
  }
  if (isQuietHours()) text += `\n🌙 Quiet Hours — ไม่แจ้งเตือนขณะนี้`;

  await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('pause', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  pauseNudges(from.id, 2);
  await ctx.reply(
    `⏸ หยุดแจ้งเตือน <b>2 ชั่วโมง</b>\nพิมพ์ /resume เพื่อเปิดก่อนเวลาได้เลย`,
    { parse_mode: 'HTML' }
  );
  logger.info(`Nudges paused for ${from.first_name}`);
});

bot.command('resume', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  resumeNudges(from.id);
  await ctx.reply('✅ เปิดแจ้งเตือนอีกครั้งแล้วครับ! 💪');
  logger.info(`Nudges resumed for ${from.first_name}`);
});

bot.command('test', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  recordActivity(from.id, from.first_name, from.last_name, from.username);
  const session = getSession(from.id)!;
  const text = buildNudgeMessage(session);

  await ctx.reply(`🧪 <b>Test Nudge:</b>\n${text}`, { parse_mode: 'HTML' });

  let ttsFile: string | null = null;
  try {
    ttsFile = await textToSpeech(text);
    await ctx.replyWithVoice(new InputFile(fs.createReadStream(ttsFile), 'nudge.ogg'));
  } catch (err) {
    logger.error('Test TTS failed', err);
    await ctx.reply('⚠️ Voice ส่งไม่ได้ (ตรวจสอบ OPENAI_API_KEY)');
  } finally {
    if (ttsFile) cleanupTTS(ttsFile);
  }
});

// ────────────────────────────────────────────────────────────
//  Scheduled nudge runner (called by cron)
// ────────────────────────────────────────────────────────────

export async function runScheduledNudges(): Promise<void> {
  if (isQuietHours()) {
    logger.info('Quiet hours — skip nudge check');
    return;
  }

  const due = getUsersDueForNudge();
  if (due.length === 0) {
    logger.info('Nudge check: no users due');
    return;
  }

  logger.info(`Nudge check: ${due.length} user(s) due`);
  const chatId = config.telegram.groupId;

  for (const session of due) {
    const text = buildNudgeMessage(session);
    const target = chatId || String(session.userId);
    try {
      await sendNudge(target, text);
      markNudged(session.userId);
      logger.info(`✅ Nudge → ${session.displayName} (${formatDuration(getSessionDurationHours(session))})`);
    } catch (err) {
      logger.error(`Nudge failed for ${session.displayName}`, err);
    }
  }
}
