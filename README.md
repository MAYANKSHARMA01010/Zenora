# Zenora

Zenora is a full-stack mental wellness platform in active development.  
This repository currently includes a Next.js frontend and an Express + Prisma backend with authentication, onboarding, and role-based profile creation flows.

## Current Build Status

### Implemented
- Backend API with Express 5, Prisma (PostgreSQL), Redis bootstrap, helmet/cors/rate-limiting, centralized error handling.
- Authentication system:
  - Email/password login
  - JWT access + refresh token flow
  - Google OAuth start + callback
  - Password reset (forgot/reset/change)
  - Current user endpoint (`/auth/me`)
- User onboarding flow:
  - onboarding status endpoint
  - onboarding completion endpoint with persisted onboarding profile JSON
- Role-aware profile creation endpoints:
  - Client profile
  - Therapist profile
  - Admin profile
- Frontend login experience:
  - role-based login selection
  - Google sign-in support
  - toast-based feedback
  - onboarding modal (multi-step) after first login
- Basic validation tests for profile payload schemas (Jest + Zod).

### In Progress / Planned (Schema Present)
The Prisma schema already defines many additional domain models, but their full API and UI flows are not implemented yet (for example sessions, payments, subscriptions, complaints, AI interactions, notifications, ratings, earnings, chat messages, availability slots, and treatment plans).

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Backend: Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, Redis
- Validation & Security: Zod, JWT, bcrypt, helmet, CORS, express-rate-limit
- Tooling: pnpm, Jest, Husky

## Project Structure

- `frontend/` - Next.js app (`src/app`, auth context, auth API client)
- `backend/` - Express API (`src/routes`, `src/controllers`, `src/services`, `prisma/schema.prisma`)
- `android/`, `ios/`, `packages/` - present but not part of the current primary web auth flow

## API Routes Available Now

Base URL: `http://localhost:5001/api/v1`

### Health
- `GET /health`

### Auth
- `GET /auth/google/start?role=CLIENT|THERAPIST|ADMIN`
- `GET /auth/google/callback`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password` (auth required)
- `GET /auth/me` (auth required)
- `GET /auth/onboarding/status` (auth required)
- `PUT /auth/onboarding` (auth required)

### Profiles
- `POST /profiles/client` (CLIENT, auth required)
- `POST /profiles/therapist` (THERAPIST, auth required)
- `POST /profiles/admin` (ADMIN, auth required)

## Local Setup

### 1) Install dependencies
From repo root:

```bash
pnpm install
```

Then install app dependencies:

```bash
cd backend && pnpm install
cd ../frontend && pnpm install
```

### 2) Configure environment variables

Create `backend/.env` and define at least:

- `NODE_ENV`
- `SERVER_PORT` (backend currently expects `5001` by default in frontend config)
- `DATABASE_URL`
- `REDIS_LOCAL_URL`
- `JWT_SESSION_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_LOCAL_URL` (usually `http://localhost:3000`)
- Optional for Google auth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI_LOCAL`

For frontend, add `frontend/.env.local`:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api/v1`

### 3) Run development servers

Backend:

```bash
cd backend
pnpm dev
```

Frontend:

```bash
cd frontend
pnpm dev
```

Open `http://localhost:3000`.

## Testing

Backend tests:

```bash
cd backend
pnpm test
```

## Notes

- Root `package.json` is currently minimal and does not orchestrate workspace scripts yet.
- App metadata/title in frontend is still scaffold default and can be updated during product branding pass.