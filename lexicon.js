/*
 * Pre-cut morphemes (written by an AI offline, checked by tools/import-lexicon.mjs).
 * lexicon/<first two letters>.json  →  { word: "pos\tform|surface|code|cat|variant|allo ; …" }
 * code: P prefix, R free root, B bound root, S derivational suffix, I inflectional suffix.
 *
 * Regular inflected forms are not stored: they are built from the lemma (run + -ing = running).
 */
(function () {
  const SHAPE = {
    P: { type: "prefix", cls: "prefix-der" }, R: { type: "root", cls: "root-free" }, B: { type: "root", cls: "root-bound" },
    S: { type: "suffix", cls: "suffix-der" }, I: { type: "suffix", cls: "suffix-inf" }
  };
  const shards = new Map();
  const DIR = { basic: "lexicon", adv: "lexicon-adv" };
  const build = (document.currentScript && document.currentScript.src.split("?v=")[1]) || "";

  function shard(word, level) {
    const k = word.slice(0, 2);
    if (!/^[a-z]{2}$/.test(k)) return Promise.resolve({});
    const id = level + "/" + k;
    if (!shards.has(id)) {
      const p = fetch(`${DIR[level]}/${k}.json${build ? "?v=" + build : ""}`)
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => { shards.delete(id); return {}; });
      shards.set(id, p);
    }
    return shards.get(id);
  }

  function parse(word, line) {
    const [pos, body] = line.split("\t");
    if (!body || body === "?") return null;
    const morphemes = body.split(" ; ").map(t => {
      const [form, surface, code, cat, variant, allo, gloss] = t.split("|");
      const s = SHAPE[code];
      const m = { form, surface, type: s.type, cls: s.cls, cat: cat || "", allomorphOf: allo || "", variant: variant || "" };
      if (gloss && gloss.trim()) m.meaning = gloss.trim();
      return m;
    });
    return { pos, morphemes };
  }

  /** level "adv": the advanced cut when there is one, otherwise the basic cut. Result.level says which one it is. */
  async function get(word, level) {
    if (level === "adv") {
      const a = (await shard(word, "adv"))[word];
      const r = a ? parse(word, a) : null;
      if (r) { r.level = "adv"; return r; }
    }
    const line = (await shard(word, "basic"))[word];
    const r = line ? parse(word, line) : null;
    if (r) r.level = "basic";
    return r;
  }

  /** Which inflection does the dictionary say this form is? */
  function inflection(tags) {
    const t = String(tags || "");
    if (/plural/.test(t) && !/participle/.test(t)) return { form: "-s", variant: "-s (plural)" };
    if (/third-person/.test(t)) return { form: "-s", variant: "-s (3sg)" };
    if (/present/.test(t) && /participle/.test(t)) return { form: "-ing", variant: "-ing (v)" };
    if (/gerund/.test(t)) return { form: "-ing", variant: "-ing (v)" };
    if (/participle past|\bpast\b/.test(t)) return { form: "-ed", variant: "-ed (v2)" };
    if (/comparative/.test(t)) return { form: "-er", variant: "-er (comparative)" };
    if (/superlative/.test(t)) return { form: "-est", variant: "-est (superlative)" };
    return null;
  }

  /** lemma + inflection → morphemes for the inflected spelling, or null when the spelling does not fit. */
  function compose(word, lemma, infl) {
    const ms = lemma.morphemes.map(m => ({ ...m }));
    if (ms.some(m => m.cls === "suffix-inf")) return null;            // already inflected (irregular forms)
    const L = ms.map(m => m.surface).join("");
    let k = 0;
    while (k < L.length && k < word.length && L[k] === word[k]) k++;
    let keep = k, rest = word.slice(k), tail = "";
    if (k === L.length - 1 && L[k] === "y" && word[k] === "i") { tail = "i"; rest = word.slice(k + 1); }             // baby → babies
    else if (k === L.length && L.endsWith("e") && ["d", "r", "st"].includes(rest) && /^-(ed|er|est)$/.test(infl.form)) { keep = k - 1; rest = "e" + rest; } // wide → wider
    const cut = L.length - keep;                                                                                       // letters the lemma gives up
    const last = ms[ms.length - 1];
    if (cut > 0) {
      if (cut >= last.surface.length) return null;
      last.surface = last.surface.slice(0, last.surface.length - cut);
    }
    last.surface += tail;
    ms.push({ form: infl.form, surface: rest, type: "suffix", cls: "suffix-inf", cat: "", allomorphOf: "", variant: infl.variant });
    if (ms.map(m => m.surface).join("") !== word) return null;
    return { pos: lemma.pos, morphemes: ms, level: lemma.level };
  }

  /**
   * @param dictRes result of MorphDict.lookup (may be null)
   * → { ai: {morphemes, pos}, how: "lexicon" | "composed", lemma } or null
   */
  async function resolve(word, dictRes, level) {
    const own = await get(word, level);
    if (own) return { ai: own, how: "lexicon", lemma: word, level: own.level };
    const via = dictRes && dictRes.found && dictRes.via;
    if (!via || via.relation !== "inflection") return null;
    const infl = inflection(via.tags);
    if (!infl) return null;
    const lemma = await get(via.lemma, level);
    if (!lemma) return null;
    const c = compose(word, lemma, infl);
    return c ? { ai: c, how: "composed", lemma: via.lemma, level: c.level } : null;
  }

  /** Both cuts of a word, for the level hint: { basic: morphemes|null, adv: morphemes|null (only when it differs) } */
  async function both(word) {
    const b = await get(word, "basic");
    const a = await get(word, "adv");
    return { basic: b ? b.morphemes : null, adv: a && a.level === "adv" ? a.morphemes : null };
  }

  /** Start loading the lexicon files for a word that is still being typed. */
  function prefetch(word, level) {
    if (/^[a-z]{2}/.test(word)) { shard(word, "basic"); if (level === "adv") shard(word, "adv"); }
  }

  window.MorphLex = { get, resolve, compose, inflection, both, prefetch };
})();
