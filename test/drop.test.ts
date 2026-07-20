// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// drop.test.ts — dropStory + composerStory, the two UI WRITES past the button.
//
// dropStory's CLAIM: a drop LAYS one beat and nothing else — after dropping A onto
// B with the depends-on bucket, dependsOn(A)/dependentsOf(B) read the edge back; the
// membership bucket lays NO lateral edge, only the caller's place(). composerStory's
// CLAIM: submit lays exactly the beat the closure specifies, then clears the field.
// jsdom only — these touch real DOM events; the laws under them are pure society reads.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsOnto } from "../src/society.js";
import { dependsOn, dependentsOf } from "../src/strain.js";
import { reactionsOn } from "../src/pathos.js";
import { dropStory, relateBuckets, composerStory, reactionStory, type ModeArm } from "../src/stories.js";

// test-owned taste: dropStory's default card render needs a modeArm (the mode-copy is
// caller-supplied, not scher-hardcoded — see stories.ts CardStoryParams.modeArm). These
// tests don't care about the copy's content, just that structure renders; keep it plain.
const testModeArm: ModeArm = (v) => document.createTextNode(v.mode);

/** a drag from `a`: a DragEvent carrying `a` in a stub dataTransfer (jsdom has none). */
function dropEvent(a: string): Event {
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  (ev as unknown as { dataTransfer: DataTransfer }).dataTransfer = {
    getData: () => a,
    setData: () => {},
  } as unknown as DataTransfer;
  return ev;
}

function society() {
  return new Society([
    { slug: "a", content: "task a", subject: null, object: null },
    { slug: "b", content: "task b", subject: null, object: null },
  ]);
}

describe("dropStory — a drop is a reading", () => {
  it("edge bucket: dropping A onto B lays the edge dependsOn/dependentsOf read back", () => {
    const soc = society();
    let placed = false;
    const lane = dropStory(soc, {
      targets: ["b"],
      buckets: relateBuckets(() => { placed = true; }),
      modeArm: testModeArm,
    }) as HTMLElement;

    // the target card is the lane's only child. Drop A onto it → the picker blooms.
    const card = lane.firstElementChild as HTMLElement;
    card.dispatchEvent(dropEvent("a"));
    const picker = card.querySelector(".drop-picker")!;
    expect(picker).toBeTruthy();

    // choose the "Depends On" (edge) bucket — the FIRST button.
    const depBtn = picker.querySelector(".drop-edge") as HTMLButtonElement;
    depBtn.click();

    // the CLAIM: the lateral edge is now readable, both ways. Nothing else was laid.
    expect(dependsOn(soc, "a")).toEqual(["b"]);
    expect(dependentsOf(soc, "b")).toEqual(["a"]);
    expect(placed).toBe(false);                    // membership place() was NOT called
    // and the picker tore itself down — it was a reading of the drop, not stored state.
    expect(card.querySelector(".drop-picker")).toBeNull();
  });

  it("membership bucket: lays NO lateral edge — only the caller's place() runs", () => {
    const soc = society();
    const calls: Array<[string, string]> = [];
    const lane = dropStory(soc, {
      targets: ["b"],
      buckets: relateBuckets((_s, a, b) => calls.push([a, b])),
      modeArm: testModeArm,
    }) as HTMLElement;

    const card = lane.firstElementChild as HTMLElement;
    card.dispatchEvent(dropEvent("a"));
    const memBtn = card.querySelector(".drop-membership") as HTMLButtonElement;
    memBtn.click();

    expect(calls).toEqual([["a", "b"]]);           // place() got (a, b)
    // membership lays NO q-depends-on (or any lateral edge): betweenness is caller-owned.
    expect(dependsOn(soc, "a")).toEqual([]);
    expect(prehensionsOnto(soc, "b", "q-depends-on")).toEqual([]);
  });

  it("a card can't relate to itself: dropping B onto B is inert", () => {
    const soc = society();
    const lane = dropStory(soc, { targets: ["b"], buckets: relateBuckets(() => {}), modeArm: testModeArm }) as HTMLElement;
    const card = lane.firstElementChild as HTMLElement;
    card.dispatchEvent(dropEvent("b"));             // same slug as the target
    expect(card.querySelector(".drop-picker")).toBeNull();  // no picker even blooms
  });
});

describe("composerStory — the conjugate of the button", () => {
  it("submit lays the beat the closure specifies, then clears the field", () => {
    const soc = new Society();
    const node = composerStory(soc, {
      submit: (s, text) => s.lay({ slug: `note-${text}`, content: text, subject: null, object: null }),
    }) as HTMLElement;

    const input = node.querySelector(".composer-input") as HTMLInputElement;
    const btn = node.querySelector(".composer-submit") as HTMLButtonElement;

    input.value = "  hello world  ";               // leading/trailing space → trimmed
    btn.click();

    expect(soc.get("note-hello world")?.content).toBe("hello world");
    expect(input.value).toBe("");                  // the transient draft cleared
  });

  it("an empty (or whitespace-only) field is inert — submit lays nothing", () => {
    const soc = new Society();
    let calls = 0;
    const node = composerStory(soc, { submit: () => { calls++; } }) as HTMLElement;
    const input = node.querySelector(".composer-input") as HTMLInputElement;
    const btn = node.querySelector(".composer-submit") as HTMLButtonElement;

    input.value = "   ";
    btn.click();
    expect(calls).toBe(0);
    expect(soc.size).toBe(0);
  });

  it("Enter submits, just like the button", () => {
    const soc = new Society();
    const node = composerStory(soc, {
      submit: (s, text) => s.lay({ slug: text, content: text, subject: null, object: null }),
    }) as HTMLElement;
    const input = node.querySelector(".composer-input") as HTMLInputElement;
    input.value = "via-enter";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(soc.has("via-enter")).toBe(true);
    expect(input.value).toBe("");
  });
});

describe("reactionStory + reactionsOn — a typed prehension by a standpoint", () => {
  function withBeat() {
    return new Society([{ slug: "post", content: "a post", subject: null, object: null }]);
  }

  it("press lays a q-feel from the target onto a lazily-minted emoji-node, plus the lay_authorship testimony pair, read by reactionsOn", () => {
    const soc = withBeat();
    const btn = reactionStory(soc, { target: "post", by: "ann", emoji: "🔥" }) as HTMLButtonElement;
    expect(reactionsOn(soc, "post")).toEqual([]);

    btn.click();                                   // ann reacts 🔥
    expect(reactionsOn(soc, "post")).toEqual([{ key: "🔥", count: 1, by: ["ann"] }]);
    // EMOJI-AS-NODE, the final q-feel ruling (Hallie, "story-emoji-as-node", 2026-07-20):
    // the q-feel edge is subject=post, object=the lazily-minted emoji-node (its own
    // content carries the glyph). AUTHORSHIP RECONCILIATION (same day): the reactor is
    // who LAID the feel — set on the q-feel row's OWN laid_by column, plus the
    // gen4-policy-mirrored testimony pair (laid-{slug}-by-{layer} node + ~lays~ edge
    // co-prehending q-authorship) — never a q-utterance row (that idiom stays reserved
    // for comments/speech).
    const feel = soc.get("feel-ann-🔥-post");
    expect(feel).toMatchObject({ subject: "post", object: "emoji-🔥", laid_by: "ann" });
    const emojiNode = soc.get("emoji-🔥");
    expect(emojiNode?.content).toBe("🔥");
    const authorshipNode = soc.get("laid-feel-ann-🔥-post-by-ann");
    expect(authorshipNode).toBeDefined();
    const authorshipEdge = soc.get("laid-feel-ann-🔥-post-by-ann~lays~feel-ann-🔥-post");
    expect(authorshipEdge).toMatchObject({ subject: "laid-feel-ann-🔥-post-by-ann", object: "feel-ann-🔥-post" });
  });

  it("press-again supersedes my own reaction (append-only un-react)", () => {
    const soc = withBeat();
    const btn = reactionStory(soc, { target: "post", by: "ann", emoji: "🔥" }) as HTMLButtonElement;
    btn.click();                                   // react
    expect(reactionsOn(soc, "post")[0].count).toBe(1);
    btn.click();                                   // un-react → supersede
    expect(reactionsOn(soc, "post")).toEqual([]);  // the read drops the superseded feel
    expect(soc.has("feel-ann-🔥-post")).toBe(true); // …but it stays in ink (append-only)
  });

  it("reactionsOn aggregates distinct standpoints' feels of the same emoji", () => {
    const soc = withBeat();
    (reactionStory(soc, { target: "post", by: "ann", emoji: "🔥" }) as HTMLButtonElement).click();
    (reactionStory(soc, { target: "post", by: "bo", emoji: "🔥" }) as HTMLButtonElement).click();
    expect(reactionsOn(soc, "post")).toEqual([{ key: "🔥", count: 2, by: ["ann", "bo"] }]);
  });
});
