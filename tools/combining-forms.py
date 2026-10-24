#!/usr/bin/env python3
"""Course convention: neo-classical combining forms are bound morphemes (sui- + -cide, omni- + -vore).
Rewrites lexicon-src/out-zz-manual.txt for the families listed in FAMILIES, taking the words from the built lexicon
that Muse left as one morpheme.   usage: combining-forms.py <lexicon dir> <out file>"""
import json, glob, re, sys
FAMILIES = {          # ending -> (meaning of the ending, class of the ending)
    "cide": ("kill", "V"),
    "vore": ("eat", "V"),
}
GLOSS = {  # meaning of the first element, where we are sure
    "sui": "self", "homi": "man, human", "geno": "race, kind", "pesti": "pest", "insecti": "insect", "herbi": "herb, plant",
    "fungi": "fungus", "regi": "king", "matri": "mother", "patri": "father", "fratri": "brother", "infanti": "infant",
    "germi": "germ", "vermi": "worm", "spermi": "sperm", "tyranni": "tyrant", "ovi": "egg",
    "omni": "all", "carni": "flesh, meat", "frugi": "fruit", "pisci": "fish", "hemo": "blood", "viro": "virus",
}
SKIP = {"decide", "coincide"}
lex = {}
for f in glob.glob(sys.argv[1] + "/*.json"):
    lex.update(json.load(open(f, encoding="utf-8")))
out = []
for w, v in sorted(lex.items()):
    pos, body = v.split("\t")
    if " ; " in body or w in SKIP:
        continue
    for end, (mean, cat) in FAMILIES.items():
        m = re.fullmatch(r"([a-z]{3,})" + end, w)
        if not m:
            continue
        stem = m.group(1)
        g = GLOSS.get(stem, "")
        first = f"{stem}-|{stem}|B|N|||{g}" if g else f"{stem}-|{stem}|B|N"
        out.append(f"{w}\t{pos}\t{first} ; -{end}|{end}|B|{cat}|||{mean}")
        break
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(out) + "\n")
print(len(out), "words in", ", ".join("-" + e for e in FAMILIES))
