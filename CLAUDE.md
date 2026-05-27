# CLAUDE.md — NEO Health Bot

> อัปเดตล่าสุด: 2026-05-27 (Session 3)

---

## 📌 Project Overview

**NEO Health Bot** — Telegram bot แจ้งเตือนสุขภาพด้วยข้อความภาษาไทย + TTS voice message
Bot username: `@NEO_Health_jack_bot`
Group: `JcAfee, Neo Health and neo` (ID: `-5029847683`)
GitHub: https://github.com/gmgroup999/neo-health-bot (Private)

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

### Session 3 (2026-05-27 เย็น)
1. **ลบ `version: '3.9'`** ออกจาก `docker-compose.yml` — หาย obsolete warning
2. **ตั้ง git repository** — `git init`, `.gitattributes`, `.gitignore` อัปเดต (เพิ่ม `data/`, `.claude/`)
3. **สร้าง GitHub Actions CI/CD** — `.github/workflows/deploy.yml`
4. **Push to GitHub** — Private repo, branch `main`
5. **ตั้ง GitHub Secrets** — `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`, `SSH_PORT`
6. **CI/CD ทำงานสำเร็จ** ✅ — push → auto deploy Z Node ใน ~21s
7. **ลบ `deploy-znode.sh`** — legacy script มี key เก่า (GitHub Push Protection บล็อก)
8. **แก้ Timezone Bug** 🐛 — `isQuietHours()` ใช้ UTC แทน Bangkok → nudge ไม่ยิงตลอดช่วง 00:00-14:00 น. ไทย
9. **ทดสอบ nudge จริง** ✅ — ยืนยัน text + voice ส่งเข้ากลุ่มอัตโนมัติ 13:38 น.

---

## 📁 ไฟล์ทั้งหมดและ Path

### Local (Windows)
```
h:\NEO-Health-Bot\
├── .github/
│   └── workflows/
│       └── deploy.yml   ← CI/CD: push to main → deploy Z Node [NEW]
├── src/
│   ├── config.ts        ← env vars + required() guard
│   ├── logger.ts        ← timestamped console logger
│   ├── db.ts            ← SQLite layer (better-sqlite3)
│   ├── tracker.ts       ← session logic — SQLite-backed
│   ├── nudge.ts         ← 8 Thai message templates (rotating)
│   ├── tts.ts           ← OpenAI TTS → .ogg temp file
│   ├── bot.ts           ← grammy bot, commands, isQuietHours (Bangkok TZ)
│   ├── health.ts        ← /healthz HTTP endpoint
│   └── index.ts         ← entry point, cron, bot.start(), graceful shutdown
├── dist/                ← compiled JS (gitignored)
├── data/                ← SQLite DB (gitignored, Docker volume)
├── .env                 ← secrets (gitignored)
├── .env.example
├── .gitattributes       ← LF line endings [NEW]
├── .gitignore
├── Dockerfile           ← multi-stage alpine, non-root user (neo)
├── docker-compose.yml   ← port 127.0.0.1:3098, volume neo-health-data, healthcheck
├── package.json         ← grammy, better-sqlite3, node-cron v4
├── tsconfig.json
└── README.md
```

### บน Z Node
```
/home/jack/neo-health-bot/   ← production path (CI/CD copy ไฟล์มาที่นี่)
/app/data/neo-health.db      ← SQLite DB (inside container, mounted volume)
```

### ไฟล์ที่แก้ไขใน Session 3
| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `src/bot.ts` | **แก้ timezone bug** — `isQuietHours()` ใช้ `Intl.DateTimeFormat('Asia/Bangkok')` |
| `src/config.ts` | ชั่วคราว hardcode test values → revert กลับ production แล้ว |
| `docker-compose.yml` | ลบ `version: '3.9'` |
| `.gitignore` | เพิ่ม `data/`, `.claude/` |
| `.gitattributes` | **NEW** — normalize LF line endings |
| `.github/workflows/deploy.yml` | **NEW** — GitHub Actions CI/CD pipeline |
| `deploy-znode.sh` | **ลบออก** — legacy script มี revoked key |

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

# ดู SQLite sessions
docker exec neo-health-bot sh -c 'sqlite3 /app/data/neo-health.db "SELECT * FROM sessions;"'

# Rebuild (ถ้า CI/CD ไม่ทำงาน — manual fallback)
cd ~/neo-health-bot && docker compose up -d --build
```

Container restart policy: `always` — reboot แล้ว start เองอัตโนมัติ

### CI/CD (GitHub Actions) ← วิธีหลัก
```bash
# แค่ push code → deploy อัตโนมัติใน ~21s
git add .
git commit -m "feat: your change"
git push

# ดู pipeline: https://github.com/gmgroup999/neo-health-bot/actions
```
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main`
- Steps: SCP source files → SSH → `docker compose up -d --build` → prune images
- Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`, `SSH_PORT`

---

## 🤖 Bot Commands

| Command | ทำอะไร |
|---|---|
| `/start` | welcome message + แสดง config |
| `/status` | session duration ปัจจุบัน |
| `/pause` | หยุดแจ้งเตือน 2 ชั่วโมง |
| `/resume` | เปิดแจ้งเตือน |
| `/test` | ส่ง nudge + voice ทันที (ไม่เช็คเงื่อนไข) |

---

## 📋 Session Logic

```
ส่ง message ในกลุ่ม
    → recordActivity() → บันทึกลง SQLite

    ถ้า inactive > 30 นาที → reset sessionStarted (เริ่มนับใหม่)
    ถ้าเป็น user ใหม่ → INSERT session

Cron ทุก 15 นาที
    → isQuietHours()? (เวลาไทย UTC+7) → ถ้าใช่ skip
    → getUsersDueForNudge():
        ✅ session ≥ 2h
        ✅ last_activity < 30m ที่แล้ว
        ✅ last_nudged > 60m ที่แล้ว (หรือไม่เคย)
        ✅ ไม่ได้ /pause
    → buildNudgeMessage() → สุ่ม 1 ใน 8 template ภาษาไทย
    → OpenAI TTS → .ogg
    → ส่ง text + voice เข้ากลุ่ม
    → บันทึก last_nudged ลง SQLite
```

---

## 📊 System Status (ล่าสุด)

| รายการ | ค่า |
|---|---|
| Container | 🟢 Running + Healthy |
| Memory | 19.6 MB / 62.7 GB |
| Image size | 52.3 MB |
| Node.js | v20.20.2 |
| Alpine | v3.23 |
| npm vulnerabilities | **0** ✅ |
| Health endpoint | `http://localhost:3098/healthz` (localhost only) |
| Nudge test | ✅ ยืนยันทำงานแล้ว 2026-05-27 13:38 |

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
| Git repo | ✅ Private |
| Secrets ใน GitHub | ✅ GitHub Secrets (ไม่ใช่ hardcode) |

---

## 📝 TODO — งานที่ค้างอยู่

- [ ] **Backup SQLite DB** — ยังไม่มี cron backup ถ้า `docker compose down -v` จะสูญหาย
- [x] ~~**ทดสอบ nudge จริง**~~ — เสร็จแล้ว 2026-05-27 ✅ text + voice ส่งเข้ากลุ่ม
- [x] ~~**ตั้ง git repository**~~ — เสร็จแล้ว 2026-05-27
- [x] ~~**CI/CD pipeline**~~ — เสร็จแล้ว 2026-05-27 (GitHub Actions ~21s)
- [x] ~~**ลบ `version:` ออกจาก docker-compose.yml**~~ — เสร็จแล้ว 2026-05-27

---

## ⚠️ ปัญหาที่ยังไม่ได้แก้

### 1. ไม่มี backup SQLite DB
ถ้ารัน `docker compose down -v` จะลบ volume และ SQLite ไปด้วย
→ แนวทางแก้: mount ไปที่ host path แทน named volume หรือตั้ง cron backup รายวัน
```bash
# backup manual
docker exec neo-health-bot sqlite3 /app/data/neo-health.db ".backup '/tmp/backup.db'"
docker cp neo-health-bot:/tmp/backup.db ~/neo-health.db.bak
```

### 2. SSH Password ใน GitHub Secrets
ใช้ password-based SSH ใน CI/CD — ควรเปลี่ยนเป็น SSH key แทน (ปลอดภัยกว่า)
→ แนวทางแก้: สร้าง SSH key pair, เพิ่ม public key ใน `~/.ssh/authorized_keys` บน Z Node

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
| Timezone | UTC (bot ใช้ `Asia/Bangkok` via Intl API) |

---

## 🔗 Related Bots บน Z Node

| Bot | Username | Container | หน้าที่ |
|---|---|---|---|
| NEO_Health | `@NEO_Health_jack_bot` | `neo-health-bot` | Health nudge + TTS |
| neo | `@jackznode_bot` | `neo-neo-1` | AI assistant + server monitor (คนละโปรเจ็ค) |

---

## ⚠️ ข้อควรระวัง

- **Token/Key ใน chat** — ทุกครั้งที่ส่ง secret ใน chat ให้ rotate ทันทีหลังใช้งาน
- **อ่าน token จากภาพ** — ระวัง `0` (ศูนย์) vs `O` (ตัวโอ), `1` vs `l` vs `I` — copy เป็น text เสมอ
- **`docker compose restart`** ไม่ reload `.env` — ต้องใช้ `docker compose up -d` แทน
- **Server timezone = UTC** — bot ใช้ `Intl.DateTimeFormat('Asia/Bangkok')` แปลงเวลาเองแล้ว ไม่ต้องแก้ server
- **CI/CD copy เฉพาะ src/** — ไฟล์ `.env` บน Z Node ต้องแก้ manual (ไม่ถูก overwrite)
