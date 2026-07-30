# scher under a bundler

Proof that scher consumes cleanly with a bundler — bare specifiers, no aliases,
no `dist/` paths, no pre-bundle exclusions. `vite.config.js` is deliberately
empty of scher-specific workarounds: if one is ever needed here, that is a bug
in scher's `exports`, and this example is where it shows up.

```bash
npm install && npm run dev
```

This example is NOT part of the library build. scher itself stays `tsc`-only
(see ARCHITECTURE.md); this only demonstrates the consumer side.

Set `build.sourcemap: true` in your own app — a bundle with sourcemaps stays as
readable as raw modules in devtools, which is most of what "the source is the
artifact" was protecting.
