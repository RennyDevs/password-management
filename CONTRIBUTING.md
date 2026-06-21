# Contributing to Password Manager

Thank you for considering contributing to this project! This document provides guidelines and instructions to help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security Issues](#security-issues)
- [Questions and Discussions](#questions-and-discussions)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Harassment, discrimination, and offensive behavior of any kind will not be tolerated.

## Getting Started

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/my-passmgr.git
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/my-passmgr.git
   ```
4. Create a new branch for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm (or pnpm)
- A Supabase account (free tier works)

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Start Development Server

```bash
npm run dev
```

### Run with Docker (Alternative)

```bash
docker compose up --build
```

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Layout, routing, auth state
├── routes/                  # Page components (Auth, Home, Settings, ChangePassword)
├── components/              # Reusable UI components
├── lib/
│   ├── crypto/              # Client-side encryption (Argon2id, XChaCha20-Poly1305)
│   ├── storage/             # Supabase sync and IndexedDB cache
│   ├── auth/                # Supabase authentication helpers
│   ├── i18n/                # Internationalization
│   └── utils/               # Utility functions
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
└── test/                    # Test setup, utilities, and integration tests
```

## Coding Standards

### TypeScript

- This project uses **TypeScript** with strict mode enabled.
- Define types in `src/types/` for shared interfaces.
- Use explicit return types for functions, especially in `src/lib/`.

### React

- Use functional components with hooks.
- Keep components small and focused on a single responsibility.
- UI state belongs in hooks and props, not in global mutable state.
- Extract reusable logic into custom hooks under `src/hooks/`.

### Crypto and Storage

- All encryption and decryption logic MUST remain in `src/lib/crypto/`.
- Storage abstractions are in `src/lib/storage/` — never mix storage code with UI components.
- Never log sensitive data (passwords, keys, decrypted content).
- Zero out variables containing key material after use.

### General

- Use the existing ESLint and Prettier configurations.
- Run `npm run lint` before committing.
- Keep imports organized (external → internal, absolute → relative).
- Avoid introducing hardcoded secrets or environment values.

## Testing

We aim for meaningful test coverage, especially for security-sensitive code.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (requires dev server running)
npm run e2e
```

### Test Conventions

- **Unit tests** live next to the source file they test (e.g., `src/lib/crypto/argon2.test.ts`).
- **Integration tests** go in `src/test/integration/` and cover real workflows.
- **E2E tests** are in `e2e/tests/`.
- Use `renderWithProviders` from `src/test/utils.tsx` for component tests that need app providers.
- Mock external dependencies using the mocks in `src/test/mocks/`.
- Pay attention to `src/test/setup.ts` for global mock and environment initialization.

### When Modifying Storage or Sync

Verify both the local IndexedDB path and the Supabase sync path in your tests.

### When Modifying Auth or Crypto

Update associated tests and ensure your changes preserve the project's security assumptions. Re-read `SECURITY.md` before making changes to auth or crypto code.

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit messages.

### Format

```
<type>(<scope>): <description>
```

### Types

| Type       | Usage                                         |
|------------|-----------------------------------------------|
| `feat`     | A new feature                                 |
| `fix`      | A bug fix                                     |
| `refactor` | Code change that neither fixes nor adds feature |
| `test`     | Adding or updating tests                      |
| `docs`     | Documentation-only changes                    |
| `style`    | Formatting, missing semicolons, etc.          |
| `chore`    | Build, CI, or tooling changes                 |
| `perf`     | Performance improvements                      |
| `security` | Security-related changes                      |

### Examples

```
feat(crypto): add AES-GCM fallback encryption
fix(storage): handle IndexedDB quota exceeded error
refactor(hooks): extract useOnlineSync hook
test(components): add RecordItem unit tests
docs(readme): update setup instructions
```

## Pull Request Process

1. Ensure your branch is up to date with `upstream/master`.
2. Run `npm run lint` and `npm test` — all checks must pass.
3. Write or update tests to cover your changes.
4. Update documentation (`README.md`, `SECURITY.md`) if your change affects the public API or security model.
5. Submit a pull request with a clear title and description:
   - What does this PR do?
   - Why is it needed?
   - How was it tested?
   - Screenshots or logs (if applicable).
6. Address any review feedback promptly.
7. A maintainer will merge your PR once it is approved.

### Checklist Before Submitting

- [ ] Linter passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] New tests cover the changes
- [ ] Documentation updated (if applicable)
- [ ] No hardcoded secrets or credentials
- [ ] Commits follow Conventional Commits

## Security Issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](./SECURITY.md) for instructions on responsible disclosure.

## Questions and Discussions

- Open a [GitHub Discussion](https://github.com/user/my-passmgr/discussions) for questions or feature ideas.
- For bug reports, open a [GitHub Issue](https://github.com/user/my-passmgr/issues) with the `bug` label.

Thank you for helping make this project better!
