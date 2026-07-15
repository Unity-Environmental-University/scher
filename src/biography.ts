// ─────────────────────────────────────────────────────────────────────────────
// biography.ts — the O1 "nothing unheard" biography read, cut out of society.ts
// (2026-07-15, separation-of-concerns pass). Pure composition of existing kernel
// reads (laid_by + established_to + is_occluded + prehensions_onto + charges_on),
// per its own doc-comment — no new quality, no kernel branch, no guard. Moved,
// not rebranded — names and doc-comments unchanged from their home in society.ts;
// only the file boundary is new.
// ─────────────────────────────────────────────────────────────────────────────

import { type Society, contentBeats, isOccluded, establishedTo, prehensionsFrom, prehensionsOnto, endOf, chargesOn } from "./society.js";

/** author_of: the subject of a q-utterance prehension onto `beat` (who said it). */
export function authorOf(soc: Society, beat: string): string | null {
  // TODO(socratic): if multiple actors have utteranced the same beat, [0] takes the first — what order, and should there be only one author or is this ambiguous?
  const utt = prehensionsOnto(soc, beat, "q-utterance")[0];
  return utt?.subject ?? null;
}

// ── BIOGRAPHY — O1 "NOTHING UNHEARD" READ (scher settlement 2026-07-03, gen4-iterate 2026-07-06) ──

/** A reading of one authored event's hearing status. Part of the author's biography.
 *  Composition of existing reads: laid_by + established_to + is_occluded +
 *  prehensions_onto + charges_on. No new quality, no kernel branch, no guard.
 */
export interface BiographyEntry {
  event: string;
  laid_by: string;
  content: string;
  status: HearingStatus;
  holders: string[];
  occluded: boolean;
}

/** The hearing status of an authored event. Five mutually exclusive states:
 *  - Established: reached via a because-chain from a ground frame
 *  - Floating: unheard — no frame reaches it
 *  - Occluded: archived with a lesson recorded
 *  - Superseded: replaced by a successor (q-succeeds edge)
 *  - Charged: an open task with voltage (charges on its End-pole)
 */
export type HearingStatus =
  | { type: "established"; grounds: string[] }
  | { type: "floating" }
  | { type: "occluded"; lesson: string }
  | { type: "superseded"; by: string }
  | { type: "charged"; count: number };

/** biographyOf(author, ground?): the author's biography — every event laid by the
 *  author, each assigned a HearingStatus (established / floating / occluded /
 *  superseded / charged) with holders. Frame-relative: which frame you read from
 *  (ground) determines whose "established" reaches the author's work. Default to
 *  author's own frame (reflexivity — an author can see their own work).
 *
 *  AUTHORSHIP DISCOVERY (rewritten 2026-07-15, cooling wave, tension 2): primary read is
 *  the real EventRow.laid_by column — structural, no parsing. The slug pattern
 *  "laid-{event}-by-{layer}" survives only as an EXPLICIT, DATED FALLBACK for legacy rows
 *  laid before the column existed (gen4-policy's Rust side, lib.rs:749, has written both
 *  the q-authorship edge and laid_by since; new data never depends on slug shape). A row
 *  is read via the fallback iff it has no laid_by AND matches the legacy shape — so a
 *  populated column always wins, and the parse never double-counts an event the column
 *  already answered for.
 *
 *  ASSEMBLY LOGIC (pure composition of existing reads):
 *  1. Query laid_by(author) → all events where laid_by == author
 *  2. For each event, compute its status:
 *     - If occluded: read occluder node's content as lesson → Occluded
 *     - Else if successor exists: → Superseded(by)
 *     - Else if established_to reaches it from ground: → Established(grounds)
 *     - Else if charges press on its End-pole: → Charged(count)
 *     - Else: → Floating (unheard)
 *  3. Collect holders via established_to's reachability (may differ by ground)
 */
export function biographyOf(soc: Society, author: string, ground?: string): BiographyEntry[] {
  const entries: BiographyEntry[] = [];
  const readGround = ground ?? author;

  // 1. Discover all events laid by the author.
  const authorialEvents = new Set<string>();

  // PRIMARY: the real laid_by column — structural, no slug parsed. Content beats only
  // (a '~q' mode-beat or a prehension carrying laid_by would be a different question).
  for (const beat of contentBeats(soc)) {
    if (beat.laid_by === author) authorialEvents.add(beat.slug);
  }

  // FALLBACK, LEGACY ROWS ONLY (dated 2026-07-15; pre-laid_by-column data): the
  // authorship node names followed the pattern "laid-{event}-by-{layer}" before
  // scher-core wrote the column. Parse it and verify via the ~lays~ edge co-prehending
  // q-authorship — but only for an event the column didn't already answer for, so a
  // populated laid_by always wins and this parse never overrides or double-counts it.
  soc.all().forEach((beat) => {
    // Look for authorship nodes: laid-{event}-by-{layer}, subject/object null (nodes, not edges)
    if (beat.slug.startsWith("laid-") && beat.subject === null && beat.object === null) {
      // Parse the slug to extract event and layer
      const match = beat.slug.match(/^laid-(.+?)-by-(.+)$/);
      if (match) {
        const [, eventSlug, layerSlug] = match;
        if (eventSlug && layerSlug === author && !authorialEvents.has(eventSlug)) {
          const eventBeat = soc.get(eventSlug);
          if (eventBeat && eventBeat.laid_by) return; // column already spoke for this event
          // Verify via ~lays~ edge co-prehending q-authorship
          const laysEdges = prehensionsFrom(soc, beat.slug, "q-authorship");
          const firstEdge = laysEdges[0];
          if (firstEdge && firstEdge.object === eventSlug) {
            authorialEvents.add(eventSlug);
          }
        }
      }
    }
  });

  // 2. Process each authored event and compute its HearingStatus
  authorialEvents.forEach((event) => {
    const eventBeat = soc.get(event);
    if (!eventBeat) return;

    const occluded = isOccluded(soc, event);
    let status: HearingStatus;
    let holders: string[] = [];

    if (occluded) {
      // 2a. If occluded: read occluder's content as lesson → Occluded
      const occluderEdges = prehensionsOnto(soc, event, "q-occludes");
      const lesson = occluderEdges
        .map((e) => e.subject)
        .filter(Boolean)
        .flatMap((occ) => soc.get(occ as string)?.content ?? [])
        .join("; ");
      status = { type: "occluded", lesson: lesson || "(no lesson recorded)" };
    } else if (hasSuccessor(soc, event)) {
      // 2b. Else if successor exists: → Superseded(by)
      const successor = findSuccessor(soc, event)!;
      status = { type: "superseded", by: successor };
    } else if (establishedTo(soc, readGround, event)) {
      // 2c. Else if ground reaches it via because-chain: → Established(grounds)
      status = { type: "established", grounds: [readGround] };
      holders = [readGround];
    } else {
      // Check for charges on the End-pole (an open End-pole with charges — q-lure is dead;
      // see assertNoLure — comment corrected 2026-07-15, was stale "open lure" language)
      const storyEnd = endOf(soc, event);
      if (storyEnd) {
        const charges = chargesOn(soc, storyEnd);
        if (charges.length > 0) {
          // 2d. Has charges on its open End-pole: → Charged(count)
          status = { type: "charged", count: charges.length };
        } else {
          // 2e. No reach, no charges: → Floating (unheard)
          status = { type: "floating" };
        }
      } else {
        // Not a story structure, just floating
        status = { type: "floating" };
      }
    }

    entries.push({
      event,
      laid_by: author,
      content: eventBeat.content,
      status,
      holders,
      occluded,
    });
  });

  return entries;
}

/** hasSuccessor: does a q-succeeds edge point TO this event (is it superseded)?
 *  The successor-to-original edge: successor ~succeeds~ original (subject -> object).
 *  We look for edges onto the event, and the subject is the successor.
 */
function hasSuccessor(soc: Society, event: string): boolean {
  return prehensionsOnto(soc, event, "q-succeeds").length > 0;
}

/** findSuccessor: retrieve the first successor (subject of q-succeeds edge onto event). */
function findSuccessor(soc: Society, event: string): string | null {
  const firstEdge = prehensionsOnto(soc, event, "q-succeeds")[0];
  return firstEdge?.subject ?? null;
}
