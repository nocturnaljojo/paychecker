# REF-NAMING-conventions

## Purpose
Names should be readable as an index, not opened to be understood. If you have to open a file to learn what it is for, the name has failed.

## File-name patterns

### `.claude/` files

| Prefix | Use | Example |
|---|---|---|
| `SKILL-{DOMAIN}-{topic}.md` | A reproducible workflow Claude can invoke | `SKILL-AWARD-add-new.md` |
| `REF-{CATEGORY}-{topic}.md` | A reference document — schemas, conventions, lists | `REF-DB-schema.md` |
| `STATE-PRJ-{topic}.md` | A live tracker — current state of issues / improvements | `STATE-PRJ-issues.md` |
| `PLAN-PRJ-{topic}.md` | A plan that gets ticked off as work progresses | `PLAN-PRJ-mvp-phases.md` |
| `INDEX.md` / `CLAUDE.md` | Special — single-instance, well-known names | n/a |

**Domain prefixes for SKILL files:** `PRJ` (project ops), `AWARD` (award reference data), `FACT` (facts model), `DOC` (document handling), `COMP` (comparison engine), `BILL` (billing). Add new prefixes only when they describe at least 2 expected skills.

**Category prefixes for REF files:** `DB`, `API`, `STK` (stack), `NAMING`, `FACT`, `INDEXING`, `AWARDS`, `PRIVACY`. Same rule — add a category only for ≥ 2 expected refs.

### Session retros

`docs/retros/YYYY-MM-DD-sNNN-{slug}.md`
- `YYYY-MM-DD` — calendar date the session started
- `sNNN` — zero-padded session number (s001, s002, …)
- `{slug}` — 2–4 word kebab-case topic
- Example: `docs/retros/2026-04-26-s001-template-init.md`

### Migrations

`supabase/migrations/NNNN_{description}.sql`
- `NNNN` — zero-padded sequence (`0001`, `0002`)
- `{description}` — kebab-case, what the migration does
- Example: `0003_add_classification_to_workers.sql`

## Folder names

- All lowercase, kebab-case. No camelCase, no PascalCase, no underscores.
- Never abbreviate where ambiguous. `ops` is fine; `mig` is not.
- One purpose per folder. If a folder needs a README to explain it, the name has failed.

## DB names

- Tables: snake_case, plural for entities (`workers`, `shifts`), singular for join tables that name a relationship.
- Fact tables suffixed `_facts` (`shift_facts`, `payslip_facts`). History tables suffixed `_history`.
- Columns: snake_case. Booleans prefixed `is_` or `has_`. Timestamps suffixed `_at`. Foreign keys suffixed `_id`.
- Enums: lower_snake values (`worker_entered`, not `WORKER_ENTERED`).

## Commit messages

Conventional Commits. Type prefix lowercase, scope optional, subject in imperative.

```
{type}({scope}): {imperative summary}

{optional body — why, not what}
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `init`.

Examples:
- `init: project scaffolding — CLAUDE.md + .claude/ structure`
- `feat(onboarding): Layer 1 facts capture form`
- `fix(comparison): exclude unconfirmed Layer 2 facts from calc`
- `docs(skills): add 9 SKILL files for project workflows`

## Why this exists

The whole "indexing not looping" pattern depends on this. If the index lies, the only fallback is opening every file — which is looping, which is what we are explicitly avoiding.
