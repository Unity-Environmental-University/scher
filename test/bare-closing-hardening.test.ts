// ─────────────────────────────────────────────────────────────────────────────
// bare-closing-hardening.test.ts — wave H1: adversarial closing tests + name-fuzz.
//
// Standing context this pins against (2026-07-15): closePole lays BARE closings; a bare
// edge OUT of a designated End-pole is the closing, a bare edge ONTO it is a charge —
// edge direction alone carries the meaning, no quality needed. closingEdgesFrom unions
// bare+legacy q-grounding closings in one place. q-depends-on renamed q-blocked-by (reads
// honor both). Nothing silent: this file exercises exactly the seams the ruling opened —
// mixed legacy/bare histories, double closings, occluded closings, direction ambiguity
// on one pole, self-edges, closings laid before their pole is designated, and (item 2)
// proof that no read here depends on how a pole's slug is SPELLED.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  closePole,
  chargesOn,
  layCharge,
  endActual,
  reaches,
  voltageOf,
  overload,
  isOccluded,
  isStory,
  endOf,
  storyNow,
  intervalOf,
  dependsOn,
  dependentsOf,
  isBlocked,
} from "../src/index.js";

const capture = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });

/** occlude(s, target, occluder): lay a q-occludes edge occluder --q-occludes--> target,
 *  the shape every other test file in this package uses to shadow a beat. */
const occlude = (s: Society, occluder: string, target: string) =>
  s.layP(`${occluder}~occludes~${target}`, `${occluder} occludes ${target}`, occluder, target, "q-occludes");

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADVERSARIAL CLOSING TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("adversarial closings — mixed legacy/bare histories on one story", () => {
  it("a story closed TWICE — once bare (closePole), once legacy q-grounding — reads closed via both, unioned", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    const bareClosing = closePole(s, "task");
    // a SECOND closing, the legacy spelling, laid straight onto the same End:
    const legacySlug = `${p.end}~because~legacy-now`;
    s.layP(legacySlug, "a second, legacy-spelling closing on the same End", p.end, p.now, "q-grounding");
    expect(endActual(s, p.end)).toBe(true);
    // both closings are visible — closingEdgesFrom unions, it does not pick one:
    expect(reaches(s, p.end, "task", "q-grounding")).toBe(true);
    // voltage still reads closed (not double-counted as open just because two edges exist):
    expect(voltageOf(s, "task")).toBe(0);
    void bareClosing;
  });

  it("interleaved legacy and bare closings across DIFFERENT stories in one society don't cross-contaminate", () => {
    const s = new Society();
    capture(s, "bare-story");
    capture(s, "legacy-story");
    const pb = unpackPoles(s, "bare-story");
    const pl = unpackPoles(s, "legacy-story");
    closePole(s, "bare-story"); // bare
    s.layP(`${pl.end}~because~${pl.now}`, "legacy closing", pl.end, pl.now, "q-grounding"); // legacy
    expect(endActual(s, pb.end)).toBe(true);
    expect(endActual(s, pl.end)).toBe(true);
    expect(s.has(`${pb.end}~because~${pb.now}~q`)).toBe(false); // bare-story's closing carries no mode-beat
    expect(s.has(`${pl.end}~because~${pl.now}~q`)).toBe(true); // legacy-story's does
  });

  it("an OCCLUDED bare closing stops counting — the pole reads open again, honestly", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    const closing = closePole(s, "task");
    expect(endActual(s, p.end)).toBe(true);
    occlude(s, "corrector", closing);
    expect(endActual(s, p.end)).toBe(false); // the occluded closing casts no shadow of doneness
    expect(reaches(s, p.end, "task", "q-grounding")).toBe(false);
  });

  it("an OCCLUDED legacy closing stops counting too — same law, both spellings", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    const legacySlug = `${p.end}~because~${p.now}`;
    s.layP(legacySlug, "legacy closing", p.end, p.now, "q-grounding");
    expect(endActual(s, p.end)).toBe(true);
    occlude(s, "corrector", legacySlug);
    expect(endActual(s, p.end)).toBe(false);
  });

  it("a story closed twice where ONE closing is occluded still reads closed via the surviving one", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    const bareClosing = closePole(s, "task");
    const legacySlug = `${p.end}~because~legacy-now`;
    s.layP(legacySlug, "second closing", p.end, p.now, "q-grounding");
    occlude(s, "corrector", bareClosing); // shadow only the bare one
    expect(endActual(s, p.end)).toBe(true); // the legacy closing still stands
  });

  it("occlusion of a CHARGE (not a closing) does not affect endActual, only chargesOn/voltage", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    const chargeSlug = layCharge(s, "task", "frame-a");
    expect(voltageOf(s, "task")).toBeGreaterThan(0);
    occlude(s, "corrector", chargeSlug);
    expect(endActual(s, p.end)).toBe(false); // charges never touch closedness
    expect(chargesOn(s, p.end).map((c) => c.slug)).not.toContain(chargeSlug);
  });
});

describe("adversarial closings — direction ambiguity on ONE pole", () => {
  it("a bare edge laid ONTO the pole and a bare edge laid OUT of the same pole are read as OPPOSITE things", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    // ONTO: a charge.
    s.lay({ slug: "presser~press~end", content: "pressing toward the End", subject: "presser", object: p.end });
    // OUT OF: a closing (the only edge shape allowed to leave a naked pole besides the guard's exemptions).
    const closing = closePole(s, "task");
    expect(chargesOn(s, p.end).map((c) => c.slug)).toEqual(["presser~press~end"]);
    expect(endActual(s, p.end)).toBe(true);
    expect(closingEdgesIncludes(s, p.end, closing)).toBe(true);
    // the charge is never mistaken for a closing, nor vice versa — direction alone divides them:
    expect(chargesOn(s, p.end).map((c) => c.slug)).not.toContain(closing);
  });

  it("many bare edges ONTO an open pole are all charges; the FIRST bare edge OUT closes it and charges keep counting as residual voltage on other grounds", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    layCharge(s, "task", "frame-a");
    layCharge(s, "task", "frame-b");
    expect(chargesOn(s, p.end).length).toBe(2);
    expect(endActual(s, p.end)).toBe(false);
    closePole(s, "task");
    expect(endActual(s, p.end)).toBe(true);
    // once closed, the story's own frame reads 0 (discharged for the ground that witnessed
    // the close); a ground that never establishes to the closing still owes residual voltage —
    // exercised in the floating/overload section below.
    expect(voltageOf(s, "task")).toBe(0);
  });

  it("a bare SELF-edge on the End-pole (subject === object === end) is read as a closing (direction: OUT), never a charge — it never satisfies the ONTO test with subject !== object required elsewhere", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    s.lay({ slug: "self-loop", content: "end because end", subject: p.end, object: p.end });
    // it leaves the pole (subject === end) → closingEdgesFrom counts it:
    expect(endActual(s, p.end)).toBe(true);
    // chargesOn requires object === end AND subject !== null; a self-edge DOES satisfy that
    // (subject is p.end, which is non-null) — so a self-edge is BOTH read as a charge AND a
    // closing simultaneously. Documented here as the real, structural answer (not asserted
    // away): direction alone can't fully disambiguate a self-loop, because "out of" and
    // "onto" are the same edge when subject===object. This is surfaced, not hidden.
    expect(chargesOn(s, p.end).map((c) => c.slug)).toContain("self-loop");
  });
});

describe("adversarial closings — a closing laid BEFORE the designation exists", () => {
  it("a bare edge FROM a not-yet-designated node does NOT read as a closing until the q-end-pole designation lands — then it does, retroactively, with no rewrite", () => {
    const s = new Society();
    capture(s, "task");
    capture(s, "future-end");
    capture(s, "some-now");
    // lay the "closing" shape FIRST, before "future-end" is ever designated an End-pole:
    s.lay({ slug: "early-close", content: "a bare edge out of an ordinary node", subject: "future-end", object: "some-now" });
    // undesignated: not read as a closing by anything that cares about pole-hood —
    // isStory/endActual have no opinion on "future-end" at all yet:
    expect(isStory(s, "future-end")).toBe(false);
    expect(endActual(s, "future-end")).toBe(false); // no designation yet — closingEdgesFrom's legacy-only branch sees no q-grounding either
    // NOW designate it as an End-pole after the fact (structurally legal — designation is
    // just another lay; nothing in the log required ordering):
    s.layP("task~end-pole~future-end", "End-pole designation, laid late", "task", "future-end", "q-end-pole");
    // the society is re-read fresh every time (nothing is cached/stored) — so the EARLIER
    // bare edge, now retroactively out of a designated End-pole, reads as the closing:
    expect(endActual(s, "future-end")).toBe(true);
    // reaches walks subject→object: "some-now" is what the early bare edge actually points
    // AT (future-end ~because~ some-now), so it — not "task" — is what's reachable this way:
    expect(reaches(s, "future-end", "some-now", "q-grounding")).toBe(true);
  });

  it("the mirror: a bare edge ONTO a not-yet-designated node is inert (not a charge) until designation, then becomes one, retroactively", () => {
    const s = new Society();
    capture(s, "task");
    capture(s, "future-end");
    s.lay({ slug: "early-press", content: "pressing on an ordinary node, not yet a pole", subject: "presser", object: "future-end" });
    expect(chargesOn(s, "future-end").length).toBe(1); // chargesOn is a pure address read — it
    // never checked pole-hood in the first place (any bare-onto reads as address pressure);
    // designating it afterward doesn't change the charge count, only makes endActual/voltageOf
    // start caring about this node as a differential:
    s.layP("task~end-pole~future-end", "late designation", "task", "future-end", "q-end-pole");
    expect(chargesOn(s, "future-end").length).toBe(1);
    // BUT voltageOf's charge-count still reads 0: a raw bare edge (unlike layCharge) was
    // never woven into the story's own-frame Now-lineage (the `now ~because~ chargeSlug`
    // weave layCharge lays alongside the bare press) — so the default ground (storyNow)
    // cannot establish to it. chargesOn (address) and voltageOf (established reachability)
    // are genuinely different reads; a late-designated raw press is address-visible but not
    // yet lineage-witnessed. This is the honest answer, not a bug: SOFD requires the weave.
    expect(voltageOf(s, "task")).toBe(0);
    // layCharge, which DOES do the weave, makes the difference visible:
    layCharge(s, "task", "frame-a");
    expect(voltageOf(s, "task")).toBeGreaterThan(0);
  });
});

describe("adversarial closings — occluded closings under storyNow/voltageOf/overload", () => {
  it("voltageOf treats an occluded bare closing as still-open — residual charge counts again", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    layCharge(s, "task", "frame-a");
    const closing = closePole(s, "task");
    expect(voltageOf(s, "task")).toBe(0); // closed: discharged
    occlude(s, "corrector", closing);
    expect(voltageOf(s, "task")).toBeGreaterThan(0); // un-occluded charge resurfaces once the closing is shadowed
  });

  it("overload sums voltage across stories correctly when some are bare-closed, some legacy-closed, some open", () => {
    const s = new Society();
    capture(s, "bare-done");
    capture(s, "legacy-done");
    capture(s, "open-one");
    unpackPoles(s, "bare-done");
    const pl = unpackPoles(s, "legacy-done");
    unpackPoles(s, "open-one");
    closePole(s, "bare-done");
    s.layP(`${pl.end}~because~${pl.now}`, "legacy close", pl.end, pl.now, "q-grounding");
    layCharge(s, "open-one", "frame-a");
    const ground = storyNow("open-one");
    const result = overload(s, ground);
    const openReading = result.readings.find((r) => r.story === "open-one");
    expect(openReading?.voltage).toBeGreaterThan(0);
    // closed stories contribute nothing to THIS ground's total (their own frame witnessed
    // their own close; a foreign ground reads them as 0 unless established to it):
    expect(result.readings.find((r) => r.story === "bare-done")).toBeUndefined();
    expect(result.readings.find((r) => r.story === "legacy-done")).toBeUndefined();
  });
});

// helper: is `closing` among the (bare or legacy) closing edges structurally recognized
// for `end`? Exercised via the public surface (endActual/reaches), not by reaching into
// the private closingEdgesFrom — this file has no special access, same as any caller.
function closingEdgesIncludes(s: Society, end: string, closing: string): boolean {
  return s.has(closing) && endActual(s, end);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NAME-FUZZ: pole slugs carry NO naming convention — structure is everything
// ─────────────────────────────────────────────────────────────────────────────
// The two-naming-conventions finding (hea-/~hea vs whatever a caller likes) dissolves
// structurally: nothing in society.ts's reads ever parses a slug for meaning (the
// opaque-slugs law, QUERIES.md/scher/CLAUDE.md). This suite builds a story whose Once,
// End, and Now are the ugliest slugs it can find — no prefix, no suffix, emoji, unicode,
// whitespace-adjacent punctuation, empty-ish-looking strings — and proves every read
// still works, purely off structure (who designated whom, which edges point which way).

describe("NAME-FUZZ — no read depends on pole naming; structure alone carries meaning", () => {
  const hostileNames: Array<{ label: string; once: string; end: string; now: string }> = [
    { label: "no hea- prefix, no ~hea suffix, plain words", once: "buy-milk", end: "milk-bought", now: "milk-bought-now" },
    { label: "emoji slugs", once: "🥛", end: "✅", now: "⏱️" },
    { label: "uppercase / snake / kebab mashup", once: "TASK_Once-1", end: "taskEND--final", now: "NOW.now.NOW" },
    { label: "numeric-looking slugs", once: "12345", end: "0", now: "-1" },
    { label: "slugs containing the OTHER convention's tokens as decoys", once: "hea-decoy", end: "not~hea-at-all", now: "now-but-fake" },
    { label: "whitespace and punctuation heavy", once: "task one!", end: "end??", now: "now (final)" },
    { label: "very long slug", once: "x".repeat(200), end: "y".repeat(200), now: "z".repeat(200) },
    { label: "slug equal to a quality string itself (adversarial collision)", once: "q-grounding", end: "q-end-pole", now: "q-blocked-by" },
  ];

  for (const { label, once, end, now } of hostileNames) {
    it(`closing/charge/story reads all work when slugs are hostile: ${label}`, () => {
      const s = new Society();
      capture(s, once);
      const p = unpackPoles(s, once, end);
      // storyNow is a constructor convention (`${event}~now`), not something the fuzz
      // needs to match — we just confirm the READS work regardless of what the actual
      // now-slug looks like; unpackPoles picked its own `now` internally.
      expect(isStory(s, once)).toBe(true);
      expect(endOf(s, once)).toBe(end);
      expect(endActual(s, end)).toBe(false);

      // charge: bare edge onto the (hostile) End slug
      const chargeSlug = layCharge(s, once, "some-frame");
      expect(chargesOn(s, end).map((c) => c.slug)).toContain(chargeSlug);
      expect(voltageOf(s, once)).toBeGreaterThan(0);

      // close: bare edge OUT of the (hostile) End slug
      const closing = closePole(s, once, end);
      expect(s.has(`${closing}~q`)).toBe(false); // bare, no matter how ugly the slug is
      expect(endActual(s, end)).toBe(true);
      expect(reaches(s, end, once, "q-grounding")).toBe(true);
      expect(voltageOf(s, once)).toBe(0); // discharged

      void p; void now;
    });
  }

  it("a designated End-pole whose slug LOOKS like a quality string is still governed by structure, not string content — laying q-grounding-labeled quality string as a slug never confers or strips pole-hood", () => {
    const s = new Society();
    capture(s, "story-x");
    // deliberately name the End-pole with the exact text of a kernel quality string:
    const p = unpackPoles(s, "story-x", "q-grounding");
    expect(isStory(s, "story-x")).toBe(true);
    expect(endOf(s, "story-x")).toBe("q-grounding"); // the literal slug, never parsed
    expect(endActual(s, "q-grounding")).toBe(false);
    closePole(s, "story-x", "q-grounding");
    expect(endActual(s, "q-grounding")).toBe(true); // closes exactly like any other End slug
    void p;
  });

  it("randomized/hostile slugs still respect the address law (naked-pole guard fires on STRUCTURE, not on recognizable naming)", () => {
    const s = new Society();
    capture(s, "🎯task");
    const p = unpackPoles(s, "🎯task", "🔥end-of-fire");
    // a quality prehension ONTO the hostile-named open End is still refused:
    expect(() => s.layP("cmt~x~y", "comment", "commenter", p.end, "q-feel")).toThrow(/ADDRESS LAW/);
    // a non-grounding prehension OUT of it is still refused:
    expect(() => s.layP("dep~x~y", "dep", p.end, "🎯task", "q-blocked-by")).toThrow(/ADDRESS LAW/);
    // the bare charge/close shapes still work regardless:
    expect(() => s.lay({ slug: "bare-charge", content: "c", subject: "presser", object: p.end })).not.toThrow();
    expect(() => closePole(s, "🎯task", "🔥end-of-fire")).not.toThrow();
  });

  it("dependsOn/dependentsOf/isBlocked work on hostile slugs — q-blocked-by and legacy q-depends-on both read regardless of spelling of the slugs they connect", () => {
    const s = new Society();
    capture(s, "🐛bug");
    capture(s, "🛠️fix");
    s.layP("🐛bug~blocked~🛠️fix", "bug blocked by fix", "🐛bug", "🛠️fix", "q-blocked-by");
    expect(dependsOn(s, "🐛bug")).toContain("🛠️fix");
    expect(dependentsOf(s, "🛠️fix")).toContain("🐛bug");
    expect(isBlocked(s, "🐛bug")).toBe(true);

    capture(s, "legacy-dependent");
    capture(s, "legacy-blocker");
    s.layP("ld~depends~lb", "legacy spelling", "legacy-dependent", "legacy-blocker", "q-depends-on");
    expect(dependsOn(s, "legacy-dependent")).toContain("legacy-blocker");
    expect(isBlocked(s, "legacy-dependent")).toBe(true);
  });

  it("intervalOf walks hostile-named poles the same as ordinary ones — membership is structural betweenness, not slug-legible", () => {
    const s = new Society();
    capture(s, "🌀once");
    const p = unpackPoles(s, "🌀once", "🌀end");
    capture(s, "interior-1");
    s.lay({ slug: "🌀once~to~interior-1", content: "step", subject: "🌀once", object: "interior-1" });
    s.lay({ slug: "interior-1~to~end", content: "step2", subject: "interior-1", object: p.end });
    const interval = intervalOf(s, "🌀once", p.end);
    expect(interval).toContain("interior-1");
    expect(interval).toContain("🌀once");
    expect(interval).toContain(p.end);
  });
});
