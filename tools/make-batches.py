#!/usr/bin/env python3
"""Split the dictionary word list into batches for Muse (see MUSE-PROMPT.md).

usage: make-batches.py words.txt outdir [size=200]
Plain a-z headwords only, most frequent first (words without a rank go last).
Writes outdir/in-0001.txt ... (one word per line) and outdir/pilot.txt (tricky words to test the prompt).
"""
import sys, os, re
src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 200
rows = []
for line in open(src, encoding="utf-8"):
    w, _, r = line.rstrip("\n").partition("\t")
    if re.fullmatch(r"[a-z]{2,}", w):
        rows.append((int(r) if r.strip().isdigit() else 10**9, w))
rows.sort()
words = [w for _, w in rows]
os.makedirs(out, exist_ok=True)
for i in range(0, len(words), size):
    open(f"{out}/in-{i // size + 1:04d}.txt", "w").write("\n".join(words[i:i + size]) + "\n")
pilot = """unhappiness irrecoverably employ employment enjoy deploy refer receive reception recover mice children better
visibly receptionists sunflower construction destruction instruction nationalization happiness running meeting
interesting interested friendly quickly driver chatter teacher disrespectful illegal immature impossible
production reduction unbelievable misunderstanding reconstruction table window people animal corner butter
brunch laser went sang geese better best good wider happier""".split()
open(f"{out}/pilot.txt", "w").write("\n".join(dict.fromkeys(pilot)) + "\n")
print(len(words), "words,", -(-len(words) // size), "batches")
