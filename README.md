# scher

A small, dependency-free reactive component library for the browser. Written in
TypeScript. The core idea: **a view is a reading of state, re-observed.** State is an
append-only society of facts; a value is not stored but read; "undo" is an append, not
an erasure. You build a component from a few primitives — a card, a button, a toggle, a
modal, a clamp (a thing that contains other things), a gist (a thing told short). The
glossary in `src/glossary.html` demonstrates each one and shows the code beside it.

## The name

This library is named for Shahrazad, the Persian storyteller of 1001 Nights. Upon marrying the king, she told him stories each night that ended the next day and flowed into new stories so that he would not kill her.

And one day she told the story of herself, and the recursion nested one deeper.

Scher embraces the horizon that recedes from us and also the need the kings have to hear our stories, to give them the ends they need and let us keep telling them. 

Scher was originally written as a UI framework for Penelope, a process ontology based planning system. Penelope, who kept her suitors off for the years she waited for her husband Odysseus to return from Troy and a very long trip where he refused to stop for directions.

## Build

```bash
npm install
npm run build      # tsc → dist/
```

Then open `src/glossary.html` (served over http, e.g. `python3 -m http.server`) to see
the components live, each beside the code that builds it.

## License

MIT. Copyright (c) 2026 Unity Environmental University. See [LICENSE](LICENSE).
