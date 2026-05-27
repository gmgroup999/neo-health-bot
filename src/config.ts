import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  telegram: {
    botToken: required('TELEGRAM_BOT_TOKEN'),
    groupId: optional('TELEGRAM_GROUP_ID', ''),
  },
  openai: {
    apiKey: required('OPENAI_API_KEY'),
    ttsVoice: optional('TTS_VOICE', 'alloy') as
      | 'alloy'
      | 'echo'
      | 'fable'
      | 'onyx'
      | 'nova'
      | 'shimmer',
  },
  session: {
    thresholdHours: 0.01,  // TEST MODE: ~36s (ปกติ: SESSION_THRESHOLD_HOURS=2)
    cooldownMinutes: 0,    // TEST MODE: no cooldown (ปกติ: NUDGE_COOLDOWN_MINUTES=60)
    inactivityResetMinutes: 30,
  },
  quiet: {
    start: parseInt(optional('QUIET_START', '23'), 10),
    end: parseInt(optional('QUIET_END', '7'), 10),
  },
  cron: {
    checkInterval: '* * * * *', // TEST MODE: every 1 min (ปกติ: */15)
  },
} as const;
