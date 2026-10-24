#!/usr/bin/env node
// Validate Muse output files and build the app's lexicon shards.
//   node tools/import-lexicon.mjs <outDir> <rejectedFile> <out-0001.txt> [more files...]
// Every line: word<TAB>pos<TAB>form|surface|code|cat|variant|allo ; ...
import fs from "node:fs";
const args = process.argv.slice(2);
const ADV = args[0] === "--adv";            // advanced layer: bound Latin/Greek roots and etymological affixes allowed
if (ADV) args.shift();
const [outDir, rejFile, ...files] = args;
const CODES = new Set(["P", "R", "B", "S", "I"]);
const POS = new Set(["noun", "verb", "adj", "adv", "prep", "pron", "det", "conj", "interj", "?"]);
const PREFIXES = new Set("a an anti auto be bi by co com con contra counter de dis en ex extra fore hyper hypo il im in inter intra ir mal micro mid mis mono multi non out over para poly post pre pro per ad ac em col cor af ag al ap ar as at ef ob oc of op ab suf sup sur down pseudo re semi sub super tele trans tri un under uni up with".split(" "));
const SUFFIXES = new Set("s es 's s' ed en ing er est ly ness ment tion sion ation ition ion ity ty ive ative itive ous ious eous al ial ual ful less able ible ist ism ize ise ify fy ish y hood ship dom ward wise ant ent ance ence ancy ency ary ory ic ical ure age ee eer ette let ling ster some like th ery ry or ess ate cy ian an ren ar ific ator osity uous ular ose esque atory ite ient acy icity ience arian eal".split(" "));
const INFL_VAR = /\((v|v2|adv|comparative|superlative|plural|3sg|participle)\)$/;

function check(word, pos, ms) {
  const p = [];
  if (!POS.has(pos)) p.push("bad pos " + pos);
  if (!ms.length) return ["no morphemes"];
  if (ms.map(m => m.surface).join("") !== word) p.push(`surfaces join to "${ms.map(m => m.surface).join("")}"`);
  let seenI = false;
  ms.forEach((m, i) => {
    if (!CODES.has(m.code)) p.push(`m${i}: bad code ${m.code}`);
    if (m.code === "I") seenI = true; else if (seenI) p.push(`m${i}: non-inflection after inflection`);
    if (m.surface === "" && m.code !== "I") p.push(`m${i}: empty surface`);
    if (!ADV && m.code === "P" && !PREFIXES.has(m.form.replace(/-/g, "").toLowerCase()) && m.surface) p.push(`m${i}: prefix ${m.form} is not on the allowed list`);
    if (!ADV && (m.code === "S" || m.code === "I") && !SUFFIXES.has(m.form.replace(/^-/, "").toLowerCase())) p.push(`m${i}: suffix ${m.form} is not on the allowed list`);
    if (m.code === "P" && !/-$/.test(m.form)) p.push(`m${i}: prefix form needs trailing hyphen`);
    if ((m.code === "S" || m.code === "I") && !/^-/.test(m.form)) p.push(`m${i}: suffix form needs leading hyphen`);
    if (m.code === "R" && /^-|-$/.test(m.form)) p.push(`m${i}: free root has hyphen`);
    if ((m.code === "R" || m.code === "B") && m.cat && !["N", "V", "Adj", "Adv"].includes(m.cat)) p.push(`m${i}: root needs cat N/V/Adj/Adv`);
    if (m.variant && INFL_VAR.test(m.variant) && m.code !== "I") p.push(`m${i}: ${m.variant} must be code I`);
    if (m.variant && !INFL_VAR.test(m.variant) && m.code === "I") p.push(`m${i}: ${m.variant} must not be code I`);
  });
  // The stem may only change by regular spelling rules (e dropped, y→i) or before the -ion family.
  if (!ADV) ms.forEach((m, i) => {
    const nx = ms[i + 1];
    if (m.code !== "R" || !nx || nx.code === "P" || nx.code === "R" || nx.code === "B" || m.surface === m.form || m.surface === "") return;
    if (nx.surface === "") return;                                              // zero morpheme: irregular form (mice, went)
    const a = m.surface, b = m.form;
    const truncation = b.startsWith(a) && a.length >= 3 && b.length - a.length <= 3 && /^[aeiouy]/.test(nx.surface);   // religion → religi + ous (final segment truncated)
    const doubled = a.length === b.length + 1 && a.startsWith(b) && a[a.length - 1] === b[b.length - 1];                         // map → mapp + ing
    let cp = 0; while (cp < a.length && cp < b.length && a[cp] === b[cp]) cp++;
    const latinate = cp >= 3 && b.length - cp <= 3 && a.length - cp <= 3 && LATINATE.has(nx.form.replace(/^-/, ""));          // apprehend → apprehens + ive
    const regular = truncation || doubled || latinate || b.slice(0, -1) === a && b.endsWith("e") || b.slice(0, -1) + "i" === a && b.endsWith("y") || a === b
      || (b.endsWith("le") && b.slice(0, -2) + "i" === a.slice(0, -1) && a.endsWith("l") && nx.surface === "ity")      // able → abil + ity
      || (b.endsWith("le") && b.slice(0, -2) === a && nx.form === "-ly")                                              // simple → simp + ly
      || (b.endsWith("ll") && b.slice(0, -1) === a && nx.form === "-ly")                                              // full → ful + ly
      || (b.endsWith("f") && b.slice(0, -1) + "v" === a && /^-e?s$/.test(nx.form))                                      // self → selv + es
      || (b.endsWith("fe") && b.slice(0, -2) + "v" === a && /^-e?s$/.test(nx.form));                                    // life → liv + es
    const ionFamily = /ion$/.test(nx.surface) || /^-?(ion|tion|sion|ation|ition)$/.test(nx.form);
    if (!regular && !ionFamily) p.push(`m${i}: stem "${b}" is spelled "${a}" before ${nx.form} (irregular stem change: fossilised? keep the word as one morpheme)`);
    if (nx.form === "-th" && a !== b) p.push(`m${i}: -th only on an unchanged base`);
  });
  if (!ms.some(m => m.code === "R" || m.code === "B")) p.push("no root");
  if (ms.some(m => m.code === "B") && ms.length < 2) p.push("bound root without affix");
  return p;
}

// Fossilised derivations: one morpheme, whatever the AI proposed (see "Core principle" in MUSE-PROMPT.md).
const LATINATE = new Set("ive ible able ion tion sion ation ition ant ent ate or ory atory ee ic ical ity cy ism ist al ial ous ious eous ence ance ency ancy ify ize ise ure ular ar ator".split(" "));
const FOSSIL = new Set("scientist scientific health wealth stealth filth gift depth width truth length strength youth flight height weight lawyer service justice agency entry ministry introduce northern southern eastern western".split(" "));
const CAT = { noun: "N", verb: "V", adj: "Adj", adv: "Adv" };
const MANUAL = new Set(fs.existsSync("lexicon-adv-src/out-adv-zz-manual.txt") ? fs.readFileSync("lexicon-adv-src/out-adv-zz-manual.txt", "utf8").split("\n").map(l => l.split("\t")[0]).filter(Boolean) : []);
const lex = new Map(), rejected = [];
let lines = 0, dup = 0;
for (const f of files) {
  for (const raw of fs.readFileSync(f, "utf8").split("\n")) {
    if (!raw.trim()) continue;
    lines++;
    const parts = raw.split("\t");
    if (parts.length !== 3) { rejected.push(raw + "\t# expected 3 tab-separated fields"); continue; }
    const [word, pos, body] = parts;
    if (ADV && body === "=") continue;                                          // same as the basic cut: nothing to store
    if (body === "?") { rejected.push(raw + "\t# Muse marked as non-word"); continue; }
    if (!ADV && FOSSIL.has(word)) { lex.set(word, pos + "\t" + [word, word, "R", CAT[pos] || "N"].join("|")); continue; }
    const ms = body.split(" ; ").map(t => { const [form, surface, code, cat, variant, allo, gloss] = t.split("|"); return { form, surface, code, cat: cat || "", variant: variant || "", allo: allo || "", gloss: (gloss || "").trim() }; });
    const probs = check(word, pos, ms);
    if (probs.length) { rejected.push(raw + "\t# " + probs.join("; ")); continue; }
    if (lex.has(word)) dup++;
    lex.set(word, pos + "\t" + body);
  }
}
// A root that is itself a derived word in the lexicon is cut down to its own root:
// unemployment = un- + employment  →  un- + employ + -ment  (the course cuts all the way to the root).
const parse = body => body.split(" ; ").map(t => { const [form, surface, code, cat, variant, allo, gloss] = t.split("|"); return { form, surface, code, cat: cat || "", variant: variant || "", allo: allo || "", gloss: gloss || "" }; });
const unparse = ms => ms.map(m => [m.form, m.surface, m.code, m.cat, m.variant, m.allo, m.gloss].join("|").replace(/\|+$/, "")).join(" ; ");
// Consistency: a word Muse kept whole (active) while at least three other words cut the same letters the
// same way (reactive, inactive, interactive = … + act + -ive) is cut like its family: active = act + -ive.
const PROTECT = new Set([...FOSSIL, ..."employ deploy enjoy refer prefer defer confer infer transfer mouse".split(" "),
  ...(fs.existsSync("data.js") ? [...fs.readFileSync("data.js", "utf8").matchAll(/^ "([a-z]+)": \{/gm)].map(m => m[1]) : [])]);
let reconciled = [];
if (!ADV) {
  for (let round = 0; round < 3; round++) {
    const votes = new Map();
    for (const [w, v] of lex) {
      const ms = parse(v.split("\t")[1]);
      if (ms.length < 3 && !ms.some(m => m.code === "P")) { /* two-morpheme words vote too */ }
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
        const seq = ms.slice(i, j + 1);
        if (seq.some(m => m.code === "I") || seq.some(m => m.code === "B") || !seq.some(m => m.code === "R") || !seq.some(m => m.code === "P" || m.code === "S")) continue;
        const surf = seq.map(m => m.surface).join("");
        if (surf === w) continue;
        const base = lex.get(surf);
        if (!base || base.split("\t")[1].includes(" ; ") || PROTECT.has(surf)) continue;
        const key = unparse(seq.map(m => ({ ...m, gloss: "" })));
        const e = votes.get(surf) || votes.set(surf, new Map()).get(surf);
        (e.get(key) || e.set(key, new Set()).get(key)).add(w);
      }
    }
    let n = 0;
    for (const [surf, e] of votes) {
      const [key, ws] = [...e.entries()].sort((a, b) => b[1].size - a[1].size)[0];
      if (ws.size >= 4) { const pos = lex.get(surf).split("\t")[0]; lex.set(surf, pos + "\t" + key); reconciled.push(`${surf} = ${key.split(" ; ").map(x => x.split("|")[0]).join(" + ")} (${ws.size}: ${[...ws].slice(0, 3).join(", ")})`); n++; }
    }
    if (!n) break;
  }
  fs.writeFileSync(rejFile.replace(/\.txt$/, "") + "-reconciled.txt", reconciled.join("\n") + "\n");
}
let expanded = 0;
for (let pass = 0; pass < (ADV ? 0 : 5); pass++) {
  let changed = false;
  for (const [w, v] of lex) {
    const [pos, body] = v.split("\t");
    const ms = parse(body), out = [];
    let did = false;
    for (const m of ms) {
      const base = m.code === "R" && m.form !== w ? lex.get(m.form) : null;
      const bms = base ? parse(base.split("\t")[1]) : null;
      if (bms && bms.length > 1 && !bms.some(b => b.code === "I")) {
        const joined = bms.map(b => b.surface).join("");
        const cut = joined.length - m.surface.length;          // root spelled with its final letter(s) cut off: active → activ + ate
        const last = bms[bms.length - 1];
        if (m.surface === joined) { out.push(...bms); did = true; continue; }
        if (cut > 0 && cut <= 2 && joined.startsWith(m.surface) && last.surface.length > cut) {
          out.push(...bms.slice(0, -1), { ...last, surface: last.surface.slice(0, last.surface.length - cut) }); did = true; continue;
        }
      }
      out.push(m);
    }
    if (did) { lex.set(w, pos + "\t" + unparse(out)); changed = true; expanded++; }
  }
  if (!changed) break;
}
// Advanced layer: a bound root must recur (at least 3 words) or the cut is dropped. The word falls back to the basic cut.
const pruned = [];
if (ADV) {
  const MIN = 3, norm = f => f.replace(/-/g, "").toLowerCase(), uses = new Map();
  for (const [w, v] of lex) for (const m of parse(v.split("\t")[1])) if (m.code === "B") (uses.get(norm(m.form)) || uses.set(norm(m.form), new Set()).get(norm(m.form))).add(w);
  for (const [w, v] of [...lex]) {
    const weak = parse(v.split("\t")[1]).filter(m => m.code === "B" && uses.get(norm(m.form)).size < MIN).map(m => m.form);
    if (weak.length && !MANUAL.has(w)) { lex.delete(w); pruned.push(w + "\t" + weak.join(",")); }
  }
  fs.writeFileSync(rejFile.replace(/\.txt$/, "") + "-pruned.txt", pruned.join("\n") + "\n");
}
const shards = {};
for (const [w, v] of lex) (shards[w.slice(0, 2)] ||= {})[w] = v;
fs.mkdirSync(outDir, { recursive: true });
for (const [k, o] of Object.entries(shards)) fs.writeFileSync(`${outDir}/${k}.json`, JSON.stringify(o));
fs.writeFileSync(rejFile, rejected.join("\n") + (rejected.length ? "\n" : ""));
const multi = [...lex.values()].filter(v => v.includes(" ; ")).length;
console.log(`${lines} lines, ${lex.size} accepted (${multi} cut into 2+ morphemes), ${rejected.length} rejected, ${dup} duplicates, ${pruned.length} weak advanced cuts dropped, ${reconciled.length} whole words re-cut like their family, ${expanded} roots expanded to their own root, ${Object.keys(shards).length} shards`);
