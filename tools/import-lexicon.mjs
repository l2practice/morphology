#!/usr/bin/env node
// Validate Muse output files and build the app's lexicon shards.
//   node tools/import-lexicon.mjs <outDir> <rejectedFile> <out-0001.txt> [more files...]
// Every line: word<TAB>pos<TAB>form|surface|code|cat|variant|allo ; ...
import fs from "node:fs";
const [outDir, rejFile, ...files] = process.argv.slice(2);
const CODES = new Set(["P", "R", "B", "S", "I"]);
const POS = new Set(["noun", "verb", "adj", "adv", "prep", "pron", "det", "conj", "interj", "?"]);
const PREFIXES = new Set("a an anti auto be bi by co com con contra counter de dis en ex extra fore hyper hypo il im in inter intra ir mal micro mid mis mono multi non out over para poly post pre pro per ad ac pseudo re semi sub super tele trans tri un under uni up with".split(" "));
const SUFFIXES = new Set("s es 's s' ed en ing er est ly ness ment tion sion ation ition ion ity ty ive ative itive ous ious eous al ial ual ful less able ible ist ism ize ise ify fy ish y hood ship dom ward wise ant ent ance ence ancy ency ary ory ic ical ure age ee eer ette let ling ster some like th ery ry or ess ate cy ian an ren".split(" "));
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
    if (m.code === "P" && !PREFIXES.has(m.form.replace(/-/g, "").toLowerCase()) && m.surface) p.push(`m${i}: prefix ${m.form} is not on the allowed list`);
    if ((m.code === "S" || m.code === "I") && !SUFFIXES.has(m.form.replace(/^-/, "").toLowerCase())) p.push(`m${i}: suffix ${m.form} is not on the allowed list`);
    if (m.code === "P" && !/-$/.test(m.form)) p.push(`m${i}: prefix form needs trailing hyphen`);
    if ((m.code === "S" || m.code === "I") && !/^-/.test(m.form)) p.push(`m${i}: suffix form needs leading hyphen`);
    if (m.code === "R" && /^-|-$/.test(m.form)) p.push(`m${i}: free root has hyphen`);
    if ((m.code === "R" || m.code === "B") && m.cat && !["N", "V", "Adj", "Adv"].includes(m.cat)) p.push(`m${i}: root needs cat N/V/Adj/Adv`);
    if (m.variant && INFL_VAR.test(m.variant) && m.code !== "I") p.push(`m${i}: ${m.variant} must be code I`);
    if (m.variant && !INFL_VAR.test(m.variant) && m.code === "I") p.push(`m${i}: ${m.variant} must not be code I`);
  });
  // The stem may only change by regular spelling rules (e dropped, y→i) or before the -ion family.
  ms.forEach((m, i) => {
    const nx = ms[i + 1];
    if (m.code !== "R" || !nx || nx.code === "P" || nx.code === "R" || nx.code === "B" || m.surface === m.form || m.surface === "") return;
    if (nx.surface === "") return;                                              // zero morpheme: irregular form (mice, went)
    const a = m.surface, b = m.form;
    const regular = b.slice(0, -1) === a && b.endsWith("e") || b.slice(0, -1) + "i" === a && b.endsWith("y") || a === b
      || (b.endsWith("le") && b.slice(0, -2) + "i" === a.slice(0, -1) && a.endsWith("l") && nx.surface === "ity")      // able → abil + ity
      || (b.endsWith("le") && b.slice(0, -2) === a && nx.form === "-ly")                                              // simple → simp + ly
      || (b.endsWith("ll") && b.slice(0, -1) === a && nx.form === "-ly")                                              // full → ful + ly
      || (b.endsWith("f") && b.slice(0, -1) + "v" === a && /^-s$/.test(nx.form))                                      // self → selv + es
      || (b.endsWith("fe") && b.slice(0, -2) + "v" === a && /^-s$/.test(nx.form));                                    // life → liv + es
    const ionFamily = /ion$/.test(nx.surface) || /^-?(ion|tion|sion|ation|ition)$/.test(nx.form);
    if (!regular && !ionFamily) p.push(`m${i}: stem "${b}" is spelled "${a}" before ${nx.form} (irregular stem change: fossilised? keep the word as one morpheme)`);
    if (nx.form === "-th" && a !== b) p.push(`m${i}: -th only on an unchanged base`);
  });
  if (!ms.some(m => m.code === "R" || m.code === "B")) p.push("no root");
  if (ms.some(m => m.code === "B") && ms.length < 2) p.push("bound root without affix");
  return p;
}

// Fossilised derivations: one morpheme, whatever the AI proposed (see "Core principle" in MUSE-PROMPT.md).
const FOSSIL = new Set("health wealth stealth filth gift depth width truth length strength youth flight height weight lawyer service justice northern southern eastern western".split(" "));
const CAT = { noun: "N", verb: "V", adj: "Adj", adv: "Adv" };
const lex = new Map(), rejected = [];
let lines = 0, dup = 0;
for (const f of files) {
  for (const raw of fs.readFileSync(f, "utf8").split("\n")) {
    if (!raw.trim()) continue;
    lines++;
    const parts = raw.split("\t");
    if (parts.length !== 3) { rejected.push(raw + "\t# expected 3 tab-separated fields"); continue; }
    const [word, pos, body] = parts;
    if (body === "?") { rejected.push(raw + "\t# Muse marked as non-word"); continue; }
    if (FOSSIL.has(word)) { lex.set(word, pos + "\t" + [word, word, "R", CAT[pos] || "N"].join("|")); continue; }
    const ms = body.split(" ; ").map(t => { const [form, surface, code, cat, variant, allo] = t.split("|"); return { form, surface, code, cat: cat || "", variant: variant || "", allo: allo || "" }; });
    const probs = check(word, pos, ms);
    if (probs.length) { rejected.push(raw + "\t# " + probs.join("; ")); continue; }
    if (lex.has(word)) dup++;
    lex.set(word, pos + "\t" + body);
  }
}
// A root that is itself a derived word in the lexicon is cut down to its own root:
// unemployment = un- + employment  →  un- + employ + -ment  (the course cuts all the way to the root).
const parse = body => body.split(" ; ").map(t => { const [form, surface, code, cat, variant, allo] = t.split("|"); return { form, surface, code, cat: cat || "", variant: variant || "", allo: allo || "" }; });
const unparse = ms => ms.map(m => [m.form, m.surface, m.code, m.cat, m.variant, m.allo].join("|").replace(/\|+$/, "")).join(" ; ");
let expanded = 0;
for (let pass = 0; pass < 5; pass++) {
  let changed = false;
  for (const [w, v] of lex) {
    const [pos, body] = v.split("\t");
    const ms = parse(body), out = [];
    let did = false;
    for (const m of ms) {
      const base = m.code === "R" && m.surface === m.form && m.form !== w ? lex.get(m.form) : null;
      const bms = base ? parse(base.split("\t")[1]) : null;
      if (bms && bms.length > 1 && !bms.some(b => b.code === "I") && bms.map(b => b.surface).join("") === m.surface) { out.push(...bms); did = true; }
      else out.push(m);
    }
    if (did) { lex.set(w, pos + "\t" + unparse(out)); changed = true; expanded++; }
  }
  if (!changed) break;
}
const shards = {};
for (const [w, v] of lex) (shards[w.slice(0, 2)] ||= {})[w] = v;
fs.mkdirSync(outDir, { recursive: true });
for (const [k, o] of Object.entries(shards)) fs.writeFileSync(`${outDir}/${k}.json`, JSON.stringify(o));
fs.writeFileSync(rejFile, rejected.join("\n") + (rejected.length ? "\n" : ""));
const multi = [...lex.values()].filter(v => v.includes(" ; ")).length;
console.log(`${lines} lines, ${lex.size} accepted (${multi} cut into 2+ morphemes), ${rejected.length} rejected, ${dup} duplicates, ${expanded} roots expanded to their own root, ${Object.keys(shards).length} shards`);
