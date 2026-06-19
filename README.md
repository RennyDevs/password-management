# Password Manager

A web-based password manager with End-to-End Encryption (E2EE). Built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## Features

- **E2EE Encryption**: Secrets are encrypted on the client before being sent to the server
- **XChaCha20-Poly1305**: via libsodium-wrappers
- **Argon2id Key Derivation**: With PBKDF2 fallback
- **Supabase Backend**: Authentication and data sync
- **IndexedDB Cache**: Local caching for offline access
- **Security UX**: Session timeout, brute force protection, clipboard auto-clear

## Prerequisites

- Node.js 18+ (or Docker / Docker Compose)
- A Supabase account (free tier works)

## Setup

### 1. Clone and Install

```bash
cd my-passmgr
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Auth with email/password provider
3. Run the SQL scripts to set up the database:
   - **New project**: Run `scripts/init-supabase.sql` in the Supabase SQL editor
   - **Existing project**: Apply migrations individually via `scripts/migrate.sh` (requires direct DB access) or manually copy the content of each file in `supabase/migrations/` in numeric order
4. Get your Supabase URL and anon key from Project Settings > API

### 3. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run (Native)

```bash
npm run dev
```

### 4b. Run (Docker)

```bash
docker compose up --build
```

The app will be available at `http://localhost:5173`. Hot-reload works inside the container.

## Build

```bash
npm run build
npm run preview
```

## Database Migrations

Migrations are located in `supabase/migrations/` and are applied in numeric order.

### Applying migrations via the CLI helper

```bash
# List available migrations with status
./scripts/migrate.sh list

# Apply a specific migration (by number)
./scripts/migrate.sh apply 00001
./scripts/migrate.sh apply 1         # padded automatically

# Apply all pending migrations
./scripts/migrate.sh apply:all
```

**Prerequisite**: Set the `SUPABASE_DB_URL` environment variable (a PostgreSQL connection string with superuser privileges) in `.env`:

```env
SUPABASE_DB_URL=postgresql://postgres:password@db.abcdef.supabase.co:5432/postgres
```

### Manual application

Copy the content of each migration file from `supabase/migrations/` in numeric order and execute it in the Supabase SQL Editor.

### Migration tracking

The first time a migration is applied, a `public.schema_migrations` table is created to track which files have been executed, preventing duplicate runs.

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Layout, routing, auth state
├── index.css                # Tailwind imports
├── routes/
│   ├── Auth.tsx             # Login/Signup
│   ├── ChangePassword.tsx   # Change user password
│   ├── Home.tsx             # Records list & management
│   └── Settings.tsx         # Settings & security info
├── components/
│   ├── Header.tsx
│   ├── RecordList.tsx
│   ├── RecordItem.tsx
│   ├── MasterPasswordModal.tsx
│   ├── MarkdownEditor.tsx
│   ├── EditRecordModal.tsx
│   ├── ConfirmModal.tsx
│   └── Toast.tsx
├── lib/
│   ├── crypto/
│   │   ├── index.ts         # Main crypto API
│   │   ├── argon2.ts        # Key derivation
│   │   └── sodiumWrapper.ts # XChaCha20 wrapper
│   ├── storage/
│   │   ├── supabase.ts      # Supabase client
│   │   └── indexeddb.ts     # IndexedDB cache
│   ├── auth/
│   │   └── supabaseAuth.ts  # Auth helpers
│   ├── i18n/
│   │   ├── i18n.ts  # Auth helpers
│   │   └── locale/
│   │      ├── en.json
│   │      └── es.json
│   └── utils/
│       ├── uid.ts           # UUID generation
│       ├── timer.ts         # Session timer
│       └── clipboard.ts     # Clipboard management
└── types/
    ├── argon2-browser.d.ts
    ├── record.ts
    └── crypto.ts
```

## Security

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

**⚠️ Important**: Your master password cannot be recovered. If you lose it, all encrypted data is permanently inaccessible.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 3
- **Crypto**: libsodium-wrappers (XChaCha20-Poly1305), argon2-browser (Argon2id)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Storage**: IndexedDB (via idb wrapper)
