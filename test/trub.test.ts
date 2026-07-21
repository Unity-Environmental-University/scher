// trub.test.ts — q-fixes IS the trub marker (plain because never makes a log);
// a hook is ANGRY iff no climb from it reaches a wish (grounding/holding/End hops).

import { describe, it, expect } from "vitest";
import { Society, unpackPoles, layCharge } from "../src/society.js";
import { Q_FIXES, isTrubLog, trubHooksOf, trubHookIsAngry } from "../src/trub.js";

function node(soc: Society, slug: string, title?: string) {
  soc.lay({ slug, content: title ?? slug, title: title ?? null, subject: null, object: null });
}

describe("q-fixes marks a trub log", () => {
  it("a plain because-grounded todo is NOT a trub log", () => {
    const soc = new Society();
    node(soc, "log");
    node(soc, "todo");
    soc.layP("todo-because-log", "todo because log", "todo", "log", "q-grounding");
    expect(isTrubLog(soc, "log")).toBe(false);
    expect(trubHooksOf(soc, "log")).toEqual([]);
  });

  it("q-fixes makes it a trub log; hook is the subject", () => {
    const soc = new Society();
    node(soc, "log");
    node(soc, "hook");
    soc.layP("hook-fixes-log", "hook fixes log", "hook", "log", Q_FIXES);
    expect(isTrubLog(soc, "log")).toBe(true);
    expect(trubHooksOf(soc, "log")).toEqual(["hook"]);
  });

  it("occluding the q-fixes edge un-marks the log", () => {
    const soc = new Society();
    node(soc, "log");
    node(soc, "hook");
    node(soc, "fr");
    soc.layP("hook-fixes-log", "hook fixes log", "hook", "log", Q_FIXES);
    soc.layP("occ", "drop it", "fr", "hook-fixes-log", "q-occludes");
    expect(isTrubLog(soc, "log")).toBe(false);
    expect(trubHooksOf(soc, "log")).toEqual([]);
  });
});

describe("trubHookIsAngry", () => {
  it("a hook that grounds straight into a wish-shaped beat is NOT angry", () => {
    const soc = new Society();
    node(soc, "hook");
    node(soc, "wish", "User Story: fix the thing");
    soc.layP("hook-because-wish", "hook because wish", "hook", "wish", "q-grounding");
    expect(trubHookIsAngry(soc, "hook")).toBe(false);
  });

  it("a hook that grounds into nothing wish-shaped IS angry", () => {
    const soc = new Society();
    node(soc, "hook");
    node(soc, "plain-todo", "just a todo");
    soc.layP("hook-because-plain", "hook because plain", "hook", "plain-todo", "q-grounding");
    expect(trubHookIsAngry(soc, "hook")).toBe(true);
  });

  it("a hook is not angry if held by something wish-shaped (bare edge onto it)", () => {
    const soc = new Society();
    node(soc, "hook");
    node(soc, "wish", "Wish: someday");
    soc.lay({ slug: "wish-holds-hook", content: "wish holds hook", subject: "wish", object: "hook" });
    expect(trubHookIsAngry(soc, "hook")).toBe(false);
  });

  it("a hook is not angry if it is a designated sublime-pole itself", () => {
    const soc = new Society();
    node(soc, "hook");
    node(soc, "sub");
    soc.layP("hook-sublime", "hook is a sublime", "sub", "hook", "q-sublime-pole");
    expect(trubHookIsAngry(soc, "hook")).toBe(false);
  });

  it("a hook reaches a wish via its story's End (q-end-pole hop)", () => {
    const soc = new Society();
    node(soc, "story", "Story: the umbrella");
    const u = unpackPoles(soc, "story");
    node(soc, "hook");
    layCharge(soc, "story", "hook");
    // (b) hook -> end via bare edge, then (c) end -> story (the wish) via End-pole hop.
    soc.lay({ slug: "hook-onto-end", content: "hook touches end", subject: "hook", object: u.end });
    expect(trubHookIsAngry(soc, "hook")).toBe(false);
  });

  it("cycle-safe: a because-cycle with no wish terminates and reads angry", () => {
    const soc = new Society();
    node(soc, "a");
    node(soc, "b");
    soc.layP("a-because-b", "a because b", "a", "b", "q-grounding");
    soc.layP("b-because-a", "b because a", "b", "a", "q-grounding");
    expect(trubHookIsAngry(soc, "a")).toBe(true);
  });
});
