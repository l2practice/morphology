#!/usr/bin/env python3
"""Cuts the dictionary itself states: "From omni- + presence", "From insect + -oid".
For every word the lexicon still has as ONE morpheme, if the dictionary's etymology begins "From prefix- + word" or
"From word + -suffix", the prefix/suffix is in the course list (or a standard prefix) and the other part is a lexicon
word, cut the word that way. Also: -ence/-ance/-ency/-ancy words whose adjective in -ent/-ant exists (present → presence).
usage: etymology-cuts.py <lexicon dir> <dictionary version dir> <out file> [maxrank=60000]"""
import json, glob, sys, re, os
lexdir, ddir, outf = sys.argv[1:4]
maxrank = int(sys.argv[4]) if len(sys.argv) > 4 else 60000
lex = {}
for f in glob.glob(lexdir + "/*.json"):
    lex.update(json.load(open(f, encoding="utf-8")))
C = json.load(open("docs/course-affixes.json", encoding="utf-8"))
INFL = {"s", "es", "ed", "ing", "er", "est", "ly", "a", "en"}
PRE = set(C["prefix"]) | {"un", "re", "in", "im", "il", "ir", "dis", "mis", "non", "de", "pre", "post", "over", "under", "out", "sub", "super", "inter", "trans", "counter", "contra", "mid", "fore", "anti", "auto", "co", "ex", "up", "with", "by", "be", "en", "em"}
SUF = {s for s in C["suffix"] if s not in INFL}
SKIP = set(open("tools/etymology-cuts-skip.txt").read().split()) if os.path.exists("tools/etymology-cuts-skip.txt") else set()
rank = {}
for l in open(ddir + "/words.txt", encoding="utf-8"):
    w, _, r = l.rstrip("\n").partition("\t")
    if r.strip().isdigit(): rank[w] = int(r)
def parse(body): return [(m.split("|") + [""] * 7)[:7] for m in body.split(" ; ")]
def unparse(ms): return " ; ".join("|".join(m).rstrip("|") for m in ms)
def cut_of(w):
    v = lex.get(w)
    return parse(v.split("\t")[1]) if v else None
def single(w): return w in lex and " ; " not in lex[w].split("\t")[1]
def fnv(s):
    h = 0x811c9dc5
    for b in s.encode("utf-8"): h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h
sh = {}
def etym(w):
    k = fnv(w) % 2048
    if k not in sh:
        p = f"{ddir}/e/{k:04d}.json"
        sh[k] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
    e = sh[k].get(w)
    return next((b.get("etymology") for b in (e or {}).get("blocks", []) if b.get("etymology")), "") or ""
out, log = [], []
def emit(w, new, why):
    pos = lex[w].split("\t")[0]
    out.append(f"{w}\t{pos}\t{unparse(new)}")
    log.append(f"{w}: {why}")
for w in sorted(lex):
    if not single(w) or w in SKIP or rank.get(w, 10**9) > maxrank or not re.fullmatch(r"[a-z]{5,}", w): continue
    et = etym(w)
    m = re.search(r"(?:^|[,;.]\s*)(?:[Ff]rom|[Ee]quivalent to|[Cc]ompound of)\s+([a-z]+)-\s*\+\s*([a-z]+)\b", et)
    if m and m.group(1) in PRE and w == m.group(1) + m.group(2) and cut_of(m.group(2)) and not any(x[2] == "I" for x in cut_of(m.group(2))) and len(m.group(2)) >= 4:
        new = [[m.group(1) + "-", m.group(1), "P", "", "", "", ""]] + [x[:] for x in cut_of(m.group(2))]
        emit(w, new, f"{m.group(1)}- + {m.group(2)}"); continue
    m = re.search(r"(?:^|[,;.]\s*)(?:[Ff]rom|[Ee]quivalent to)\s+([a-z]+)\s*\+\s*-([a-z]+)\b", et)
    if m and m.group(2) in SUF and cut_of(m.group(1)) and len(m.group(1)) >= 4:
        base, aff = m.group(1), m.group(2)
        b = [x[:] for x in cut_of(base)]
        if any(x[2] == "I" for x in b): continue
        joined = "".join(x[1] for x in b)
        for drop in (0, 1):                                    # serve + ice → serv|ice ; happy → happi
            stem = w[: -len(aff)]
            if joined[: len(joined) - drop] == stem or (b[-1][1].endswith("y") and joined[:-1] + "i" == stem):
                if drop and len(b[-1][1]) > 1: b[-1][1] = b[-1][1][:-1]
                if b[-1][1].endswith("y") and stem.endswith("i"): b[-1][1] = b[-1][1][:-1] + "i"
                if "".join(x[1] for x in b) + aff == w:
                    emit(w, b + [[f"-{aff}", aff, "S", "", "", "", ""]], f"{base} + -{aff}")
                break
# -ent → -ence family: present/presence, absent/absence, patient/patience, urgent/urgency
for w in sorted(lex):
    if not single(w) or w in SKIP or rank.get(w, 10**9) > maxrank: continue
    m = re.fullmatch(r"([a-z]{3,})(ence|ency|ance|ancy)", w)
    if not m: continue
    adj = m.group(1) + ("ent" if m.group(2).startswith("e") else "ant")
    if single(adj) and lex[adj].split("\t")[1].split("|")[2] == "R":
        pos = lex[w].split("\t")[0]
        base = parse(lex[adj].split("\t")[1])[0]
        out.append(f"{w}\t{pos}\t{adj}|{m.group(1)}|R|{base[3] or 'Adj'} ; -{m.group(2)}|{m.group(2)}|S")
        log.append(f"{w}: {adj} + -{m.group(2)}")
open(outf, "w", encoding="utf-8").write("\n".join(out) + ("\n" if out else ""))
open("lexicon-src/etymology-cuts-changed.txt", "w").write("\n".join(log) + "\n")
print(len(out), "words cut as the dictionary states")
