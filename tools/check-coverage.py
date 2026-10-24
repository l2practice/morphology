#!/usr/bin/env python3
"""Compare every Muse output file with its input batch: same words, same order, 3 fields.
usage: check-coverage.py <work dir> <basic out dir> [adv out dir]"""
import sys, os, re, glob
work, bdir = sys.argv[1], sys.argv[2]
adir = sys.argv[3] if len(sys.argv) > 3 else None
bad = 0
def check(kind, outfile, infile, adv):
    global bad
    if not os.path.exists(infile):
        print(f"? {os.path.basename(outfile)}: no input file {os.path.basename(infile)}"); return
    want = [l.split("\t")[0] for l in open(infile, encoding="utf-8").read().split("\n") if l.strip()]
    got = [l.split("\t") for l in open(outfile, encoding="utf-8").read().split("\n") if l.strip()]
    gw = [g[0] for g in got]
    miss = [w for w in want if w not in set(gw)]
    extra = [w for w in gw if w not in set(want)]
    order = gw != want and not miss and not extra
    badfmt = [g[0] for g in got if len(g) != 3]
    if miss or extra or order or badfmt:
        bad += 1
        print(f"! {os.path.basename(outfile)}: missing {len(miss)} {miss[:5]}, extra {len(extra)} {extra[:5]}, order differs {order}, bad format {len(badfmt)} {badfmt[:5]}")
nb = 0
for f in sorted(glob.glob(os.path.join(bdir, "out-[0-9]*.txt"))):
    n = re.search(r"out-(\d+)", f).group(1); nb += 1
    check("basic", f, os.path.join(work, "in", f"in-{n}.txt"), False)
na = 0
if adir:
    for f in sorted(glob.glob(os.path.join(adir, "out-adv-*.txt"))):
        n = re.search(r"out-adv-(\d+)", f).group(1); na += 1
        check("adv", f, os.path.join(work, "adv", f"adv-{n}.txt"), True)
have = {re.search(r"out-(\d+)", f).group(1) for f in glob.glob(os.path.join(bdir, "out-[0-9]*.txt"))}
missing = [f"{i:04d}" for i in range(1, 428) if f"{i:04d}" not in have]
print(f"checked {nb} basic files, {na} advanced files; {bad} with problems; basic batches missing: {len(missing)} {missing[:8]}")
