#!/usr/bin/env node
// Merge Muse's prefix-sense labels into the Basic lexicon.
//   node tools/apply-senses.mjs <lexicon dir> <out file> <sense output files...>
// Muse lines: word<TAB>label ; label   (one label per sense-bearing prefix, in order)   or   word<TAB>-   (no label fits / cut looks wrong)
// A label is kept only when it matches the prefix and the morphotactics rules still give a valid IC tree.
import fs from "node:fs";
import { createRequire } from "node:module";
globalThis.window = {};
createRequire(import.meta.url)("../morphotactics.js");
const T = window.MorphTactics;
const [dir, outFile, ...files] = process.argv.slice(2);
const lex = {};
for (const f of fs.readdirSync(dir)) Object.assign(lex, JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
const parse = body => body.split(" ; ").map(t => { const [form, surface, code, cat, variant, allo, gloss] = t.split("|"); return { form, surface, code, cat: cat || "", variant: variant || "", allo: allo || "", gloss: gloss || "" }; });
const unparse = ms => ms.map(m => [m.form, m.surface, m.code, m.cat, m.variant, m.allo, m.gloss].join("|").replace(/\|+$/, "")).join(" ; ");
const type = m => m.code === "P" ? "prefix" : m.code === "S" || m.code === "I" ? "suffix" : "root";
const cls = m => ({ P: "prefix-der", R: "root-free", B: "root-bound", S: "suffix-der", I: "suffix-inf" })[m.code];
const out = [], dropped = [];
let seen = 0, ok = 0, flagged = 0;
for (const f of files) {
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const [word, labelText] = line.split("\t");
    if (!lex[word] || labelText === undefined) continue;
    seen++;
    if (labelText.trim() === "-" || labelText.trim() === "?") { flagged++; dropped.push(`${word}\tflagged by Muse`); continue; }
    const [pos, body] = lex[word].split("\t");
    const ms = parse(body);
    const labels = labelText.split(" ; ").map(s => s.trim());
    const slots = ms.filter(m => m.code === "P" && /^(re|in|im|il|ir|un|de|dis|en|em)-$/.test(m.form));
    if (labels.length !== slots.length) { dropped.push(`${word}\twrong number of labels`); continue; }
    let good = true;
    slots.forEach((m, i) => { if (!T.PVARIANT[labels[i]] || !labels[i].startsWith(m.form.replace(/-$/, "") + "- (")) good = false; });
    if (!good) { dropped.push(`${word}\tlabel does not fit the prefix: ${labelText}`); continue; }
    const withLabels = ms.map(m => ({ ...m }));
    slots.forEach((m, i) => { withLabels.find(x => x === m || x.form === m.form && x.surface === m.surface).variant = labels[i]; });
    const forPlan = withLabels.map(m => ({ ...m, type: type(m), cls: cls(m) + (m.code === "I" ? "-inf" : "") }));
    forPlan.forEach(m => { if (m.code === "I") m.cls = "suffix-inf"; });
    if (!T.derive(forPlan).length) { dropped.push(`${word}\tno valid tree with ${labelText}`); continue; }
    out.push(`${word}\t${pos}\t${unparse(withLabels)}`); ok++;
  }
}
fs.writeFileSync(outFile, out.join("\n") + (out.length ? "\n" : ""));
fs.writeFileSync(outFile.replace(/\.txt$/, "") + "-dropped.txt", dropped.join("\n") + "\n");
console.log(`${seen} answers: ${ok} labels applied, ${flagged} flagged by Muse, ${dropped.length - flagged} dropped by the checks`);
