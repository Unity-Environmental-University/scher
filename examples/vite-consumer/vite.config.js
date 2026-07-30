import { defineConfig } from "vite";

// scher ships raw ES modules with no runtime deps, so there is nothing to
// pre-bundle or exclude — this config is deliberately empty of scher-specific
// workarounds. If you ever NEED one here, that is a bug in scher's exports.
export default defineConfig({});
