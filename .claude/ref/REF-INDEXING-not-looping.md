# REF-INDEXING-not-looping

## Purpose
The memory pattern. Why we never load full conversation history, full file lists, or full retros — and what we do instead.

## The problem

A solo founder building over months will accumulate:
- Hundreds of session retros
- Tens of skill / ref files
- Hundreds of issues / improvements
- Days of conversation history per session

Loading all of this into context every session is "looping" — re-scanning the entire history to answer one question. It is slow, expensive, and silently lossy when the context fills.

## The pattern: index + targeted retrieval

Every store of knowledge has two layers:
1. **Index** — a flat, scannable list. Names + one-line hooks. Cheap to load every session.
2. **Body** — the file content. Loaded only when a specific item in the index is needed.

The index is structured so the answer to "where would I find this?" is one read. The body is structured so a single file gives the full picture for that one topic.

## Where this applies in PayChecker

| Store | Index | Body |
|---|---|---|
| Skills | `.claude/INDEX.md` skills table | individual `.claude/skills/SKILL-*.md` files |
| Reference | `.claude/INDEX.md` ref table | individual `.claude/ref/REF-*.md` files |
| Retros | `docs/retros/LATEST.md` (and dated filenames as a chronological index) | individual `docs/retros/YYYY-MM-DD-sNNN-*.md` files |
| Issues | `STATE-PRJ-issues.md` (one-line headings + severity) | the issue body in the same file (kept short) |
| Awards | `REF-AWARDS-list.md` | `docs/research/awards-{maNNNN}-vNN.md` |
| Memory (Claude's local) | `MEMORY.md` | individual memory files |

## Reading discipline (every session)

1. Always read indexes (`CLAUDE.md`, `.claude/INDEX.md`, `LATEST.md`, `STATE-PRJ-issues.md`).
2. Read individual bodies ONLY when the current task names them.
3. Never read all retros in a folder. Never read all award research files. If you find yourself listing files to read them all, the index has failed — fix the index instead.

## Writing discipline (every change)

1. When you add a body file, add an index line for it in the same commit.
2. Keep index lines short — under ~150 chars per line.
3. If an index gets too long to scan in 30 seconds, split it (e.g. one index per area).
4. Outdated index entries are worse than missing ones. Update on remove.

## What "looping" looks like (avoid)

- Reading 20 retros to answer "what did we ship in March".
- Re-grepping the codebase 5 times in a session for a fact that should live in `REF-DB-schema.md`.
- Asking the user "what stack are we on" — that's `CLAUDE.md` failing as an index.
- Loading every issue ever opened to find one. Closed issues should be archived or summarised.

## What "indexing" looks like (do)

- Read `LATEST.md` once → read the one retro it points at → know the state.
- Read the skills index → know which skill applies → read only that skill.
- Read `STATE-PRJ-issues.md` open section → know the active risks without scanning closed ones.

## Why this exists

This is how a solo founder stays sane across a year of interrupted sessions. Without it, the project becomes unreadable to its own author.
