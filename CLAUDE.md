# CLAUDE.md — NEO Health Bot

> อัปเดตล่าสุด: 2026-05-27 (Session 2)

---

## 📌 Project Overview

**NEO Health Bot** — Telegram bot แจ้งเตือนสุขภาพด้วยข้อความภาษาไทย + TTS voice message
Bot username: `@NEO_Health_jack_bot`
Group: `JcAfee, Neo Health and neo` (ID: `-5029847683`)

---

## ✅ สิ่งที่ทำไปแล้ว

### Session 1 (2026-05-27 เช้า)
- Scaffold โปรเจ็คตั้งแต่ต้น — TypeScript, node-telegram-bot-api, node-cron, OpenAI TTS
- แก้ Privacy Mode ของ bot ผ่าน BotFather (`/setprivacy` → Disable)
- แก้ Group ID จาก `-1002351796605` → `-5029847683` (อ่านจาก bot log)
- Deploy ครั้งแรกบน Z Node ผ่าน PSCP + plink
- แก้ 409 Conflict (local bot vs Z Node bot polling พร้อมกัน)
- ยืนยัน bot รับ message จากกลุ่มได้

### Session 2 (2026-05-27 บ่าย)
1. **ลบ debug log** ออกจาก `bot.ts` (privacy — เคย log content ทุก message)
2. **แก้ DeprecationWarning** — ระบุ `contentType: audio/ogg` ใน sendVoice
3. **Migrate Telegram library** `node-telegram-bot-api` → **`grammy`** (modern, 0 vulnerabilities)
4. **Upgrade node-cron** v3 → v4 (แก้ `uuid` vulnerability)
5. **เพิ่ม SQLite** persistent session storage (`better-sqlite3`) + Docker volume
6. **เพิ่ม `/healthz`** HTTP endpoint (port 3098, localhost only)
7. **แก้ Dockerfile** — สร้าง `/app/data` ด้วย ownership `neo:neo` ก่อน USER switch
8. **แก้ port binding** `0.0.0.0:3098` → `127.0.0.1:3098` (ปิด external access)
9. **Rotate OpenAI API Key** — key เก่า revoke แล้ว
10. **Rotate Bot Token** — token เก่า revoke แล้ว (เจอปัญหา `0` vs `O` ในภาพ)
11. Redeploy บน Z Node หลายรอบ จนทำงานสมบูรณ์

---

## 📁 ไฟล์ทั้งหมดและ Path

### Local (Windows)
```
h:\NEO-Health-Bot\
├── src/
│   ├── config.ts        ← env vars + required() guard
│   ├── logger.ts        ← timestamped console logger
│   ├── db.ts            ← SQLite layer (better-sqlite3) [NEW]
│   ├── tracker.ts       ← session logic — ใช้ SQLite แทน in-memory Map
│   ├── nudge.ts         ← 8 Thai message templates (rotating)
│   ├── tts.ts           ← OpenAI TTS → .ogg temp file
│   ├── bot.ts           ← grammy bot, command handlers [MIGRATED]
│   ├── health.ts        ← /healthz HTTP endpoint [NEW]
│   └── index.ts         ← entry point, cron, bot.start(), graceful shutdown
├── dist/                ← compiled JS (gitignored)
├── data/                ← SQLite DB (gitignored, Docker volume)
├── .env                 ← secrets (gitignored)
├── .env.example
├── .gitignore
├── Dockerfile           ← multi-stage alpine, non-root user, /app/data ownership
├── docker-compose.yml   ← port 127.0.0.1:3098, volume neo-health-data, healthcheck
├── deploy-znode.sh      ← legacy deploy script (outdated หลัง migrate grammy)
├── package.json         ← grammy, better-sqlite3, node-cron v4
├── tsconfig.json
└── README.md
```

### บน Z Node
```
/home/jack/neo-health-bot/   ← production path
/app/data/neo-health.db      ← SQLite DB (inside container, mounted volume)
```

### ไฟล์ที่แก้ไขใน Session 2
| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `src/bot.ts` | ลบ debug log, แก้ sendVoice contentType, **migrate grammy** |
| `src/tracker.ts` | migrate จาก in-memory Map → SQLite |
| `src/index.ts` | ใช้ `bot.start()` แบบ grammy, เพิ่ม health server |
| `src/db.ts` | **NEW** — SQLite schema + CRUD stmts |
| `src/health.ts` | **NEW** — `/healthz` HTTP server |
| `package.json` | grammy, better-sqlite3, node-cron v4, ลบ node-telegram-bot-api |
| `Dockerfile` | เพิ่ม `mkdir /app/data && chown neo:neo`, เพิ่ม `EXPOSE 3000` |
| `docker-compose.yml` | port `127.0.0.1:3098:3000`, volume, healthcheck ใช้ wget |
| `.env` | อัปเดต OPENAI_API_KEY ใหม่, TELEGRAM_BOT_TOKEN ใหม่ |

---

## ⚙️ Environment Variables (.env)

```env
TELEGRAM_BOT_TOKEN=8760543966:AAGM0G2QQ3CKX3MRV_0MFLnhEzxDO1rHqss
TELEGRAM_GROUP_ID=-5029847683
OPENAI_API_KEY=sk-proj-7tv4...   ← rotated 2026-05-27
TTS_VOICE=alloy
SESSION_THRESHOLD_HOURS=2
NUDGE_COOLDOWN_MINUTES=60
QUIET_START=23
QUIET_END=7
NODE_ENV=production
DB_PATH=/app/data/neo-health.db
```

---

## 🐳 Docker / Deploy

```bash
# Z Node — ดู logs
docker logs neo-health-bot -f

# Health check
curl http://localhost:3098/healthz

# Restart (reload env)
cd ~/neo-health-bot && docker compose up -d

# Rebuild หลังแก้ code
cd ~/neo-health-bot && docker compose up -d --build

# ดู SQLite sessions
docker exec neo-health-bot sh -c 'sqlite3 /app/data/neo-health.db "SELECT * FROM sessions;"'
```

Container restart policy: `always` — reboot แล้ว start เองอัตโนมัติ

---

## 🤖 Bot Commands

| Command | ทำอะไร |
|---|---|
| `/start` | welcome message + แสดง config |
| `/status` | session duration ปัจจุบัน |
| `/pause` | หยุดแจ้งเตือน 2 ชั่วโมง |
| `/resume` | เปิดแจ้งเตือน |
| `/test` | ส่ง nudge + voice ทันที |

---

## 📋 Session Logic

```
ส่ง message ในกลุ่ม
    → recordActivity() → บันทึกลง SQLite

    ถ้า inactive > 30 นาที → reset sessionStarted
    ถ้าเป็น user ใหม่ → INSERT session

Cron ทุก 15 นาที
    → getUsersDueForNudge()
    → conditions: session ≥ 2h + active < 30m + cooldown ผ่าน + ไม่ pause + ไม่ quiet hours
    → ส่ง text + voice ไปที่กลุ่ม
    → บันทึก lastNudged ลง SQLite
```

---

## 📊 System Status (ล่าสุด)

| รายการ | ค่า |
|---|---|
| Container | 🟢 Running + Healthy |
| Memory | 19.6 MB / 62.7 GB |
| CPU | ~0% (idle) |
| Image size | 52.3 MB |
| Node.js | v20.20.2 |
| Alpine | v3.23 |
| npm vulnerabilities | **0** ✅ |
| Health endpoint | `http://localhost:3098/healthz` (localhost only) |

---

## 🔒 Security Status

| รายการ | สถานะ |
|---|---|
| Run as non-root (`neo` uid=100) | ✅ |
| `/app` read-only (code ถูก lock) | ✅ |
| `/app/data` writable (SQLite เท่านั้น) | ✅ |
| Health port bind localhost only | ✅ |
| OpenAI API Key rotated | ✅ 2026-05-27 |
| Bot Token rotated | ✅ 2026-05-27 |
| npm vulnerabilities | ✅ 0 |

---

## 📝 TODO — งานที่ค้างอยู่

- [ ] **ทดสอบ nudge จริง** — รอ session ครบ 2 ชั่วโมงในกลุ่ม แล้วดูว่าบอทส่งข้อความ + voice เข้ากลุ่มได้
- [ ] **ตั้ง git repository** — ยังไม่มี version control, deploy แบบ manual (PSCP)
- [ ] **CI/CD pipeline** — อยากให้ push code แล้ว deploy อัตโนมัติ
- [x] ~~**ลบ `version:` ออกจาก docker-compose.yml**~~ — เสร็จแล้ว 2026-05-27

---

## ⚠️ ปัญหาที่ยังไม่ได้แก้

### 1. ไม่มี persistent session หากลบ volume
ถ้ารัน `docker compose down -v` จะลบ SQLite ไปด้วย
→ ควร backup DB เป็นประจำ หรือ mount ไปที่ host path แทน volume

### 3. ไม่มี version control (git)
- แก้ code ต้อง re-upload ด้วย PSCP ทุกครั้ง
- ไม่มี history ว่าแก้อะไรไปบ้าง

---

## 🖥️ Z Node Server Info

| รายการ | ค่า |
|---|---|
| IP | `195.201.81.33` |
| SSH User | `jack` (ไม่ใช่ root) |
| SSH Port | `22` |
| Root login | ❌ ปิด (`PermitRootLogin no`) — ปกติ |
| Docker | v29.4.1 |
| Docker Compose | v5.1.3 |
| Bot path | `/home/jack/neo-health-bot/` |
| Container | `neo-health-bot` (restart: always) |

---

## 🔗 Related Bots บน Z Node

| Bot | Username | Container | หน้าที่ |
|---|---|---|---|
| NEO_Health | `@NEO_Health_jack_bot` | `neo-health-bot` | Health nudge + TTS |
| neo | `@jackznode_bot` | `neo-neo-1` | AI assistant + server monitor |

---

## ⚠️ ข้อควรระวัง

- **Token/Key ใน chat** — ทุกครั้งที่ส่ง secret ใน chat ให้ rotate ทันทีหลังใช้งาน
- **อ่าน token จากภาพ** — ระวัง `0` (ศูนย์) vs `O` (ตัวโอ), `1` vs `l` vs `I` — copy เป็น text เสมอ
- **`docker compose restart`** ไม่ reload `.env` — ต้องใช้ `docker compose up -d` แทน
