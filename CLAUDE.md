# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe React components in a chat interface, and Claude generates them in real-time using a virtual file system. The preview renders instantly in an iframe using Babel-compiled blob URLs and ES module import maps.

## Commands

```bash
npm run setup        # Install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all Vitest tests (watch mode)
npm run test -- --run  # Run tests once (no watch)
npm run db:reset     # Reset SQLite database
```

## Tech Stack

Next.js 15.3 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 with shadcn/ui (new-york style), Prisma ORM with SQLite, Vercel AI SDK + Anthropic Claude (`claude-haiku-4-5`), Monaco Editor, Vitest + React Testing Library.

## Architecture

### Core Data Flow

1. User types in chat → `ChatProvider` (wraps Vercel AI SDK `useChat`) → POST `/api/chat`
2. `/api/chat` reconstructs `VirtualFileSystem` from serialized files, calls Claude with streaming + two AI tools
3. Claude calls tools (`str_replace_editor`, `file_manager`) to create/modify virtual files
4. Tool calls are handled client-side by `FileSystemContext.handleToolCall()`, which mutates the in-memory `VirtualFileSystem`
5. `refreshTrigger` counter increments → `PreviewFrame` rebuilds the import map and updates `iframe.srcdoc`
6. For authenticated users, `onFinish` saves messages + serialized FS to the database

### Key Modules

- **VirtualFileSystem** (`src/lib/file-system.ts`): In-memory file tree with serialize/deserialize for persistence. Supports create, read, update, delete, rename, and text-editor commands (view, str_replace, insert).
- **Preview Pipeline** (`src/lib/transform/jsx-transformer.ts`): Runs in-browser — Babel compiles each file, creates blob URLs, builds ES module import maps. Third-party imports resolve to `esm.sh` CDN. Missing local imports get placeholder modules.
- **AI Tools** (`src/lib/tools/`): `str_replace_editor` (view/create/str_replace/insert/undo_edit) and `file_manager` (rename/delete) — exposed to Claude for file manipulation.
- **Provider** (`src/lib/provider.ts`): Returns real Anthropic model or `MockLanguageModel` when `ANTHROPIC_API_KEY` is absent.
- **Auth** (`src/lib/auth.ts`): Cookie-based JWT sessions via `jose` (HS256, 7-day expiry, httpOnly cookie `auth-token`). Passwords hashed with bcrypt.

### State Management

Two React Contexts power the app (both provided in `MainContent`):
- `FileSystemContext`: Owns `VirtualFileSystem` instance, file selection, and tool call handling
- `ChatContext`: Wraps Vercel AI SDK's `useChat`, ties into file system for tool calls

### Database Schema (Prisma/SQLite)

- `User`: id, email (unique), password, timestamps
- `Project`: id, name, userId (nullable FK), messages (JSON string), data (serialized VirtualFileSystem JSON), timestamps

## Conventions

- Named exports for all components; default exports only for Next.js page files
- `"use client"` / `"use server"` directives as appropriate; `import "server-only"` guard on server modules
- Path alias `@/` maps to `src/` — use everywhere
- `cn()` from `src/lib/utils.ts` for conditional Tailwind class merging
- Tailwind CSS v4 via PostCSS plugin (not config-file based); CSS variables in `globals.css` using `oklch`
- shadcn/ui primitives live in `src/components/ui/`
- Prisma client is generated to `src/generated/prisma` — import from `@/generated/prisma`

## Testing

Tests use Vitest with jsdom environment and React Testing Library. Test files are co-located with source in `__tests__/` subdirectories and import via the `@/` alias.

## Important Notes

- `node-compat.cjs` is required via `NODE_OPTIONS` in all dev/build/start scripts — it deletes global `localStorage`/`sessionStorage` to fix a Node.js 25+ SSR crash. Do not remove it.
- Preview iframe uses `sandbox="allow-scripts allow-same-origin allow-forms"` — `allow-same-origin` is required for blob URL import maps.
- The generation system prompt (`src/lib/prompts/generation.tsx`) requires every project to have a root `/App.jsx` entry point with a default export, using Tailwind CSS only and `@/` aliases for local imports.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | If absent, uses MockLanguageModel with static responses |
| `JWT_SECRET` | No | Defaults to `"development-secret-key"` |
