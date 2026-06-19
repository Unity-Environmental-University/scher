# scher

A small, dependency-free reactive component library for the browser. Written in
TypeScript. The core idea: **a view is a reading of state, re-observed.** State is an
append-only society of facts; a value is not stored but read; "undo" is an append, not
an erasure. You build a component from a few primitives — a card, a button, a toggle, a
modal, a clamp (a thing that contains other things), a gist (a thing told short). The
glossary in `src/glossary.html` demonstrates each one and shows the code beside it.

## The name

**Scher** is short for **Scheherazade** (also written *Shahrāzād*), and it carries the
word *share*.

Scheherazade is the storyteller of the *One Thousand and One Nights*. In the frame tale,
a king who has been betrayed takes a new wife each night and has her killed at dawn.
Scheherazade marries him by her own choosing and, each night, tells him a story — but
she does not finish it before morning. To hear the end, the king lets her live another
day. She does this for a thousand nights and one, and by the end he no longer wants her
dead. She survives, and saves the women who would have come after her, by keeping the
story open.

We named the library for her because that is what it does: it keeps the story open. Work
in it is never overwritten, only added to; nothing is forced to a final close; every
ending can become a new beginning. A library built on that idea should carry the name of
the woman who first understood it.

We also named it for where she comes from. The *Nights* are one of the deep gifts of
Persian storytelling, and Persia — Iran — has a long and rich literary history. We wanted
a piece of working software to quietly point at that.

## Build

```bash
npm install
npm run build      # tsc → dist/
```

Then open `src/glossary.html` (served over http, e.g. `python3 -m http.server`) to see
the components live, each beside the code that builds it.

## License

MIT. Copyright (c) 2026 Unity Environmental University. See [LICENSE](LICENSE).
