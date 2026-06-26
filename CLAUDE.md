# Working in scher

Before writing code here, read **QUERIES.md** and hold it. The short of it: write only
what's needed, reuse what exists, say it plainly, make every line honest — and aim at
*honest*, not *short* (a long thing that's true and needed stays).

Tests live in `test/`. The `*.play.test.ts` files are the dollhouse — see `test/PLAY.md`.
They're load-bearing regression tests AND fun; don't prune them for length, they're needed
for trust. Run: `cd scher && npm test`.

The one discipline that bites if forgotten: **opaque slugs, no string-matching.** A reading
is a node; read structure with `prehensionsFrom`/`prehensionsOnto`, never by parsing a slug.
Splitting a slug to get meaning out is smuggling substance into a name — the thing the grammar
refuses.
