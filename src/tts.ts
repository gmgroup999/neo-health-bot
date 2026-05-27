import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import { config } from './config';
import { logger } from './logger';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Convert text to a .ogg voice file using OpenAI TTS.
 * Returns the temp file path — caller is responsible for cleanup.
 */
export async function textToSpeech(text: string): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `neo-health-${Date.now()}.ogg`);

  logger.info('Requesting TTS from OpenAI…', { chars: text.length, voice: config.openai.ttsVoice });

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: config.openai.ttsVoice,
    input: text,
    response_format: 'opus', // produces .ogg/opus — ideal for Telegram voice messages
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpFile, buffer);

  logger.info(`TTS saved to ${tmpFile} (${buffer.length} bytes)`);
  return tmpFile;
}

/** Delete a temp TTS file after sending */
export function cleanupTTS(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logger.warn(`Failed to clean up TTS file: ${filePath}`, err);
  }
}
