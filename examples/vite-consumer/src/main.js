// Bare specifiers. No dist/ paths, no import map, no aliases.
import { Society } from "scher";
import { intervalOf } from "scher/society";

const soc = new Society();
soc.lay({ slug: "once", content: "a story begins", subject: null, object: null });
soc.lay({ slug: "b1", content: "something happened", subject: null, object: null });
soc.lay({ slug: "end", content: "it ends", subject: null, object: null });

const interior = intervalOf(soc, "once", "end");
document.getElementById("out").textContent =
  `barrel + subpath imports both resolved. interval: ${JSON.stringify(interior)}`;
