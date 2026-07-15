// ─────────────────────────────────────────────────────────────────────────────
// assignees.test.ts — assigneesOf reads the q-assigned-to QUALITY grammar
// (card --q-assigned-to--> actor), not a slug shape. The CLAIMS: the read
// returns the actor beats of non-occluded assignment prehensions; occluding an
// assignment (reassignment-away) removes that actor with no delete; the old
// `<card>-asn-<who>` slug grammar is dead (checked against every live store,
// 2026-07-03 — it had never once been laid) and is deliberately NOT read.
// Shape mirrors the real gen3 play data (play-assign-1 → alice/bob/carol).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { assigneesOf } from "../src/strain.js";

function board() {
  const soc = new Society([
    { slug: "card-1", content: "a task", subject: null, object: null },
    { slug: "actor-alice", content: "alice", subject: null, object: null },
    { slug: "actor-bob", content: "bob", subject: null, object: null },
    { slug: "actor-carol", content: "carol", subject: null, object: null },
  ]);
  soc.layP("card-1-to-alice", "assigned to alice", "card-1", "actor-alice", "q-assigned-to");
  soc.layP("card-1-to-bob", "assigned to bob", "card-1", "actor-bob", "q-assigned-to");
  return soc;
}

describe("assigneesOf — the q-assigned-to quality read", () => {
  it("returns the actors of live assignment prehensions", () => {
    const soc = board();
    expect(assigneesOf(soc, "card-1").sort()).toEqual(["actor-alice", "actor-bob"]);
    expect(assigneesOf(soc, "card-2")).toEqual([]); // unknown card: empty, not an error
  });

  it("occluding an assignment un-assigns without deleting (reassignment)", () => {
    const soc = board();
    // reassign bob → carol: lay carol's edge, occlude bob's. Nothing leaves the log.
    soc.layP("card-1-to-carol", "reassigned to carol", "card-1", "actor-carol", "q-assigned-to");
    soc.lay({ slug: "reassign-note", content: "bob rolled off", subject: null, object: null });
    soc.layP("reassign-occ", "carol replaces bob", "reassign-note", "card-1-to-bob", "q-occludes");
    expect(assigneesOf(soc, "card-1").sort()).toEqual(["actor-alice", "actor-carol"]);
  });

  it("does NOT read the dead slug grammar", () => {
    const soc = new Society([
      { slug: "card-9", content: "a task", subject: null, object: null },
      // the old shape: `<card>-asn-<who>` slug, `actor-` object, no quality beat.
      { slug: "card-9-asn-dave", content: "old-style", subject: "card-9", object: "actor-dave" },
    ]);
    expect(assigneesOf(soc, "card-9")).toEqual([]); // break forward: no shim for a corpse
  });
});
