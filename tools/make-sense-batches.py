#!/usr/bin/env python3
"""Batches for the prefix-sense job: every word whose cut has re-, in-/im-/il-/ir-, un-, de-, dis-, en-/em-.
usage: make-sense-batches.py <lexicon dir> <outdir> [size=200]   → outdir/sense-NNNN.txt, lines "word<TAB>cut<TAB>pos" """
import json, glob, sys, os
lexdir, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 200
PRE = {"re", "in", "im", "il", "ir", "un", "de", "dis", "en", "em"}
rows = []
for f in glob.glob(lexdir + "/*.json"):
    for w, v in json.load(open(f, encoding="utf-8")).items():
        pos, body = v.split("\t")
        ms = [m.split("|") for m in body.split(" ; ")]
        if any(m[2] == "P" and m[0].strip("-") in PRE for m in ms):
            rows.append((w, " + ".join(m[0] for m in ms), pos))
rows.sort()
os.makedirs(out, exist_ok=True)
for f in glob.glob(out + "/sense-*.txt"): os.remove(f)
for i in range(0, len(rows), size):
    open(f"{out}/sense-{i // size + 1:04d}.txt", "w").write("".join(f"{w}\t{c}\t{p}\n" for w, c, p in rows[i:i + size]))
print(len(rows), "words,", -(-len(rows) // size), "batches")
