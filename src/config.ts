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
    thresholdHours: parseFloat(optional('SESSION_THRESHOLD_HOURS', '2')),
    cooldownMinutes: parseInt(optional('NUDGE_COOLDOWN_MINUTES', '60'), 10),
    inactivityResetMinutes: 30,
  },
  quiet: {
    start: parseInt(optional('QUIET_START', '23'), 10), // 23:00 Bangkok
    end: parseInt(optional('QUIET_END', '7'), 10),      // 07:00 Bangkok
  },
  cron: {
    checkInterval: '*/15 * * * *', // every 15 minutes
  },
} as const;
