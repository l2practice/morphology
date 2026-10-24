#!/usr/bin/env python3
"""List dictionary words whose etymology goes back to Latin or Greek: candidates for the ADVANCED morpheme layer.

usage: make-adv-candidates.py <data version dir> <outdir> [size=150] [maxrank=60000]
Output: outdir/adv-NNNN.txt, lines "word<TAB>etymology (first 170 characters)", most frequent first.
"""
import sys, os, re, json, glob
base, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 150
maxrank = int(sys.argv[4]) if len(sys.argv) > 4 else 60000
plain = set()
for line in open(os.path.join(base, "words.txt"), encoding="utf-8"):
    w, _, r = line.rstrip("\n").partition("\t")
    if re.fullmatch(r"[a-z]{4,}", w) and r.strip().isdigit() and int(r) <= maxrank:
        plain.add(w)
LAT = re.compile(r"\b(Latin|Ancient Greek|Greek|Old French|French)\b")
rows = []
for f in glob.glob(os.path.join(base, "e", "*.json")):
    for w, e in json.load(open(f, encoding="utf-8")).items():
        if w not in plain:
            continue
        et = next((b.get("etymology") for b in e.get("blocks", []) if b.get("etymology")), None)
        m = re.search(r"\b(Latin|Ancient Greek|Greek)\b", et or "")
        native = re.search(r"Old English|Proto-Germanic|Old Norse", et or "")
        if m and not (native and native.start() < m.start()):
            rows.append((int(e.get("rank") or 10**9), w, re.sub(r"\s+", " ", et)[:170]))
rows.sort()
os.makedirs(out, exist_ok=True)
for i in range(0, len(rows), size):
    open(f"{out}/adv-{i // size + 1:04d}.txt", "w").write("".join(f"{w}\t{et}\n" for _, w, et in rows[i:i + size]))
print(len(rows), "words,", -(-len(rows) // size), "batches")
