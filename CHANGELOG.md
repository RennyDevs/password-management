# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Test dependencies setup and migration files

### Changed
- Migration files moved to structured directory

### Fixed
- Keyboard events no longer propagate inside modal dialogs
- Test warnings resolved

---

## [0.1.0] — 2026-06-19

### Added
- New favicon
- Infrastructure improvements for development workflow

### Changed
- Dependencies updated to latest compatible versions
- Internationalization (i18n) improvements

### Fixed
- Test warnings

---

## [0.0.6] — 2026-06-19

### Added
- Integration with `navigator.credentials` API for autofill support
- Accessibility improvements across the UI

### Changed
- Code structure refactored for better maintainability
- Bundle split into chunks for optimized loading

---

## [0.0.5] — 2026-06-13

### Added
- Search input for filtering records
- Tags support for organizing secrets
- Export and import functionality
- Password generator tool

### Changed
- Performance improvements across the application

### Fixed
- Error handling for password create, edit, and delete operations
- Table not updating on submit and master password change

---

## [0.0.4] — 2026-06-12

### Added
- Clipboard error handling
- "Sign Out Everywhere" feature to terminate all active sessions
- Rate limiting on Supabase login endpoint
- Change user password functionality
- `SessionTimer` class for automatic session timeout

### Changed
- Refactored to lazy Supabase initialization
- Centralized sodium (libsodium) readiness check
- Extracted `useDecryptRecord` hook
- Extracted `UserContext`, hooks, and repository pattern
- Overhauled memory cleanup with proper array zeroing

### Fixed
- Incorrect type handling in crypto/storage layers
- Duplicate API calls to `/users` endpoint

---

## [0.0.3] — 2026-06-08

### Added
- Internationalization (i18n) support with English and Spanish locales
- Markdown rendering support for secrets content
- Password reset module

### Changed
- Updated pnpm configuration

### Fixed
- `Uint8Array` handling for salt values
- Unused variable cleanup

---

## [0.0.2] — 2026-06-08

### Changed
- Migration to pnpm lockfile (`bun.lock`)

---

## [0.0.1] — 2026-05-31

### Added
- Initial project scaffolding with React 19 + Vite + TypeScript
- Supabase authentication (email/password provider)
- Client-side end-to-end encryption with XChaCha20-Poly1305
- Argon2id key derivation with PBKDF2-SHA-256 fallback
- IndexedDB offline caching via `idb` wrapper
- Record CRUD (create, read, update, delete) operations
- Master password modal with brute-force protection
- Session timeout of 5 minutes of inactivity
- Clipboard auto-clear after 60 seconds
- Tailwind CSS styling with dark theme
- Row-Level Security (RLS) policies on Supabase
- Database migration system
- Docker Compose development setup
- Project documentation (`README.md`, `SECURITY.md`)
- Test infrastructure (Vitest, Testing Library, Playwright)

[Unreleased]: https://github.com/user/my-passmgr/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/my-passmgr/compare/v0.0.6...v0.1.0
[0.0.6]: https://github.com/user/my-passmgr/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/user/my-passmgr/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/user/my-passmgr/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/user/my-passmgr/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/user/my-passmgr/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/user/my-passmgr/releases/tag/v0.0.1
