#!/usr/bin/env python3
"""Word-family index: for every root (free or bound) the most frequent words that contain it, from the Basic and Advanced
lexicons. Written to lexicon-family/<first letter>.json as { root: [word, ...] }. The app uses it for the Word family tab
when the AI cannot supply a family.   usage: build-family.py <words.txt> <lexicon dir> <adv lexicon dir> <out dir>"""
import json, glob, sys, re, os, collections
wordsf, basicdir, advdir, outdir = sys.argv[1:5]
rank = {}
for l in open(wordsf, encoding="utf-8"):
    w, _, r = l.rstrip("\n").partition("\t")
    if r.strip().isdigit(): rank[w] = int(r)
fam = collections.defaultdict(set)
for d in (basicdir, advdir):
    for f in glob.glob(d + "/*.json"):
        for w, v in json.load(open(f, encoding="utf-8")).items():
            if not re.fullmatch(r"[a-z]{3,}", w): continue
            ms = [m.split("|") for m in v.split("\t")[1].split(" ; ")]
            for m in ms:
                if m[2] in "RB" and len(ms) > 1 or (m[2] == "R" and len(ms) == 1 and False):
                    key = m[0].replace("-", "").lower()
                    if len(key) >= 3: fam[key].add(w)
os.makedirs(outdir, exist_ok=True)
for f in glob.glob(outdir + "/*.json"): os.remove(f)
shards = collections.defaultdict(dict)
n = 0
for key, ws in fam.items():
    if len(ws) < 3: continue
    best = sorted(ws, key=lambda x: (rank.get(x, 10**9), len(x)))[:12]
    shards[key[0]][key] = best; n += 1
for k, d in shards.items():
    json.dump(d, open(f"{outdir}/{k}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(n, "roots with a family,", sum(os.path.getsize(f) for f in glob.glob(outdir + "/*.json")) // 1024, "KB")
