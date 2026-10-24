#!/usr/bin/env python3
"""Quality report for a built lexicon directory (shards of {word: "pos\\tmorphemes"}).
usage: lexicon-report.py <lexicon dir> [sample=40]"""
import sys, json, glob, collections, random
d = {}
for f in glob.glob(sys.argv[1] + "/*.json"):
    d.update(json.load(open(f, encoding="utf-8")))
sample = int(sys.argv[2]) if len(sys.argv) > 2 else 40
cnt = collections.Counter(); roots = collections.defaultdict(set); aff = collections.Counter(); multi = []
for w, v in d.items():
    ms = [m.split("|") for m in v.split("\t")[1].split(" ; ")]
    cnt[len(ms)] += 1
    if len(ms) > 1: multi.append(w)
    for m in ms:
        if m[2] == "B": roots[m[0]].add(w)
        if m[2] in "PS": aff[m[0]] += 1
print(f"{len(d)} words; by morpheme count: {dict(sorted(cnt.items()))}")
print("most used affixes:", ", ".join(f"{a} {n}" for a, n in aff.most_common(25)))
rare = sorted((len(ws), r, sorted(ws)[:4]) for r, ws in roots.items() if len(ws) < 3)
print(f"bound roots used in fewer than 3 words: {len(rare)}")
for n, r, ws in rare[:40]: print(f"   {r} ({n}): {', '.join(ws)}")
random.seed(1)
print("\nrandom multi-morpheme cuts to read:")
for w in random.sample(multi, min(sample, len(multi))):
    print("  ", w, "=", " + ".join(m.split("|")[0] for m in d[w].split("\t")[1].split(" ; ")))
