# NEO Health Bot 🤖

Telegram bot ที่คอยเตือนให้ลุกยืดเส้นสายและพักสายตา ส่งข้อความพร้อม voice message ภาษาไทย

## Features

| Feature | Details |
|---------|---------|
| **Session Tracking** | จับเวลาทุกครั้งที่ user ส่งข้อความ |
| **Smart Nudge** | แจ้งเตือนเมื่อนั่งทำงานต่อเนื่อง ≥ 2 ชั่วโมง |
| **TTS Voice** | ส่ง voice message ด้วย OpenAI TTS (alloy/nova) |
| **Quiet Hours** | ไม่แจ้งเตือนช่วง 23:00 – 07:00 |
| **Cooldown** | รอ 60 นาทีก่อนส่งอีกครั้ง |
| **Inactivity Reset** | Reset session ถ้าไม่มีกิจกรรม 30+ นาที |

## Quick Start

### 1. สร้างไฟล์ `.env`

```bash
cp .env.example .env
```

แก้ไขค่าเหล่านี้:

```env
TELEGRAM_BOT_TOKEN=<จาก BotFather>
TELEGRAM_GROUP_ID=<chat id ของกลุ่ม>
OPENAI_API_KEY=<OpenAI API key>
```

> **วิธีหา Group ID:** เพิ่ม `@userinfobot` เข้ากลุ่ม แล้ว `/start` — มันจะบอก Chat ID
> Group ID จะเป็นตัวเลขติดลบ เช่น `-1001234567890`

### 2. รันด้วย Docker

```bash
# Build และรัน
docker-compose up -d

# ดู logs
docker-compose logs -f neo-health-bot
```

### 3. รันแบบ Local Development

```bash
npm install
npm run dev
```

## Commands

| Command | ทำอะไร |
|---------|--------|
| `/start` | แนะนำบอทและแสดง status |
| `/status` | ดูระยะเวลา session ปัจจุบัน |
| `/pause` | หยุดแจ้งเตือน 2 ชั่วโมง |
| `/resume` | เปิดแจ้งเตือนอีกครั้ง |
| `/test` | ทดสอบส่ง nudge + voice ทันที |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | — | **Required.** จาก BotFather |
| `TELEGRAM_GROUP_ID` | — | Chat ID ของกลุ่ม (ถ้าไม่ใส่ จะ DM ไปหา user) |
| `OPENAI_API_KEY` | — | **Required.** สำหรับ TTS |
| `TTS_VOICE` | `alloy` | เสียง: `alloy`, `nova`, `echo`, `fable`, `onyx`, `shimmer` |
| `SESSION_THRESHOLD_HOURS` | `2` | นั่งกี่ชั่วโมงถึงจะแจ้งเตือน |
| `NUDGE_COOLDOWN_MINUTES` | `60` | Cooldown ระหว่าง nudge (นาที) |
| `QUIET_START` | `23` | เริ่ม quiet hours (ชั่วโมง) |
| `QUIET_END` | `7` | สิ้นสุด quiet hours (ชั่วโมง) |

## Deploy บน Z Node

```bash
# บน Z Node — เพิ่มใน existing docker-compose.yml หรือรันแยก
git clone <repo> neo-health-bot
cd neo-health-bot
cp .env.example .env
# แก้ไข .env ด้วย values จริง
docker-compose up -d
```

## Architecture

```
src/
├── index.ts     # Entry point + cron scheduler
├── bot.ts       # Telegram bot + command handlers
├── tracker.ts   # Session state management (in-memory)
├── nudge.ts     # Message templates (Thai)
├── tts.ts       # OpenAI TTS → .ogg conversion
├── config.ts    # Config from environment
└── logger.ts    # Timestamped console logger
```

## Session Logic

```
User sends message
    │
    ▼
recordActivity()
    │
    ├─ New user?        → Create session (sessionStarted = now)
    ├─ Inactive > 30m?  → Reset sessionStarted = now
    └─ Active?          → Update lastActivity only

Every 15 min (cron)
    │
    ▼
getUsersDueForNudge()
    │
    ├─ session duration >= 2h?     ✓
    ├─ last activity < 30m ago?    ✓ (still active)
    ├─ cooldown passed (60m)?      ✓
    ├─ not paused?                 ✓
    └─ not quiet hours?            ✓
         │
         ▼
    Send text + voice nudge
```
