# Design System Workspace

This directory contains the versioned deliverables for Task 28.

## Source of truth

- [`MASTER.md`](./MASTER.md) is the single source of truth for the approved design system.
- [`DESIGN.MD`](./DESIGN.MD) is a legacy pointer and must not redefine tokens or direction.
- [`pages/public.md`](./pages/public.md) is the public-routes spec for both `/` and `/rankings`.
- [`TASK28_AUDIT.md`](./TASK28_AUDIT.md) records the audit findings for this delivery.

## Task 28.1 status

- `ui-ux-pro-max` is installed locally for `codex` at `.agents/skills/ui-ux-pro-max`.
- Project verification command: `npx skills list -a codex`
- Install command used: `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill -s ui-ux-pro-max -a codex -y --copy`

## Notes for reproducibility

- The repository already had a global copy of `ui-ux-pro-max`, but Task 28.1 required a project-local install. The local copy now exists under `.agents/skills/ui-ux-pro-max`.
- The CLI `npx skills list --json` returned `[]` even after a successful install. `npx skills list -a codex` correctly shows the project skill, so that command should be used for verification in this repo.
- The skill documentation expects `python` or `python3` to be available for `scripts/search.py`. Neither command is available in the current shell, so skill execution is not yet unblocked until Python is installed and on `PATH`.
- Recommended Windows prerequisite: install Python 3.12+ and verify with `python --version` before running the skill search commands.

## Versioned outputs

- `MASTER.md`
- `pages/`
- `TASK28_AUDIT.md`
- Stitch mockup images in this directory used as visual references for page specs
