#!/usr/bin/env python3
"""Course convention: neo-classical combining forms are bound morphemes (sui- + -cide, omni- + -vore).
Rewrites lexicon-src/out-zz-manual.txt for the families listed in FAMILIES, taking the words from the built lexicon
that Muse left as one morpheme.   usage: combining-forms.py <lexicon dir> <out file>"""
import json, glob, re, sys
FAMILIES = {          # ending -> (meaning of the ending, class of the ending); edit this list to add or drop a family
    "cide": ("kill", "V"),
    "vore": ("eat", "V"),
    "logy": ("study, word", "N"),
    "graphy": ("writing, recording", "N"),
    "graph": ("write, record", "N"),
    "phone": ("sound", "N"),
    "scope": ("look at, see", "N"),
    "meter": ("measure", "N"),
    "phobia": ("fear", "N"),
    "philia": ("love", "N"),
    "phile": ("lover", "N"),
    "cracy": ("rule, power", "N"),
    "crat": ("ruler, member of a rule", "N"),
    "archy": ("rule", "N"),
}
GLOSS = {  # meaning of the first element, where we are sure
    "sui": "self", "homi": "man, human", "geno": "race, kind", "pesti": "pest", "insecti": "insect", "herbi": "herb, plant",
    "fungi": "fungus", "regi": "king", "matri": "mother", "patri": "father", "fratri": "brother", "infanti": "infant",
    "germi": "germ", "vermi": "worm", "spermi": "sperm", "tyranni": "tyrant", "ovi": "egg",
    "omni": "all, everywhere", "carni": "flesh, meat", "frugi": "fruit", "pisci": "fish", "hemo": "blood", "viro": "virus",
    "bio": "life", "geo": "earth", "psycho": "mind", "theo": "god", "zoo": "animal", "eco": "house, environment",
    "anthropo": "human", "socio": "society", "physio": "nature", "patho": "disease", "cardio": "heart", "neuro": "nerve",
    "photo": "light", "thermo": "heat", "hydro": "water", "tele": "far", "micro": "small", "macro": "large",
    "kilo": "thousand", "centi": "hundred", "milli": "thousandth", "para": "beside", "peri": "around", "dia": "through",
    "ana": "up, back", "cata": "down", "hetero": "other", "homo": "same", "mono": "one", "auto": "self", "demo": "people",
    "morpho": "form", "pheno": "show", "etymo": "true meaning", "philo": "love", "anglo": "English", "franco": "French",
    "mono": "one", "poly": "many", "pan": "all", "chrono": "time", "astro": "star", "cosmo": "universe", "litho": "stone",
    "ortho": "straight, correct", "pedo": "child, foot", "geronto": "old age", "bibliography": "", "biblio": "book",
    "aero": "air", "cine": "movement", "ethno": "race, people", "gyno": "woman", "andro": "man", "hemo": "blood",
    "hepato": "liver", "nephro": "kidney", "osteo": "bone", "dermato": "skin", "gastro": "stomach", "myco": "fungus",
    "ornitho": "bird", "ichthyo": "fish", "ento": "insect", "entomo": "insect", "arachno": "spider", "herpeto": "reptile",
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
