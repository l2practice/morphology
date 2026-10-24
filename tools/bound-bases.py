#!/usr/bin/env python3
"""Cut words with the course's 100 bound bases: word = prefix* + base + suffix*, every piece from the course list.
Only words the lexicon still has as ONE morpheme are touched, and only when the base recurs in at least 3 words.
usage: bound-bases.py <lexicon dir> <out file> <words.txt> [maxrank=40000] [adv lexicon dir]
These cuts belong to the ADVANCED layer (bound-root analysis). Only common words (rank <= maxrank) are cut, and a
word that already has an advanced entry (Muse or manual) is left alone."""
import json, glob, sys, re, collections, os
lexdir, outf, wordsf = sys.argv[1:4]
maxrank = int(sys.argv[4]) if len(sys.argv) > 4 else 40000
advdir = sys.argv[5] if len(sys.argv) > 5 else None
lex = {}
for f in glob.glob(lexdir + "/*.json"):
    lex.update(json.load(open(f, encoding="utf-8")))
C = json.load(open("docs/course-affixes.json", encoding="utf-8"))
rank = {}
for l in open(wordsf, encoding="utf-8"):
    w, _, r = l.rstrip("\n").partition("\t")
    if r.strip().isdigit(): rank[w] = int(r)
adv = {}
if advdir:
    for f in glob.glob(advdir + "/*.json"): adv.update(json.load(open(f, encoding="utf-8")))
INFL = {"s", "es", "ed", "ing", "er", "est", "ly", "a", "en", "'s"}
SKIP = set(open("tools/bound-bases-skip.txt").read().split()) if os.path.exists("tools/bound-bases-skip.txt") else set()
prefixes = {p for p in C["prefix"] if len(p) >= 2}
suffixes = {s for s in C["suffix"] if s not in INFL and len(s) >= 2}
bases = {}                                   # spelling -> base key
for key, b in C["base"].items():
    for v in b["v"]:
        for sp in {v, v + "t"} if v[-1] in "cp" else {v}:
            bases.setdefault(sp, key)
# free roots already in use in other cuts (nation in national): never cut those words
used = collections.Counter()
for w, v in lex.items():
    for m in v.split("\t")[1].split(" ; "):
        f = m.split("|")
        if f[2] == "R" and f[0] == f[1] and " ; " in v: used[f[0]] += 1
def segment(w):
    best = None
    def go(i, parts, nb):
        nonlocal best
        if i == len(w):
            if nb >= 1 and len(parts) >= 2 and (best is None or len(parts) < len(best)): best = list(parts)
            return
        if best and len(parts) >= len(best): return
        for l in range(min(len(w) - i, 9), 1, -1):
            s = w[i:i + l]
            if not parts or parts[-1][0] == "P":
                if s in prefixes and i + l < len(w): parts.append(("P", s)); go(i + l, parts, nb); parts.pop()
            if s in bases and nb < 2 and (len(s) >= 4 or any(p[0] == "P" for p in parts)): parts.append(("B", s)); go(i + l, parts, nb + 1); parts.pop()
            if parts and parts[-1][0] in "BS" and s in suffixes: parts.append(("S", s)); go(i + l, parts, nb); parts.pop()
    go(0, [], 0)
    return best
cands, count = {}, collections.Counter()
for w, v in lex.items():
    pos, body = v.split("\t")
    if " ; " in body or not re.fullmatch(r"[a-z]{5,}", w) or w in SKIP or used[w]: continue
    seg = segment(w)
    if not seg: continue
    cands[w] = (pos, seg)
    for t, s in seg:
        if t == "B": count[bases[s]] += 1
out, ex = [], collections.defaultdict(list)
for w, (pos, seg) in sorted(cands.items()):
    if rank.get(w, 10**9) > maxrank or w in adv: continue                      # common words only; leave Muse's advanced cuts alone
    if any(count[bases[s]] < 3 for t, s in seg if t == "B"): continue            # the base must recur (counted over ALL words)
    ms = []
    for t, s in seg:
        if t == "P": ms.append(f"{s}-|{s}|P")
        elif t == "B":
            b = C["base"][bases[s]]
            ms.append(f"-{bases[s]}-|{s}|B|{'N' if b['o'].startswith('Greek') else 'V'}|||{b['o']}: {b['m'].lower()}")
        else: ms.append(f"-{s}|{s}|S")
    out.append(f"{w}\t{pos}\t" + " ; ".join(ms))
    for t, s in seg:
        if t == "B": ex[bases[s]].append(w)
open(outf, "w", encoding="utf-8").write("\n".join(out) + "\n")
print(len(out), "words cut with", len(ex), "of the course's bound bases")
for k, ws in sorted(ex.items(), key=lambda x: -len(x[1]))[:40]: print(f"  -{k}-: {len(ws)}  {', '.join(ws[:6])}")
