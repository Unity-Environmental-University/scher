# scher

A small, dependency-free reactive component library for the browser. Written in
TypeScript. The core idea: **a view is a reading of state, re-observed.** State is an
append-only society of facts; a value is not stored but read; "undo" is an append, not
an erasure. You build a component from a few primitives — a card, a button, a toggle, a
modal, a frame (a story that contains its beats), a list, a gist (a thing told short). The
glossary in `src/glossary.html` demonstrates each one and shows the code beside it.

The same idea — **a reading is relative to a standpoint** — also runs underneath, as
*reference frames*: a timezone or a locale IS a frame a reader inherits from the system
default unless they establish their own (`frames.ts`). Now is relative; so is wording.

## The name

This library is named for Shahrazad, the Persian storyteller of 1001 Nights. Upon marrying the king, she told him stories each night that ended the next day and flowed into new stories so that he would not kill her.

And one day she told the story of herself, and the recursion nested one deeper.

Scher embraces the horizon that recedes from us and also the need the kings have to hear our stories, to give them the ends they need and let us keep telling them. 

Scher was originally written as a UI framework for Penelope, a process ontology based planning system. Penelope, who kept her suitors off for the years she waited for her husband Odysseus to return from Troy and a very long trip where he refused to stop for directions.

## Build

```bash
npm install
npm run build      # tsc → dist/
npm test           # property tests (vitest + fast-check)
```

Then open `src/glossary.html` (served over http, e.g. `python3 -m http.server`) to see
the components live, each beside the code that builds it.

## Tests

The process core is tested by its **invariants**, not by examples — property-based,
because an append-only model's laws *are* its spec. `npm test` generates arbitrary
histories and asserts: a lay never shrinks the log; reads depend on the *set* of beats,
not the order they arrived; undo is an append (the log only ever grows); a `Fact`'s
`get()` always equals the last `set()`; reference-frame inheritance holds. See `test/`.

## License

MIT. Copyright (c) 2026 Unity Environmental University. See [LICENSE](LICENSE).
