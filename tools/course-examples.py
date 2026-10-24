#!/usr/bin/env python3
"""Make the lexicon follow the course list where the dictionary agrees.
Every example word in docs/course-affixes.json is re-cut with the affix it illustrates, but only when the
dictionary's own etymology says so ("From north + -ern", "From un- + happy"). That keeps justice/service/northern
(taught as -ice/-ern) and drops accidents such as human = hum + -an.
usage: course-examples.py <lexicon dir> <dictionary version dir> <out file>   (lexicon dir = a build WITHOUT the out file)"""
import json, glob, sys, re, os
lexdir, ddir, outf = sys.argv[1:4]
lex = {}
for f in glob.glob(lexdir + "/*.json"):
    lex.update(json.load(open(f, encoding="utf-8")))
C = json.load(open("docs/course-affixes.json", encoding="utf-8"))
SKIP = set(open("tools/course-examples-skip.txt").read().split()) if os.path.exists("tools/course-examples-skip.txt") else set()
def fnv(s):
    h = 0x811c9dc5
    for b in s.encode("utf-8"): h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h
shards = {}
def etym(w):
    k = fnv(w) % 2048
    if k not in shards:
        p = f"{ddir}/e/{k:04d}.json"
        shards[k] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
    e = shards[k].get(w)
    return " ".join(b.get("etymology") or "" for b in (e or {}).get("blocks", []))
def parse(body): return [(m.split("|") + [""] * 7)[:7] for m in body.split(" ; ")]
def unparse(ms): return " ; ".join("|".join(m).rstrip("|") for m in ms)
def cut_of(w):
    v = lex.get(w)
    return parse(v.split("\t")[1]) if v else None
def bases(s, a):
    yield s, 0
    if a[0] in "aeiouy":
        yield s + "e", 1                        # serv|ice ← serve
        if s.endswith("i"): yield s[:-1] + "y", 1
        if len(s) > 2 and s[-1] == s[-2]: yield s[:-1], 1
INFL = {"s", "es", "ed", "ing", "er", "est", "ly", "a", "en"}
out, log = [], []
for kind in ("suffix", "prefix"):
    for aff, e in C[kind].items():
        if kind == "suffix" and aff in INFL: continue
        for w in e["ex"]:
            w = w.lower()
            if not re.fullmatch(r"[a-z]+", w) or w not in lex or w in SKIP: continue
            et = etym(w)
            pos = lex[w].split("\t")[0]
            new = None
            if kind == "suffix" and w.endswith(aff) and len(w) - len(aff) >= 3:
                for base, drop in bases(w[: -len(aff)], aff):
                    b = cut_of(base)
                    if not b or any(m[2] == "I" for m in b) or base in C["prefix"]: continue    # a combining form (geo, photo) is not a free word
                    if not re.search(r"\b" + re.escape(base) + r"\b[^.;]{0,60}\+\s*-" + re.escape(aff) + r"\b", et): continue
                    b = [m[:] for m in b]
                    if drop and len(b[-1][1]) > 1: b[-1][1] = b[-1][1][:-1]
                    if "".join(m[1] for m in b) + aff != w: continue
                    new = b + [["-" + aff, aff, "S", "", "", "", ""]]
                    break
            elif kind == "prefix" and w.startswith(aff) and len(w) - len(aff) >= 3:
                r = w[len(aff):]
                b = cut_of(r)
                if b and not any(m[2] == "I" for m in b) and re.search(r"\b" + re.escape(aff) + r"-\s*\+\s*" + re.escape(r) + r"\b", et):
                    new = [[aff + "-", aff, "P", "", "", "", ""]] + [m[:] for m in b]
            if new and len(new) != len(parse(lex[w].split("\t")[1])):    # only when the course list changes the number of morphemes
                out.append(f"{w}\t{pos}\t{unparse(new)}")
                log.append(f"{w}: " + " + ".join(m[0] for m in parse(lex[w].split("\t")[1])) + " → " + " + ".join(m[0] for m in new))
open(outf, "w", encoding="utf-8").write("\n".join(out) + ("\n" if out else ""))
open("lexicon-src/course-examples-changed.txt", "w").write("\n".join(log) + "\n")
print(len(out), "words re-cut (course example + dictionary etymology agree)")
