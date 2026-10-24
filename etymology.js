/*
 * Turns a dictionary etymology paragraph into a short development chain:
 *   "From Middle English bad … from Old English bæddel (“hermaphrodite”) … from Proto-Germanic *badą …"
 *   → [ Proto-Germanic *badą ] → [ Old English bæddel ] → [ Middle English bad ] → [ English: bad ]
 * and builds the "how the word is built" steps from the IC tree (nation → national → nationalize → …).
 */
(function () {
  const LANGS = ["Proto-West Germanic", "Proto-Indo-European", "Proto-Germanic", "Proto-Italic", "Proto-Celtic", "Proto-Slavic",
    "Old High German", "Middle High German", "Classical Persian", "Ottoman Turkish", "Medieval Latin", "Ecclesiastical Latin", "Late Latin", "New Latin", "Vulgar Latin",
    "Middle English", "Old English", "Old French", "Middle French", "Anglo-Norman", "Old Norse", "Middle Dutch", "Old Dutch", "Old Saxon", "Old Frisian",
    "Ancient Greek", "Koine Greek", "Byzantine Greek", "Middle Low German", "Low German", "Late Middle English", "Early Modern English",
    "Latin", "French", "Italian", "German", "Spanish", "Dutch", "Arabic", "Russian", "Sanskrit", "Japanese", "Hebrew", "Hindi", "Portuguese",
    "Persian", "Scots", "Irish", "Malay", "Mandarin", "Frankish", "Turkish", "Greek", "Gothic", "Norwegian", "Danish", "Swedish", "Welsh",
    "Hindustani", "Tamil", "Yiddish", "Old Irish", "Gaulish", "Catalan", "Polish", "Czech", "Hungarian", "Finnish", "Chinese", "Cantonese", "Korean"]
    .sort((a, b) => b.length - a.length);
  const FAMILY = [
    [/Proto-Indo-European/, "pie"], [/Proto-|Old English|Middle English|Old Norse|Old Saxon|Old Frisian|Old High|Middle High|Dutch|German|Gothic|Norwegian|Danish|Swedish|Scots|Frankish|Yiddish|Early Modern English/, "germanic"],
    [/Latin|French|Italian|Spanish|Portuguese|Catalan|Anglo-Norman/, "romance"], [/Greek/, "greek"]
  ];
  const familyOf = lang => { const f = FAMILY.find(x => x[0].test(lang)); return f ? f[1] : "other"; };
  const langRe = new RegExp("(?:^|[\\s,;(])(" + LANGS.map(l => l.replace(/-/g, "\\-")).join("|") + ")\\s+(\\*?[^\\s,;()“”]+)", "g");
  const SIDE = /\b(?:[Cc]ompare|[Cc]ognate|[Rr]elated to|[Dd]oublet|[Aa]kin to|[Ss]ee also|[Ss]ome (?:sources|authorities)|[Dd]isplaced|[Rr]eplaced|[Cc]f\\.)\b/;

  const clean = s => String(s || "").replace(/\s+/g, " ").trim();

  /** → { chain: [{lang, form, gloss, family}], parts: [string] } (chain is oldest → newest, without the English word itself) */
  function parse(text) {
    let t = clean(text);
    if (!t) return { chain: [], parts: [] };
    const side = t.search(SIDE);
    const main = side > 0 ? t.slice(0, side) : t;
    const nodes = [];
    let m;
    langRe.lastIndex = 0;
    while ((m = langRe.exec(main))) {
      const lang = m[1], form = m[2].replace(/[.,;:]+$/, "");
      if (!form || /^(from|of|and|or|the|a|an|via|in|to)$/i.test(form)) continue;
      const rest = main.slice(m.index + m[0].length, m.index + m[0].length + 140);
      const g = rest.match(/^(?:\s*,\s*[^\s,;()“”]+)*\s*\((?:[^()“”]*?)“([^”]+)”/);
      if (nodes.length && nodes[nodes.length - 1].lang === lang) continue;
      nodes.push({ lang, form, gloss: g ? g[1] : "", family: familyOf(lang) });
    }
    // Parts: "From omni- + presence", "From commit + -ee".
    let parts = [];
    const p = main.match(/^(?:From|Equivalent to|Compound of|Blend of)\s+([^.;,]*?\s\+\s[^.;,]*?)(?:[.;,]|$)/);
    if (p) parts = p[1].split(/\s\+\s/).map(x => x.replace(/\s*\([^)]*\)/g, "").replace(/,.*$/, "").trim()).filter(Boolean);
    return { chain: nodes.reverse().slice(-7), parts: parts.length > 1 ? parts : [] };
  }

  /** Steps that build the word, from the IC tree: nation → national → nationalize … → [{from, add, to}] smallest first. */
  function buildSteps(w) {
    if (!w || !w.tree || w.morphemes.length < 2) return [];
    const ms = w.morphemes;
    const leaves = n => n.m !== undefined ? 1 : n.children.reduce((a, c) => a + leaves(c), 0);
    const text = n => n.m !== undefined ? ms[n.m].form.replace(/^-|-$/g, "") : n.label;
    const steps = [];
    (function walk(n) {
      if (n.m !== undefined) return;
      n.children.forEach(walk);
      const [a, b] = n.children;
      // the part that carries the affix is the smaller one
      const aff = n2 => n2.m !== undefined && ms[n2.m].type !== "root";
      const small = aff(a) !== aff(b) ? (aff(a) ? a : b) : (leaves(a) <= leaves(b) ? a : b), big = small === a ? b : a;
      const addLabel = small.m !== undefined ? ms[small.m].form : small.label;
      steps.push({ from: text(big), add: addLabel, to: n.label || "", size: leaves(n), cat: n.cat || "", prefix: small.m !== undefined && ms[small.m].type === "prefix" });
    })(w.tree);
    return steps.sort((x, y) => x.size - y.size);
  }

  window.MorphEtym = { parse, buildSteps, familyOf };
})();
