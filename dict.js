/*
 * Morphology — dictionary client.
 * Reads the static shards of the L2 Practice dictionary
 * (https://github.com/l2practice/dictionary) directly from GitHub Pages:
 *   manifest.json → v<version>/p/<prefix>.json (headwords + inflections)
 *                 → v<version>/e/<shard>.json  (full entries)
 * Entry lookup, inflection → lemma and the fnv1a32 shard rule follow the
 * dictionary's own web build (source/app/src/lib/web/core.ts).
 */
(function () {
  const DEFAULT_ROOT = "https://l2practice.github.io/dictionary/data/";
  const root = (window.MORPH_DICT_ROOT || DEFAULT_ROOT).replace(/\/?$/, "/");

  const json = new Map();      // url → Promise
  let manifestP = null;
  let wordsP = null;

  function getJson(url, opts) {
    if (!json.has(url)) {
      const p = fetch(url, opts).then(r => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
      p.catch(() => json.delete(url));   // network error → try again next time
      json.set(url, p);
    }
    return json.get(url);
  }

  function manifest() {
    if (!manifestP) {
      manifestP = fetch(root + "manifest.json", { cache: "no-cache" })
        .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      manifestP.catch(() => { manifestP = null; });
    }
    return manifestP;
  }

  const dataUrl = (m, path) => root + m.base + path;

  function norm(s) {
    return String(s).toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "").trim();
  }

  function fnv1a32(s) {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
    return h;
  }

  function bucket(m, n) {
    const { space, other, max_len } = m.prefix;
    const split = new Set(m.prefix.split);
    const cps = Array.from(n);
    if (!cps.length || !(cps[0] >= "a" && cps[0] <= "z")) return other;
    const map = c => (c >= "a" && c <= "z" ? c : c === " " ? space : other);
    let k = cps.slice(0, 2).map(map).join("");
    while (split.has(k) && cps.length > k.length && k.length < max_len) k += map(cps[k.length]);
    return k;
  }

  const RESERVED = new Set(["con", "prn", "aux", "nul"]);
  // The published data has no prefix file for the Windows-reserved names (con, aux, nul, prn), so every
  // "con…" word (construction, control, consider …) would look missing. words.txt still lists them, and the
  // entry shards are keyed by headword, so rebuild the missing bucket from words.txt.
  const synth = new Map();
  async function prefixFile(m, key) {
    const pf = await getJson(dataUrl(m, `p/${RESERVED.has(key) ? key + "-" : key}.json`));
    if (pf || !RESERVED.has(key)) return pf;
    if (!synth.has(key)) synth.set(key, wordList().then(ws => ({
      h: ws.filter(x => bucket(m, x[0]) === key).map(x => [x[0], Number.isFinite(x[1]) ? x[1] : null, x[0]]), f: []
    })));
    return synth.get(key);
  }

  async function entryOf(m, headword) {
    const shard = await getJson(dataUrl(m, `e/${String(fnv1a32(headword) % m.en_shards).padStart(4, "0")}.json`));
    return shard && Object.prototype.hasOwnProperty.call(shard, headword) ? shard[headword] : null;
  }

  /**
   * Resolve a typed word to a dictionary entry.
   * → { found: true, entry, headword, via }   via = { form, lemma, relation } when the input was an inflected form
   * → { found: false }
   */
  async function lookup(raw) {
    const m = await manifest();
    const n = norm(raw);
    if (!n) return { found: false };
    const pf = await prefixFile(m, bucket(m, n));
    if (!pf) return { found: false };

    const hits = (pf.h || []).filter(x => (x[2] || norm(x[0])) === n);
    let head = null;
    if (hits.length) {
      hits.sort((a, b) => (b[0] === n) - (a[0] === n) || (a[1] ?? Infinity) - (b[1] ?? Infinity));
      const entry = await entryOf(m, hits[0][0]);
      if (entry) head = { entry, headword: hits[0][0] };
    }
    // "mice" is also a rare verb headword, but it is first of all the plural of "mouse".
    const f = (pf.f || []).find(x => x[0] === n);
    let lemma = null;
    if (f) {
      const entry = await entryOf(m, f[1]);
      if (entry) lemma = {
        entry, headword: f[1],
        via: { form: n, lemma: f[1], relation: f[2] === "i" ? "inflection" : "variant", tags: f[3] || "" }
      };
    }
    if (head && lemma && lemma.via.relation === "inflection") {
      const hr = head.entry.rank == null ? Infinity : head.entry.rank;
      const lr = lemma.entry.rank == null ? Infinity : lemma.entry.rank;
      if (lr <= hr) return { found: true, ...lemma };
    }
    if (head) return { found: true, ...head, via: null };
    if (lemma) return { found: true, ...lemma };
    return { found: false };
  }

  /** Headwords starting with q (for the search box). */
  async function suggest(raw) {
    const m = await manifest();
    const q = norm(raw);
    if (!q || !/^[a-z]/.test(q)) return [];
    const pf = await prefixFile(m, bucket(m, q));
    if (!pf) return [];
    const k = bucket(m, q);
    if (pf.top && q.length === k.length) return pf.top.en.slice(0, 6);
    return (pf.h || []).filter(x => (x[2] || norm(x[0])).startsWith(q)).slice(0, 6).map(x => x[0]);
  }

  // ---- related words for a word the dictionary does not have (construction → construct, constructive) ----
  async function hasHeadword(m, w) {
    const pf = await prefixFile(m, bucket(m, w)).catch(() => null);
    return !!(pf && (pf.h || []).some(x => (x[2] || norm(x[0])) === w));
  }

  /**
   * Evidence for cutting an unknown word: dictionary words it could be built from (by stripping an affix and
   * undoing the spelling change) and dictionary words that share its stem.
   * → { bases: [{word, how}], family: [word], likely: boolean }
   */
  async function neighbours(raw) {
    const m = await manifest();
    const n = norm(raw);
    if (!/^[a-z]{5,}$/.test(n)) return { bases: [], family: [], likely: false };
    const T = window.MorphTactics || {};
    const sufs = Object.keys({ ...(T.SUFFIX || {}), ...(T.INFLECT || {}) }).filter(s => /^[a-z]+$/.test(s));
    const cands = new Map();
    const add = (b, how) => { if (b.length >= 3 && b !== n && !cands.has(b)) cands.set(b, how); };
    for (const s of sufs) {
      if (!n.endsWith(s) || n.length - s.length < 3) continue;
      const stem = n.slice(0, -s.length);
      add(stem, "-" + s);
      add(stem + "e", "-" + s + " (final e dropped)");
      if (/i$/.test(stem)) add(stem.slice(0, -1) + "y", "-" + s + " (y became i)");
      if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1), "-" + s + " (consonant doubled)");
    }
    for (const p of Object.keys(T.PREFIX || {})) {
      if (n.startsWith(p) && n.length - p.length >= 3) add(n.slice(p.length), p + "-");
    }
    const checked = await Promise.all([...cands.keys()].map(async b => [b, await hasHeadword(m, b)]));
    const bases = checked.filter(x => x[1]).map(x => ({ word: x[0], how: cands.get(x[0]) }))
      .sort((a, b) => (a.how[0] === "-" ? 0 : 1) - (b.how[0] === "-" ? 0 : 1) || b.word.length - a.word.length).slice(0, 4);

    // Words that share the stem: construction → construct, constructed, constructive, constructor …
    let family = [];
    const pf = await prefixFile(m, bucket(m, n)).catch(() => null);
    if (pf) {
      for (let k = n.length - 1; k >= Math.max(5, n.length - 5) && family.length < 3; k--) {
        const stem = n.slice(0, k);
        family = (pf.h || []).filter(x => { const w = x[2] || norm(x[0]); return w !== n && /^[a-z]+$/.test(w) && w.startsWith(stem); })
          .sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity)).slice(0, 8).map(x => x[0]);
      }
    }
    const suffixBase = bases.some(b => b.how[0] === "-");
    return { bases, family: family.length >= 2 ? family : [], likely: suffixBase || family.length >= 3 };
  }

  // ---- spelling suggestions (only fetched when a word is not found) ----
  function damerau(a, b, limit) {
    const n = a.length, mm = b.length;
    let prev2 = new Array(mm + 1).fill(0), prev = new Array(mm + 1), cur = new Array(mm + 1);
    for (let j = 0; j <= mm; j++) prev[j] = j;
    let prevMin = 0;
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      let rowMin = i;
      for (let j = 1; j <= mm; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
        cur[j] = d;
        if (d < rowMin) rowMin = d;
      }
      if (rowMin > limit && prevMin > limit) return limit + 1;
      prevMin = rowMin;
      [prev2, prev, cur] = [prev, cur, prev2];
    }
    return prev[mm];
  }

  async function wordList() {
    if (!wordsP) {
      wordsP = manifest().then(m => fetch(dataUrl(m, "words.txt"))).then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }).then(text => {
        // one "word<TAB>frequency rank" per line; keep plain lowercase words only
        const out = [];
        for (const line of text.split("\n")) {
          const tab = line.lastIndexOf("\t");
          const w = tab < 0 ? line : line.slice(0, tab);
          if (!/^[a-z][a-z'-]*$/.test(w)) continue;
          const rank = tab < 0 || line.slice(tab + 1) === "" ? Infinity : Number(line.slice(tab + 1));
          out.push([w, rank]);
        }
        return out;
      });
      wordsP.catch(() => { wordsP = null; });
    }
    return wordsP;
  }

  /** Up to 5 real words within 2 edits, closest and most frequent first. */
  async function fuzzy(raw) {
    const q = norm(raw);
    if (q.length < 3) return [];
    const words = await wordList();
    const found = [];
    for (const [w, rank] of words) {
      if (Math.abs(w.length - q.length) > 2) continue;
      const d = damerau(q, w, 2);
      if (d <= 2) found.push([d, rank, w]);
    }
    found.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return found.slice(0, 5).map(x => x[2]);
  }

  /** Flatten the parts of an entry the app shows. */
  function summarize(entry) {
    const blocks = entry.blocks || [];
    const first = blocks.find(b => b.pos) || blocks[0] || {};
    const sense = (first.senses || [])[0];
    const wikt = (first.wiktionary || [])[0];
    const etymology = (blocks.map(b => b.etymology).find(Boolean)) || "";
    return {
      word: entry.word,
      pos: first.pos || "",
      gloss: (sense && sense.definition) || (wikt && wikt.gloss) || "",
      ipa: (entry.ipa && (entry.ipa.us || entry.ipa.uk)) || "",
      cefr: first.cefr || (sense && sense.cefr) || "",
      etymology,
      family: (entry.family || []).slice(0, 12),
      related: (entry.known || []).slice(0, 14)
    };
  }

  /** true/false once words.txt has been loaded, null before (the page loads it in the background). */
  let wordSet = null;
  function preloadWords() { return wordList().then(ws => { wordSet = new Set(ws.map(x => x[0])); return wordSet; }).catch(() => null); }
  const hasWordSync = w => (wordSet ? wordSet.has(String(w).toLowerCase()) : null);

  window.MorphDict = { preloadWords, hasWordSync, lookup, suggest, fuzzy, neighbours, summarize, norm };
})();
