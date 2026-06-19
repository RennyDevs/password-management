# Security Documentation

## Overview
This Password Manager implements End-to-End Encryption (E2EE). All secrets are encrypted on the client before being sent to the server. The server (Supabase) only stores encrypted blobs and metadata.

## Cryptographic Parameters

### Key Derivation
- **Algorithm:** Argon2id (primary), PBKDF2-SHA-256 (fallback)
- **Argon2id Parameters:**
  - Time cost: 3
  - Memory: 65,536 KB (64 MB)
  - Parallelism: 1
  - Output hash length: 32 bytes (256 bits)
- **PBKDF2 Fallback Parameters:**
  - Iterations: 600,000
  - Hash: SHA-256

### Encryption
- **Algorithm:** XChaCha20-Poly1305 (via libsodium-wrappers)
- **Nonce size:** 24 bytes (192 bits)
- **Key size:** 32 bytes (256 bits)

### Salt
- **Size:** 16 bytes (128 bits), randomly generated per encryption operation
- Storage: base64-encoded alongside the ciphertext

## Threat Model

### What We Protect Against
- Server compromise: Attacker cannot read encrypted secrets without the master password
- Database breach: All stored data is encrypted
- MITM attacks: HTTPS protects data in transit (provided by Supabase)

### What We Do NOT Protect Against
- Client-side malware/keyloggers
- Compromised browser extensions
- Physical access to the unlocked device

## Security Measures

### Session Management
- Session timeout: 5 minutes of inactivity
- Encrypted key is held in memory only, never persisted to disk
- Key cleared from memory after timeout or after use

### Brute Force Protection
- Maximum 5 failed master password attempts per session
- Exponential backoff after lockout (1s, 2s, 4s, 8s, 16s...)
- Counter resets on successful authentication

### Clipboard Security
- Clipboard automatically cleared 60 seconds after copying

### Data Handling
- No logging of sensitive data (passwords, keys, decrypted content)
- No storage of master password in localStorage/sessionStorage
- Variables containing key material are zeroed after use

## Important Warnings
- **The master password cannot be recovered.** If lost, all encrypted data is permanently inaccessible.
- There is no password reset or recovery mechanism.
- Always use a strong, unique master password.

## Database Schema

### Table: `public.records`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK → auth.users) | Owner of the record; **cannot be changed after creation** (enforced via `BEFORE UPDATE` trigger) |
| title | TEXT | Cleartext title |
| ciphertext | TEXT | Base64-encoded encrypted blob |
| nonce | TEXT | Base64-encoded nonce |
| salt | TEXT | Base64-encoded salt |
| alg_version | TEXT | Algorithm identifier |
| tags | TEXT[] | Array of tags (GIN-indexed) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last-update timestamp (auto-updated via trigger) |

### Triggers
- `trg_records_prevent_user_id_change` — Rejects any `UPDATE` that attempts to alter `user_id`.
- `trg_records_set_updated_at` — Automatically sets `updated_at = NOW()` on every `UPDATE`.

### Row-Level Security
- All RLS policies filter by `auth.uid() = user_id`, ensuring users can only access their own records.
- The `UPDATE` policy additionally enforces `WITH CHECK (auth.uid() = user_id)` to prevent writing rows that would belong to another user.

## Algorithm Versioning
Current version: `v1-sodium-xchacha20-poly1305-argon2id`

This version identifier is stored with each record to allow future algorithm migrations.
