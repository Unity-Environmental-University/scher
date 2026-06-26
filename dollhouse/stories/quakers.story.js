// The Quaker story, as DATA — a sequence of scenes you can watch unfold. Each scene has prose
// (what happened) and moves (grammar: who succeeds whom, what forks, what merges). The player
// replays these one at a time and draws the line of descent after each, so you SEE the schisms
// fork and the reunions merge. Any history can be a story in this shape; this is the first.
//
// move kinds (kept plain): {succeeds:[heir,parent]} · {root:name} · {merge:[heir,[p1,p2]]}
export const quakerStory = {
  title: "The Society of Friends — Fox to today 🕊️",
  blurb: "Every schism a fork, every reunion a merge, the Inward Light read by all and owned by none.",
  scenes: [
    { year: "1647", prose: "George Fox preaches the Inward Light — that of God in everyone. The root of Friends.",
      moves: [{ root: "Fox — the Inward Light" }] },
    { year: "1652", prose: "The early Friends gather; the Society takes shape as one body.",
      moves: [{ succeeds: ["early Friends", "Fox — the Inward Light"] }] },
    { year: "1700s", prose: "The quietist century — Friends turn inward, waiting in the silence.",
      moves: [{ succeeds: ["quietist Friends", "early Friends"] }] },
    { year: "1827", prose: "THE GREAT SEPARATION. The body forks: the Hicksites (~⅔) hold the Inner Light as guide; the Orthodox (~⅓) hold Biblical authority. A schism is two heirs of one body.",
      moves: [{ succeeds: ["Hicksite (Inner Light)", "quietist Friends"] },
              { succeeds: ["Orthodox (Scripture)", "quietist Friends"] }] },
    { year: "1845", prose: "The Orthodox branch itself forks: Gurneyites follow J.J. Gurney toward evangelicalism; Wilburites resist, holding the old way.",
      moves: [{ succeeds: ["Gurneyite (evangelical)", "Orthodox (Scripture)"] },
              { succeeds: ["Wilburite (conservative)", "Orthodox (Scripture)"] }] },
    { year: "1865+", prose: "Further growths off the Wilburite resistance: Conservative Friends, and independent Beanite meetings in the western US.",
      moves: [{ succeeds: ["Conservative Friends", "Wilburite (conservative)"] },
              { succeeds: ["Beanite (independent)", "Wilburite (conservative)"] }] },
    { year: "1945 & 1955", prose: "THE REUNIONS. New England (1945), then Baltimore, New York, Philadelphia (1955): reunited Yearly Meetings descend from BOTH the Hicksite and Orthodox lines. A reunion is one heir of two — a merge. The 128-year schism heals, and neither parent is erased.",
      moves: [{ merge: ["Reunited Yearly Meeting", ["Hicksite (Inner Light)", "Orthodox (Scripture)"]] }] },
    { year: "today", prose: "Three confederations carry the Light: Friends General Conference (Hicksite pattern), Friends United Meeting & Evangelical Friends Church Intl (Gurneyite). Three live bodies, all reading the same Inward Light — plural frames on one eternal-object, owned by none.",
      moves: [{ succeeds: ["Friends General Conference", "Reunited Yearly Meeting"] },
              { succeeds: ["Friends United Meeting", "Gurneyite (evangelical)"] },
              { succeeds: ["Evangelical Friends Intl", "Gurneyite (evangelical)"] }] },
  ],
};
