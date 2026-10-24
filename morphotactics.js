/*
 * Morphotactics for the IC tree.
 * Idea taken from finite-state morphological analysers (for example Google's Turkish morphology):
 * an affix inventory says which word class each affix accepts and which class it gives, so the order
 * in which affixes were added (= the IC tree) can be worked out by rule, without asking an AI to draw it.
 *
 *   inflection  : closed set, always the outermost layer, may be zero (mice = mouse + -s)
 *   derivation  : prefixes keep the class, suffixes usually change it ("from → to")
 */
(function () {
  const ANY = ["N", "V", "Adj", "Adv"];
  const same = "same";

  // Prefixes: accepted classes → result ("same" = class-maintaining).
  const PREFIX = {};
  const addP = (names, from, to) => names.split(" ").forEach(n => { PREFIX[n] = { from, to: to || same }; });
  addP("un", ["Adj", "V"]);
  addP("re", ["V"]);
  addP("in im il ir", ["Adj", "N"]);
  addP("dis", ["V", "Adj", "N"]);
  addP("mis", ["V", "N"]);
  addP("non", ["N", "Adj"]);
  addP("de", ["V", "N"]);
  addP("pre post over under out sub super inter trans counter contra hyper mid mono multi semi tri bi uni fore auto micro para poly pseudo extra up with by ex co anti", ANY);
  addP("en be", ["N", "Adj"], "V");

  // Derivational suffixes: accepted classes → possible results.
  const SUFFIX = {};
  const addS = (names, from, to) => names.split(" ").forEach(n => { SUFFIX[n] = { from, to }; });
  addS("ness ity ty", ["Adj"], ["N"]);
  addS("ment tion ation ition sion ion ure ee eer or", ["V"], ["N"]);
  addS("ance ence ancy ency age", ["V", "Adj"], ["N"]);
  addS("al", ["V", "N"], ["N", "Adj"]);
  SUFFIX.al.map = { V: "N", N: "Adj" };   // refuse → refusal (N), nation → national (Adj)
  addS("ist ism", ["N", "Adj"], ["N"]);
  addS("hood ship dom ery ry ette let ling ster", ["N", "Adj"], ["N"]);
  addS("able ible", ["V", "N"], ["Adj"]);
  addS("ful", ["N", "V"], ["Adj"]);
  addS("less ous ious eous ic ical like some ary ory", ["N"], ["Adj"]);
  addS("ive ative itive", ["V"], ["Adj"]);
  addS("ish", ["N", "Adj"], ["Adj"]);
  addS("y", ["N"], ["Adj"]);
  addS("ant ent", ["V"], ["N", "Adj"]);
  addS("ize ise ify fy", ["N", "Adj"], ["V"]);
  addS("en", ["Adj", "N"], ["V"]);        // widen, strengthen (derivational -en)
  addS("ward wise th", ["N", "Adj"], ["Adj", "Adv", "N"]);

  // Inflectional suffixes (always the outer layer).
  const INFLECT = {
    "s": { from: ["N", "V"], to: same }, "es": { from: ["N", "V"], to: same }, "'s": { from: ["N"], to: same }, "s'": { from: ["N"], to: same },
    "ed": { from: ["V"], to: same }, "en": { from: ["V"], to: same }, "ing": { from: ["V"], to: same },
    "er": { from: ["Adj", "Adv"], to: same }, "est": { from: ["Adj", "Adv"], to: same },
    "ly": { from: ["Adj"], to: ["Adv"] }
  };
  // Look-alike derivational endings, chosen by the variant label.
  const VARIANT = {
    "-ing (N)": { from: ["V"], to: ["N"] }, "-ing (adj)": { from: ["V"], to: ["Adj"] }, "-ed (adj)": { from: ["V"], to: ["Adj"] },
    "-ly (adj)": { from: ["N"], to: ["Adj"] }, "-er (N)": { from: ["V", "N"], to: ["N"] }, "-er (onomatopoeia)": { from: ["V"], to: ["V"] }
  };

  // Prefixes with more than one sense: the sense (variant label) decides which word class the prefix attaches to.
  //   re- (again) goes with verbs (re-activate), re- (against) with nouns (re-action); in- (not) with adjectives, in- (into) with verbs and nouns.
  const PVARIANT = {
    "re- (again)": { from: ["V"], to: same }, "re- (against)": { from: ["N"], to: same },
    "in- (not)": { from: ["Adj", "N"], to: same }, "in- (into)": { from: ["V", "N"], to: same },
    "un- (not)": { from: ["Adj"], to: same }, "un- (reverse)": { from: ["V"], to: same }
  };

  const plain = s => String(s || "").toLowerCase().replace(/-/g, "");
  const catOf = c => {
    const k = String(c || "").toLowerCase();
    if (k === "n" || k === "noun") return "N";
    if (k === "v" || k === "verb") return "V";
    if (k === "adj" || k === "a" || k === "adjective") return "Adj";
    if (k === "adv" || k === "adverb") return "Adv";
    return "";   // unknown class: accepts any affix
  };

  function affixRule(m) {
    const f = plain(m.form);
    if (m.type === "prefix") return (m.variant && PVARIANT[m.variant]) || PREFIX[f] || null;
    if (m.variant && VARIANT[m.variant]) return VARIANT[m.variant];
    if (/-inf$/.test(m.cls)) return INFLECT[f] || { from: ANY, to: same };
    return SUFFIX[f] || null;
  }

  function apply(rule, cat) {
    if (!rule) return [cat || ""];                      // unknown affix: do not block
    if (cat && !rule.from.includes(cat)) return [];     // wrong class for this affix
    if (cat && rule.map && rule.map[cat]) return [rule.map[cat]];   // the result depends on the input class
    if (rule.to === same) return [cat || ""];
    return rule.to.slice();
  }

  /** All trees (as nested {cat, children}) that the inventory allows for the morpheme sequence. */
  function derive(ms) {
    const memo = new Map();
    const isInfl = m => m.type === "suffix" && /-inf$/.test(m.cls);
    function span(i, j) {
      const key = i + "," + j;
      if (memo.has(key)) return memo.get(key);
      const out = [];
      memo.set(key, out);
      if (i === j) {
        if (ms[i].type === "root") out.push({ cat: catOf(ms[i].cat), node: { m: i } });
        return out;
      }
      const lastInfl = isInfl(ms[j]);
      if (!lastInfl && ms[i].type === "prefix") {
        for (const inner of span(i + 1, j)) {
          for (const cat of apply(affixRule(ms[i]), inner.cat)) out.push({ cat, node: { cat, children: [{ m: i }, inner.node] } });
        }
      }
      if (ms[j].type === "suffix") {
        for (const inner of span(i, j - 1)) {
          for (const cat of apply(affixRule(ms[j]), inner.cat)) out.push({ cat, node: { cat, children: [inner.node, { m: j }] } });
        }
      }
      if (!lastInfl) {                                   // compounds: [root root], head on the right
        for (let k = i; k < j; k++) {
          const left = span(i, k), right = span(k + 1, j);
          for (const l of left) for (const r of right) {
            if (hasRoot(ms, i, k) && hasRoot(ms, k + 1, j)) out.push({ cat: r.cat, node: { cat: r.cat, children: [l.node, r.node] } });
          }
        }
      }
      return out;
    }
    return span(0, ms.length - 1);
  }
  function hasRoot(ms, i, j) { for (let k = i; k <= j; k++) if (ms[k].type === "root") return true; return false; }

  /** Shape signature, e.g. "((0 1) 2)", used to compare an AI tree with the rule-based trees. */
  function signature(node) {
    return node.m !== undefined ? String(node.m) : "(" + node.children.map(signature).join(" ") + ")";
  }

  /** Fallback when the inventory knows nothing: prefixes first, then suffixes, inflection last. */
  function defaultTree(ms) {
    const pre = [], suf = [], inf = [], roots = [];
    ms.forEach((m, i) => { (m.type === "prefix" ? pre : m.type === "root" ? roots : /-inf$/.test(m.cls) ? inf : suf).push(i); });
    if (!roots.length) return null;
    let node = { m: roots[0] };
    for (const r of roots.slice(1)) node = { children: [node, { m: r }] };
    for (const p of pre.slice().reverse()) node = { children: [{ m: p }, node] };
    for (const s of suf) node = { children: [node, { m: s }] };
    for (const s of inf) node = { children: [node, { m: s }] };
    return node;
  }

  /**
   * Choose the tree for a morpheme list.
   * @param hint  optional tree from the AI (nested {children}/{m}); used to break ties between valid trees
   * @returns { node, method: "rules" | "ai" | "default", ambiguous }
   */
  function plan(ms, hint) {
    if (ms.length === 1) return { node: { m: 0 }, method: "rules", ambiguous: false };
    const found = derive(ms);
    const unique = [];
    const seen = new Set();
    for (const f of found) { const s = signature(f.node); if (!seen.has(s)) { seen.add(s); unique.push(f); } }
    if (unique.length) {
      const hintSig = hint ? signature(hint) : "";
      // When the inventory allows several trees, a prefix joins the base before the suffixes do:
      // (com- mit) -ee, (dis- agree) -ment. Score = size of the part each prefix is attached to; smaller wins.
      const size = n => n.m !== undefined ? 1 : n.children.reduce((a, c) => a + size(c), 0);
      const score = (n) => {
        if (n.m !== undefined) return 0;
        let sc = n.children.reduce((a, c) => a + score(c), 0);
        n.children.forEach((c, i) => { if (c.m !== undefined && ms[c.m].type === "prefix") sc += size(n.children[1 - i]); });
        return sc;
      };
      const ranked = unique.slice().sort((a, b) => score(a.node) - score(b.node));
      const pick = unique.find(f => signature(f.node) === hintSig) || ranked[0];
      return { node: pick.node, method: "rules", ambiguous: unique.length > 1 };
    }
    if (hint) return { node: hint, method: "ai", ambiguous: false };
    const d = defaultTree(ms);
    return d ? { node: d, method: "default", ambiguous: false } : null;
  }

  window.MorphTactics = { plan, derive, signature, defaultTree, affixRule, PREFIX, SUFFIX, INFLECT };
})();
