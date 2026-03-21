# Task 28 Audit

## Scope

This audit reviews Task 28 across three layers:

- internal coherence of the generated design documents;
- adherence to the checklist recorded in Task Manager;
- differences between the new spec and the current application that are still expected because they belong to Tasks 29+.

## Findings

### Resolved blockers

1. `DESIGN.MD` conflicted with `MASTER.md`.
   - The secondary file described a different visual direction, including glassmorphism, gradients, and a broader "cinematic" language that did not match the approved SSOT.
   - Resolution applied: `DESIGN.MD` was reduced to a pointer to `MASTER.md`.

2. The branch was not build-safe for Vercel validation.
   - `/forgot-password` and `/register` were instantiating the Supabase browser client during render, which forced `NEXT_PUBLIC_SUPABASE_*` variables during static prerender.
   - Resolution applied: the client creation was moved into the submit handlers of both auth forms, preserving behavior while allowing `next build` to complete locally.

### Important inconsistencies

1. Task 28 mentions `landing.md`, but the repository uses `public.md`.
   - In practice, the public-route spec was consolidated into a single file covering both `/` and `/rankings`.
   - Resolution applied: `public.md` and `README.md` now make that intent explicit.

2. The external reference screenshots described in Task Manager are not versioned inside `design-refs/`.
   - The repository contains `design-refs/README.md` with curated reference notes and generated mockups versioned in `design-system/`.
   - Impact: exact reproduction of the original reference collection is weaker, but this does not block Task 29.

### Expected divergences versus the current app

1. The current code still contains visual hardcodes that contradict the new spec.
   - Examples include `glass-sidebar`, `nav-item-active` with `rgba`/hex values in `src/app/globals.css`, and the current sidebar treatment in `src/components/layout/SidebarShell.tsx`.
   - Classification: expected follow-up for Task 29.

2. The public landing experience is not implemented yet.
   - The `/` route still redirects to `/login`, while `public.md` defines the future landing page.
   - Classification: expected follow-up for Tasks 40 and 41.

3. Pages such as payment, tournaments, and profile are not yet visually aligned with the new system.
   - Classification: expected follow-up for Tasks 33, 37, 42, and related implementation work.

## Objective validation

- `tasks.json` parses successfully.
- Task 28 exists and is marked as `done`.
- `DESIGN.MD` no longer competes with the master spec.
- `public.md` remains the public-routes spec without introducing a duplicate `landing.md`.
- `npm ci` completed successfully.
- `npm run build` completed successfully.
- `npm test` completed successfully with 34 test files and 274 tests passing.

## Conclusion

Task 28 is coherent as a documentation foundation for the redesign as long as `MASTER.md` is treated as the only normative design reference. The main remaining gaps are implementation gaps in the application code, which belong to later tasks rather than this documentation task itself.
