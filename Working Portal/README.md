# Montessori Prime School Admission Exam Portal

## Services
- `backend` - Express API, PostgreSQL schema/migrations/seed, WebSocket hub
- `admin-portal` - Admin + Principal web app
- `student-portal` - Student exam web app

## Local Setup
1. Start PostgreSQL (example with Docker):
```bash
docker compose up -d postgres
```
2. Backend:
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
3. Admin portal:
```bash
cd admin-portal
cp .env.example .env.local
npm install
npm run dev
```
4. Student portal (second terminal):
```bash
cd student-portal
cp .env.example .env.local
npm install
npm run dev
```

Default dev ports:
- Admin portal: `http://localhost:3300`
- Student portal: `http://localhost:3301`
- Backend API: `http://localhost:4000`

LAN access (same Wi-Fi/network):
- Admin portal runs on `0.0.0.0:3300`
- Student portal runs on `0.0.0.0:3301`
- Set frontend API base URLs to your machine IP, for example:
  - `admin-portal/.env`: `NEXT_PUBLIC_API_BASE_URL=http://192.168.x.x:4000`
  - `student-portal/.env`: `NEXT_PUBLIC_API_BASE_URL=http://192.168.x.x:4000`
- Add the same LAN origins in backend `.env`:
  - `ADMIN_ORIGIN=...,http://192.168.x.x:3300`
  - `STUDENT_ORIGIN=...,http://192.168.x.x:3301`

## Backend Boot Behavior
- Runs migrations on startup
- Creates default admin/principal users if missing
- Upserts `backend/question_bank.json` into `questions`
- Sets PostgreSQL session timezone to `Asia/Kolkata` for all DB connections
- Runs a periodic safety job to auto-submit expired started tests (45 min)

## Create Admin/Principal Users (CLI)
Use the script:
```bash
cd backend
node src/db/createAdminUsers.js --name "Admin One" --email admin1@school.in --password "StrongPass123" --role admin
node src/db/createAdminUsers.js --name "Principal One" --email principal1@school.in --password "StrongPass123" --role principal
```

JSON batch mode:
```bash
node src/db/createAdminUsers.js --config users.json
```
`users.json` can be an object or array:
```json
[
  { "name": "Admin", "email": "admin@school.in", "password": "Pass123", "role": "admin" },
  { "name": "Principal", "email": "principal@school.in", "password": "Pass123", "role": "principal" }
]
```

## Default Login (if using migration defaults)
- Admin: `admin@montessoriprime.school` / `admin123`
- Principal: `principal@montessoriprime.school` / `principal123`

## API Overview
- `POST /api/auth/login`
- `POST /api/auth/verify-code` (rate-limited: 10 req/min/IP)
- `POST /api/admin/create-test`
- `POST /api/admin/end-test`
- `GET /api/admin/active-tests`
- `GET /api/admin/active-sessions`
- `GET /api/admin/test-history`
- `GET /api/admin/tab-switches`
- `GET /api/principal/results?date=YYYY-MM-DD&grade=X&search=name`
- `POST /api/student/start-test`
- `POST /api/student/save-answer`
- `POST /api/student/submit-test` (rate-limited: 3 req/min/testCode)
- `POST /api/ws/tab-switch`
- `GET /ws?channel=admin|student|ADMIN_MONITOR`

## AWS Deployment
See detailed infra notes in:
- [infra/aws-deploy.md](infra/aws-deploy.md)
