import cron from 'node-cron';
import { config } from './config';
import { logger } from './logger';
import { bot, runScheduledNudges } from './bot';
import { startHealthServer } from './health';
import './db'; // init SQLite on startup

logger.info('═══════════════════════════════════════════');
logger.info('  NEO Health Bot — Starting');
logger.info('═══════════════════════════════════════════');
logger.info(`Session threshold : ${config.session.thresholdHours}h`);
logger.info(`Nudge cooldown    : ${config.session.cooldownMinutes}m`);
logger.info(`Quiet hours       : ${config.quiet.start}:00 – ${config.quiet.end}:00`);
logger.info(`TTS voice         : ${config.openai.ttsVoice}`);
logger.info(`Group ID          : ${config.telegram.groupId || '(DM mode)'}`);
logger.info('═══════════════════════════════════════════');

// ── Scheduled nudge check every 15 minutes ──────────────────
cron.schedule(config.cron.checkInterval, async () => {
  logger.info('⏰ Cron: nudge check…');
  try {
    await runScheduledNudges();
  } catch (err) {
    logger.error('Cron failed', err);
  }
});

logger.info(`📅 Cron scheduled: ${config.cron.checkInterval}`);

// ── Graceful shutdown ────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} — shutting down gracefully`);
  await bot.stop();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => logger.error('Uncaught exception', err));
process.on('unhandledRejection', (r)   => logger.error('Unhandled rejection', r));

// ── Start polling ────────────────────────────────────────────
startHealthServer();
logger.info('🤖 Bot is polling Telegram…');
bot.start({
  onStart: (info) => logger.info(`Logged in as @${info.username}`),
}).catch((err) => {
  logger.error('Bot crashed', err);
  process.exit(1);
});
