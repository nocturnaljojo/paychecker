# Architecture — memory stack v1

The 4-layer indexing pattern that keeps PayChecker readable to its solo author across months of interrupted sessions.

## The stack

### Layer 1 — Always-loaded indexes
Files always loaded into Claude's context at session start. Total budget: a few KB.
- `CLAUDE.md` — bible
- `docs/retros/LATEST.md` — pointer
- `.claude/INDEX.md` — file map
- `.claude/STATE-PRJ-issues.md` — open bugs (when small)

### Layer 2 — On-demand indexes
Files read when a topic comes up — flat, scannable, one-line per item.
- `.claude/PLAN-PRJ-mvp-phases.md` (read when current phase / next task is needed)
- `.claude/STATE-PRJ-improvements.md` (read when polishing or backlog grooming)
- `.claude/ref/REF-AWARDS-list.md` (read when working on an award)

### Layer 3 — Body files
Read only when their index points at them.
- Skill files
- Reference files
- Award research notes
- Specific retros

### Layer 4 — Cold storage
Anything older than the last quarter, or anything that resolved. NOT loaded into context. Searchable via `git log` / file search if ever needed.
- Closed issues (could be archived to `STATE-PRJ-issues-archive.md` when section grows)
- Old retros from earlier phases
- Superseded plans

## The discipline

**At session start, load only Layer 1.** That's all you need to orient.

**During work, walk down the layers as needed.** A specific question pulls a specific body file from Layer 3 via the index from Layer 2. You should never touch Layer 4 by default.

**Never load by listing.** "Let me read all the retros" is the anti-pattern. The list is the index; read entries via the index, not by enumeration.

## Index hygiene

Indexes rot. The discipline:
- When you add a body file, update its index in the same commit.
- When you remove a body file, remove its index entry in the same commit.
- When you rename, update both.
- Once a quarter, audit indexes against bodies — the auditor agent does this.

## Memory cycle

Old context → summarise → re-index → archive.

Concretely:
- After Phase N closes, the auditor agent produces a one-paragraph summary of what was learned.
- That summary goes into a Phase N retrospective doc.
- Individual session retros from Phase N stay where they are but are not loaded into Layer 1 / Layer 2 anymore.

## What this looks like in practice

Asking "what's currently broken" should be:
1. Read `STATE-PRJ-issues.md` open section. Done.

Asking "why did we choose Clerk over Supabase Auth" should be:
1. Read `.claude/INDEX.md` ref table.
2. See `REF-STK-stack.md` — has the auth choice + reason.
3. If the why isn't there, read this file's git log for the original decision.

Asking "what did we ship in March 2026" should be:
1. List `docs/retros/2026-03-*.md` filenames. (Filenames are an index too — that's why they have dates.)
2. Skim filenames for relevance.
3. Open ONLY the relevant ones.

If any of these questions requires opening 5+ files to answer, the relevant index has failed. Fix the index, don't loop harder.

## Why this exists
The whole project's coherence — across months, across breaks, across solo-founder reality — depends on this stack working. Without it, PayChecker becomes unreadable to its own author by Phase 2.
