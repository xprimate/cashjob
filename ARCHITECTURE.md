# CashJob Application Architecture

## 1. Overview
- Full-stack app with React + Vite frontend and Node.js + Express backend.
- SQLite storage (better-sqlite3) for jobs + users.
- Auth with JWT (login/register), hashed passwords (bcrypt).
- Admin API provides job & user management, stats, CSV export.
- Email verification is token-based and demo-friendly.

## 2. Folder structure
- `/client`: React app
  - `src/pages`: screens (JobList, PostJob, Admin, Auth)
  - `src/services/api.js`: fetch wrappers
  - `src/constants`: data lists
- `/server`: Node/Express backend
  - `routes/`: grouped endpoints (`jobs.js`, `auth.js`, `admin.js`, `captcha.js`)
  - `db.js`: SQLite queries and business helpers
  - `app.js`: server startup and middleware

## 3. Key features
- Job posting conditions
  - first post free for user
  - second post requires verification (`emailValidated`)
- Admin controls
  - view jobs with filters and pagination
  - approve/reject/delete jobs
  - list/delete users
- Captcha in posting for abuse mitigation

## 4. Cleanup checklist
1. run prettier/eslint on both `client` and `server`. Eg:
   - `cd client && npm run lint -- --fix`
   - `cd server && npm run lint -- --fix`
2. remove unused vars / dead code paths in `Admin.jsx` and `db.js` if not needed.
3. verify each route handles errors and returns consistent status/message.
4. add units/tests (Jest, supertest).
5. migrate inline styles into CSS module if needed.

## 5. CI/CD preparation
### 5.1. Docker
- create `Dockerfile` for backend and frontend.
- add `docker-compose.yml` with service dependencies.

### 5.2. GitHub Actions
- add `.github/workflows/ci.yml` with steps:
  1. checkout
  2. setup-node
  3. install backend deps + run `npm test` or `npm run lint`
  4. install frontend deps + run `npm test` and `npm run build`
  5. optional security scans.

### 5.3. Deployment targets
- Vercel/Netlify for frontend build.
- Heroku/GCP/Azure for backend, or container registry with Kubernetes.

### 5.4. Secrets
- store `JWT_SECRET`, `DATABASE_URL` (if production DB), `SMTP_*` in platform secret store.

### 5.5. Smoke flow
1. build -> `npm run build` in client, `npm run build` backend (if transpile)
2. test -> automated jest/lint
3. deploy -> update running environment
4. health check -> call `/api/admin/stats` or `/api/jobs`.

## 6. Email verification production switch
1. add `nodemailer` + env vars.
2. in `auth.js`, send verification link to `user.email` and store token via `setUserVerificationToken`.
3. remove token return in API response for real environment.
4. front-end /verify page posts token to `/api/auth/verify-email`.

## 7. Operation
- backend: `cd server && npm run dev`
- frontend: `cd client && npm run dev`
