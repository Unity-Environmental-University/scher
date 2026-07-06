// ─────────────────────────────────────────────────────────────────────────────
// biography.play.test.ts — the biography read, tracking whether an author's work
// was heard and established. "What happened to MY work?" — an author's shadow
// trace indexed by author, surfacing in the READ layer where interpretive choice
// belongs (scher's settlement 2026-07-03, gen4's named gap).
//
// The read: biographyOf(author, ground?) — every event laid by the author, each
// assigned a HearingStatus (established / floating / occluded / superseded / charged)
// with holders. Composition of existing reads: laid_by + established_to + is_occluded
// + prehensions_onto + charges_on. No new quality, no kernel branch, no guard.
//
// DOLL STRATEGY: test the pure read's assembly logic against known structures,
// not full canon captures. Authorship parsing + status computations as independent
// checkers. The real authorship machinery lives in gen4-policy (laid_by, lay_authorship);
// this doll proves the six-status composition works.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  prehensionsOnto,
  isOccluded,
  chargesOn,
  endOf,
  establishedTo,
  biographyOf,
} from "../src/index.js";

describe("biographyOf", () => {
  /** Helper: lay an authorship node + ~lays~ edge co-prehending q-authorship.
   *  The authorship node follows the pattern "laid-{event}-by-{author}".
   *  The edge is author ~lays~ event, co-prehending q-authorship.
   */
  function layAuthorship(soc: Society, author: string, event: string): void {
    const authNode = `laid-${event}-by-${author}`;
    soc.lay({ slug: authNode, content: `${author} laid ${event}`, subject: null, object: null });
    const laysEdge = `${authNode}~lays~${event}`;
    soc.layP(laysEdge, "authorship", authNode, event, "q-authorship");
  }

  it("discovers and lists all events laid by an author", () => {
    const soc = new Society();

    const event1 = "event-0";
    const event2 = "event-1";
    soc.lay({ slug: event1, content: "first work", subject: null, object: null });
    soc.lay({ slug: event2, content: "second work", subject: null, object: null });

    layAuthorship(soc, "frame-alice", event1);
    layAuthorship(soc, "frame-alice", event2);

    const bio = biographyOf(soc, "frame-alice");
    expect(bio.length).toBe(2);
    expect(bio.map((e) => e.event).sort()).toEqual([event1, event2].sort());
    bio.forEach((e) => {
      expect(e.laid_by).toBe("frame-alice");
    });
  });

  it("marks events as floating if no frame reaches them", () => {
    const soc = new Society();

    const event1 = "event-0";
    soc.lay({ slug: event1, content: "unheard work", subject: null, object: null });
    layAuthorship(soc, "frame-bob", event1);

    const bio = biographyOf(soc, "frame-bob");
    const entry = bio.find((e) => e.event === event1);
    expect(entry?.status.type).toBe("floating");
  });

  it("marks events as established when ground reaches them via q-grounding chain", () => {
    const soc = new Society();

    const event1 = "event-0";
    soc.lay({ slug: event1, content: "established work", subject: null, object: null });

    // Ground the event directly to frame-carol via q-grounding
    const groundEdge = `frame-carol~because~${event1}`;
    soc.layP(groundEdge, "grounded", "frame-carol", event1, "q-grounding");

    layAuthorship(soc, "frame-carol", event1);

    const bio = biographyOf(soc, "frame-carol");
    const entry = bio.find((e) => e.event === event1);
    expect(entry?.status.type).toBe("established");
    expect(entry?.holders).toContain("frame-carol");
  });

  it("marks events as occluded when is_occluded returns true", () => {
    const soc = new Society();

    const event1 = "event-0";
    soc.lay({ slug: event1, content: "occluded work", subject: null, object: null });

    // Create occluder and shadow (q-occludes)
    const occluder = "occ-event-0-0";
    soc.lay({ slug: occluder, content: "learned the lesson", subject: null, object: null });
    const shadowEdge = `${occluder}~occludes-${event1}`;
    soc.layP(shadowEdge, "", occluder, event1, "q-occludes");

    layAuthorship(soc, "frame-diana", event1);

    const bio = biographyOf(soc, "frame-diana");
    const entry = bio.find((e) => e.event === event1);
    expect(entry?.status.type).toBe("occluded");
    expect(entry?.occluded).toBe(true);
    expect((entry?.status as any).lesson).toBe("learned the lesson");
  });

  it("marks events as superseded when q-succeeds points away", () => {
    const soc = new Society();

    const event1 = "event-0";
    const event2 = "event-1";
    soc.lay({ slug: event1, content: "original work", subject: null, object: null });
    soc.lay({ slug: event2, content: "revised work", subject: null, object: null });

    // Link via q-succeeds: event2 succeeds event1
    const succeedsEdge = `${event2}~succeeds~${event1}`;
    soc.layP(succeedsEdge, "revision", event2, event1, "q-succeeds");

    layAuthorship(soc, "frame-eve", event1);

    const bio = biographyOf(soc, "frame-eve");
    const entry = bio.find((e) => e.event === event1);
    expect(entry?.status.type).toBe("superseded");
    expect((entry?.status as any).by).toBe(event2);
  });

  it("marks events as charged when the End-pole has open charges", () => {
    const soc = new Society();

    const story = "event-0";
    soc.lay({ slug: story, content: "a task with voltage", subject: null, object: null });

    // Unpack the poles (mint Once and End)
    const once = "once-upon-a-time";
    const hea = "everyone-lived-happily-ever-after";
    soc.lay({ slug: once, content: "Once", subject: null, object: null });
    soc.lay({ slug: hea, content: "HEA", subject: null, object: null });

    // Position story as its own frame (story~end-pole~hea)
    const endEdge = `${story}~end-pole~hea`;
    soc.layP(endEdge, "", story, hea, "q-end-pole");

    // Lay a charge on the End-pole (bare edge onto hea)
    const charge = `someone~charge~hea`;
    soc.lay({ slug: charge, content: "voltage", subject: "someone", object: hea });

    layAuthorship(soc, "frame-frank", story);

    const bio = biographyOf(soc, "frame-frank");
    const entry = bio.find((e) => e.event === story);
    expect(entry?.status.type).toBe("charged");
    expect((entry?.status as any).count).toBeGreaterThan(0);
  });

  it("collects all events authored by the same author with mixed statuses", () => {
    const soc = new Society();

    const events = {
      floating: "event-float",
      established: "event-est",
      occluded: "event-occ",
      superseded: "event-old",
    };

    // Setup: create all events
    Object.values(events).forEach((evt) => {
      soc.lay({ slug: evt, content: `work: ${evt}`, subject: null, object: null });
      layAuthorship(soc, "frame-grace", evt);
    });

    // Ground one: floating → established (chain from frame-grace)
    soc.layP(
      `frame-grace~because~${events.established}`,
      "",
      "frame-grace",
      events.established,
      "q-grounding",
    );

    // Occlude one
    const occ = "occ-event-occ-0";
    soc.lay({ slug: occ, content: "learned it", subject: null, object: null });
    soc.layP(`${occ}~occludes-${events.occluded}`, "", occ, events.occluded, "q-occludes");

    // Supersede one
    const successor = "event-new";
    soc.lay({ slug: successor, content: "replacement", subject: null, object: null });
    soc.layP(`${successor}~succeeds~${events.superseded}`, "", successor, events.superseded, "q-succeeds");

    const bio = biographyOf(soc, "frame-grace");
    expect(bio.length).toBe(4);

    const statuses = new Map(bio.map((e) => [e.event, e.status.type]));
    expect(statuses.get(events.floating)).toBe("floating");
    expect(statuses.get(events.established)).toBe("established");
    expect(statuses.get(events.occluded)).toBe("occluded");
    expect(statuses.get(events.superseded)).toBe("superseded");
  });

  it("returns empty biography for an author with no laid events", () => {
    const soc = new Society();

    const event1 = "event-0";
    soc.lay({ slug: event1, content: "someone else's work", subject: null, object: null });
    layAuthorship(soc, "frame-henry", event1);

    // Query for a different author
    const bio = biographyOf(soc, "frame-iris");
    expect(bio.length).toBe(0);
  });

  it("supports frame-relative readings: same event, different grounds", () => {
    const soc = new Society();

    const event1 = "event-0";
    soc.lay({ slug: event1, content: "shared work", subject: null, object: null });

    // Ground from frame-jane to event
    soc.layP(`frame-jane~because~${event1}`, "", "frame-jane", event1, "q-grounding");

    // Ground from frame-kevin to frame-jane (chain)
    soc.layP(`frame-kevin~because~frame-jane`, "", "frame-kevin", "frame-jane", "q-grounding");

    layAuthorship(soc, "frame-jane", event1);

    // From jane's ground: event is established (direct reach)
    const bioFromJane = biographyOf(soc, "frame-jane");
    const entryJane = bioFromJane.find((e) => e.event === event1);
    expect(entryJane?.status.type).toBe("established");

    // From kevin's ground: event is also established (reaches via jane)
    const bioFromKevin = biographyOf(soc, "frame-jane", "frame-kevin");
    const entryKevin = bioFromKevin.find((e) => e.event === event1);
    expect(entryKevin?.status.type).toBe("established");
  });
});
