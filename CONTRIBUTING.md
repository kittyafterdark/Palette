# Contributing to Palette

Thanks for helping improve Palette.

Palette is an independent Lumiverse community extension. Keep changes extension-side and use public Spindle/native metadata where possible; do not introduce private React/store hooks merely to avoid a difficult selector or layout problem.

## Setup

```bash
bun install
bun run verify
```

`verify` runs type checking, tests, and rebuilds `dist/`.

## Ground rules

- Semantic project state is canonical; generated CSS is compiler output.
- DOM-only styling remains a supported first-class path when native metadata is absent.
- Prefer the narrowest stable selector that expresses the actual visual owner.
- Do not reparent React-owned DOM for Layout Groups.
- Read/inspection should stay lazy: only user edits become authored state.
- Pack recipes should use ordinary Palette targets/packets/groups rather than bypassing the editor with one-off CSS.
- Mobile is a first-class authoring target.

## Before opening a PR

1. Run `bun run verify`.
2. Confirm `dist/` is rebuilt and committed with source changes.
3. Smoke-test the affected mounted Lumiverse surface on desktop and mobile when practical.
4. If persistence changes, add/update migration coverage and bump the schema deliberately.
5. Update `CHANGELOG.md` for public-facing changes. Put implementation archaeology under `docs/development/` instead of turning the README into a running lab notebook.

See `GUIDE.md` for product behavior and `docs/development/` for implementation receipts.
