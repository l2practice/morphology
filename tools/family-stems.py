#!/usr/bin/env python3
"""Advanced layer: bound stems found from word families (vulner- in vulnerable, vulnerability, vulnerably; pres- in presence,
present, omnipresent). A stem counts when it is NOT a word itself, is at least 4 letters, and at least 3 different words are
built as  prefix* + stem + suffix+  from the course's own prefix and suffix lists. Words are then cut into those pieces.
usage: family-stems.py <words.txt> <lexicon dir> <adv lexicon dir> <out file> [maxrank=40000] [batch dir] [dictionary version dir]
With a batch dir the proposals are written as batches for Muse to confirm or reject (work/stem/stem-NNNN.txt), each line
"word<TAB>proposed cut<TAB>other words of the family<TAB>etymology"; the heuristic is liberal, Muse is the judge."""
import json, glob, sys, re, collections, os
wordsf, lexdir, advdir, outf = sys.argv[1:5]
maxrank = int(sys.argv[5]) if len(sys.argv) > 5 else 40000
batchdir = sys.argv[6] if len(sys.argv) > 6 else None
ddir = sys.argv[7] if len(sys.argv) > 7 else None
C = json.load(open("docs/course-affixes.json", encoding="utf-8"))
INFL = {"s", "es", "ed", "ing", "er", "est", "en", "a"}
SUF1 = {s for s in C["suffix"] if s not in INFL and len(s) >= 2} | {"ly"}
# spelled-together endings that are really two suffixes (vulner-able + -ity = vulnerability)
COMPOSITE = {"ability": ["able", "ity"], "ibility": ["ible", "ity"], "ably": ["able", "ly"], "ibly": ["ible", "ly"],
             "ically": ["ical", "ly"], "ization": ["ize", "ation"], "isation": ["ise", "ation"], "ively": ["ive", "ly"], "ously": ["ous", "ly"],
             "ality": ["al", "ity"], "ional": ["ion", "al"], "ional": ["ion", "al"], "ationally": ["ation", "al", "ly"]}
SUF = sorted(SUF1 | set(COMPOSITE), key=lambda s: -len(s))
PRE = sorted({p for p in C["prefix"] if len(p) >= 2} | {"un", "re", "in", "im", "dis", "mis", "non", "de", "pre", "pro", "con", "com", "ex"}, key=lambda s: -len(s))
SKIP = set(open("tools/family-stems-skip.txt").read().split()) if os.path.exists("tools/family-stems-skip.txt") else set()
rank, words = {}, set()
for l in open(wordsf, encoding="utf-8"):
    w, _, r = l.rstrip("\n").partition("\t")
    if re.fullmatch(r"[a-z]{4,}", w):
        words.add(w)
        if r.strip().isdigit(): rank[w] = int(r)
lex = {}
for f in glob.glob(lexdir + "/*.json"): lex.update(json.load(open(f, encoding="utf-8")))
adv = {}
for f in glob.glob(advdir + "/*.json"): adv.update(json.load(open(f, encoding="utf-8")))
def parses(w):
    """all (prefixes, stem, suffixes) with at least one suffix and a stem of 4+ letters"""
    out = []
    def pre(i, ps):
        out_s = w[i:]
        suf(out_s, ps, [])
        for p in PRE:
            if w.startswith(p, i) and len(w) - i - len(p) >= 5: pre(i + len(p), ps + [p])
    def suf(rest, ps, ss):
        if ss and len(rest) >= 4: out.append((ps, rest, ss))
        for s in SUF:
            if rest.endswith(s) and len(rest) - len(s) >= 4 and len(ss) < 3: suf(rest[: -len(s)], ps, COMPOSITE.get(s, [s]) + ss)
    pre(0, [])
    return out
fam = collections.defaultdict(set)
allp = {}
for w in words:
    if rank.get(w, 10**9) > 90000: continue
    ps = parses(w)
    allp[w] = ps
    for p, stem, ss in ps:
        fam[stem].add(w)
def free(stem):
    return stem in words or stem + "e" in words or (stem.endswith("i") and stem[:-1] + "y" in words) or (len(stem) > 2 and stem[-1] == stem[-2] and stem[:-1] in words)
good = {s: ws for s, ws in fam.items() if len(ws) >= 3 and not free(s) and s not in SKIP}
# a stem must be backed by at least two different suffixes
def suffixes_of(stem): return {tuple(ss) for w in good[stem] for p, st, ss in allp[w] if st == stem}
def finals(stem): return {ss[-1] for w in good[stem] for p, st, ss in allp[w] if st == stem}
if batchdir: good = {s: ws for s, ws in good.items() if len(ws) >= 3 and len(finals(s)) >= 2}      # liberal: Muse decides
else: good = {s: ws for s, ws in good.items() if len(ws) >= 4 and len(finals(s)) >= 3}
out, byStem = [], collections.defaultdict(list)
for w in sorted(words):
    if rank.get(w, 10**9) > maxrank or w in adv or w not in lex or " ; " in lex[w].split("\t")[1] or w in SKIP: continue
    cands = [(p, st, ss) for p, st, ss in allp.get(w, []) if st in good]
    if not cands: continue
    p, st, ss = min(cands, key=lambda c: (len(c[2]) + len(c[0]), -len(c[1])))
    pos = lex[w].split("\t")[0]
    ms = [f"{x}-|{x}|P" for x in p] + [f"-{st}-|{st}|B|V|||"] + [f"-{x}|{x}|S" for x in ss]
    out.append(f"{w}\t{pos}\t" + " ; ".join(ms)); byStem[st].append(w)
open(outf, "w", encoding="utf-8").write("\n".join(out) + "\n")
if batchdir:
    def fnv(x):
        h = 0x811c9dc5
        for b in x.encode("utf-8"): h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
        return h
    shards = {}
    def etym(w):
        k = fnv(w) % 2048
        if k not in shards:
            pth = f"{ddir}/e/{k:04d}.json"
            shards[k] = json.load(open(pth, encoding="utf-8")) if os.path.exists(pth) else {}
        e = shards[k].get(w)
        return re.sub(r"\s+", " ", next((b.get("etymology") for b in (e or {}).get("blocks", []) if b.get("etymology")), "") or "")[:170]
    rows = []
    for line in out:
        w, pos, body = line.split("\t")
        cut = " + ".join(m.split("|")[0] for m in body.split(" ; "))
        stem = re.search(r"-(\w+)-\|", body).group(1)
        others = ", ".join(sorted(good[stem] - {w}, key=lambda x: rank.get(x, 10**9))[:4])
        rows.append((rank.get(w, 10**9), f"{w}\t{cut}\t{others}\t{etym(w)}\n"))
    rows.sort()
    os.makedirs(batchdir, exist_ok=True)
    for f in glob.glob(batchdir + "/stem-*.txt"): os.remove(f)
    for i in range(0, len(rows), 150):
        open(f"{batchdir}/stem-{i // 150 + 1:04d}.txt", "w").write("".join(r[1] for r in rows[i:i + 150]))
    print(len(rows), "proposals in", -(-len(rows) // 150), "batches")
print(len(good), "bound stems,", len(out), "words cut")
for st, ws in sorted(byStem.items(), key=lambda x: -len(x[1]))[:45]: print(f"  {st}: {len(ws)} {', '.join(ws[:6])}")
