# MASTER JOB: build the complete morpheme key (BASIC + ADVANCED) and give me one zip

You will do this whole job on your own, from start to finish, without asking me questions and without waiting for
my confirmation between batches. Work in `~/workspace/morpheme-dictionary/`. Save everything there.

## Step 0. Setup
- Save PART B below as `RULES-BASIC.md` and PART C below as `RULES-ADVANCED.md`.
- Create folders `basic/` and `advanced/`.
- The job can be resumed: before processing a batch, check whether its output file already exists and is complete
  (one line per input word). If it does, skip it.

## Step 1. BASIC key
- Rules: PART B (RULES-BASIC.md).
- Input batches: `https://l2practice.github.io/morphology/work/in/in-NNNN.txt` for NNNN = 0011 to 0427, in order
  (200 words each, one word per line). The list of files is `https://l2practice.github.io/morphology/work/index.txt`.
  Batches 0001 to 0010 are already done: do NOT redo them.
- For each batch write `basic/out-NNNN.txt`: exactly one output line per input word, same order, in the format
  of PART B. No commentary, no code fences.

## Step 2. ADVANCED key
- Rules: PART C (RULES-ADVANCED.md).
- Input batches: `https://l2practice.github.io/morphology/work/adv/adv-NNNN.txt` for NNNN = 0001 to 0083
  (150 lines each, `word<TAB>etymology`). The list is `https://l2practice.github.io/morphology/work/adv-index.txt`.
- For each batch write `advanced/out-adv-NNNN.txt`: one output line per input word, same order, format of PART C.
  A word with no deeper structure gets `word<TAB>pos<TAB>=`.

## Step 3. Quality loop (before packing)
For every output file, check each line yourself:
- 3 tab-separated fields; surfaces joined in order spell the word exactly;
- inflectional morphemes (code I) are last; every bound root (code B) has at least one affix;
- Basic only: every prefix and suffix is on the ALLOWED lists; no fossilised word is cut.
Fix bad lines. If a line cannot be fixed, write the word and the reason to `rejected-basic.txt` or
`rejected-advanced.txt` and use the safe fallback: one morpheme for BASIC (`word<TAB>pos<TAB>word|word|R|cat`),
`=` for ADVANCED.
Do not stop to report. Keep going until every batch is done. If you run low on context, continue from the files
already saved; they are the progress record.

## Step 4. Pack
Create ONE zip named `morpheme-results.zip` in `~/workspace/morpheme-dictionary/` containing exactly:
- `basic/` (all out-NNNN.txt you made),
- `advanced/` (all out-adv-NNNN.txt),
- `rejected-basic.txt`, `rejected-advanced.txt` (may be empty),
- `summary.txt`: for BASIC: words processed, words cut into 2+ morphemes, words kept as one morpheme; for ADVANCED:
  words processed, words deeper than basic, words `=`; and the list of any batch you could not finish.
Do not rename files and do not change the line format.

## Step 5. Final reply
Reply with only: the full path of `morpheme-results.zip`, its size, and the numbers from summary.txt.

---

# PART B: RULES-BASIC.md (the BASIC key)

You are a morphologist preparing answer keys for an English Morphology course for English majors.
For every word I send, split it into MORPHEMES using the course conventions below. Reply with data only:
one line per word, same order, nothing else (no explanations, no numbering, no code fences, no skipped words).

## Core principle: synchronic morphology only, no invention

Cut what a student of English morphology can SEE and DEFEND today. Do NOT reconstruct history.
- A morpheme is a recurring form-meaning pair in present-day English. Prove it: the root must be a word (or recur
  in at least three other words, like -ceive, -struct, -duce, -cept, -scribe, -clude, vis), and the affix must be
  on the ALLOWED AFFIX LIST below.
- NEVER invent a suffix or prefix that is not on the list, and never cut because of etymology
  (Old English / Latin / Greek derivations that have fossilised). The test is the present-day relation
  between the pieces, not where the word came from.
- If the base changes its own sounds or letters in an irregular way, the word is FOSSILISED: keep it as ONE
  morpheme. heal → health, true → truth, long → length, strong → strength, fly → flight, high → height,
  weigh → weight, young → youth, give → gift, steal → stealth, deep → depth, wide → width, law → lawyer:
  all single morphemes (health, truth, length, strength, flight, height, weight, youth, gift, stealth, depth, width,
  wealth, filth, service, justice, northern, southern, eastern, western).
  Allowed spelling changes are only the regular ones in rule 5 below.
- Do not decompose a word into a base plus a lone letter or sound (-t, -yer, -ern, -th after a changed stem).
  northern, eastern, lawyer, flight, weight stay whole. Compounds of two free words (sunflower, football, income)
  are fine: each free word is a root.
- When you hesitate between cutting and not cutting, DO NOT CUT.

ALLOWED PREFIXES: a- an- anti- auto- be- bi- by- co- com- con- contra- counter- de- dis- en- ex- extra- fore-
hyper- hypo- il- im- in- inter- intra- ir- mal- micro- mid- mis- mono- multi- non- out- over- para- poly- post-
pre- pro- per- ad- ac- pseudo- re- semi- sub- super- tele- trans- tri- un- under- uni- up- with-
ALLOWED SUFFIXES: -s -es -'s -ed -en -ing -er -est -ly -ness -ment -tion -sion -ation -ition -ion -ity -ty -ive
-ative -itive -ous -ious -eous -al -ial -ual -ful -less -able -ible -ist -ism -ize -ise -ify -fy -ish -y -hood
-ship -dom -ward -wise -ant -ent -ance -ence -ancy -ency -ary -ory -ic -ical -ure -age -ee -eer -ette -let -ling
-ster -some -like -th -ery -ry -or -ess -ate -cy -ian -an  (and -ren only inside children)
(-th only when the base is unchanged and free: warm → warmth, grow → growth. -ate only on a free base, or in
a family such as fortune → fortunate. A bound root such as -struct, -ceive, -duce, -cept, -scribe, -clude, vis
is allowed only with an allowed prefix and/or suffix, in a family of at least three words.)
If a piece you want to cut is not on these lists, you are inventing: do not cut.

## Theory to apply (descriptive morphology: Bloomfield, Nida, Bauer, Katamba)

Decide every cut with these tests, in this order. A cut needs to pass them all.
1. Recurrence (Nida's principle): the same form must occur in other words with the same meaning or function.
   un- in unhappy, unlock, unfair passes. The `-t` of weight, flight, height does not: no recurring meaning.
2. Commutation / substitution: replacing the piece must give another real word or a regular pattern.
   happy → un-happy, happi-ness; teach → teach-er, teach-ing. If swapping yields nothing, do not cut.
3. Residue test: after removing the affix, what is left must be a morpheme too (a free root, or a bound root
   that recurs). No leftover "cranberry-like" scraps: -ceive, -struct are accepted because they recur in families.
4. Free vs bound: a free morpheme can stand alone (cover); a bound morpheme cannot (-ceive, un-, -ness).
   Roots are free (code R) or bound (code B). Affixes are always bound.
5. Derivation vs inflection: derivation forms new lexemes and can change word class (teach → teacher, happy →
   happiness); inflection only gives grammatical forms of one lexeme (cat → cats). Inflection is closed,
   outermost and last. Do not call a derivational ending inflectional, and the reverse.
6. Allomorphy: one morpheme, several shapes by position or neighbour sound (in- → im-/il-/ir-; -ion → -tion,
   -sion, -ation). Record the shape actually spelled and the basic form in `allo`.
7. Zero and suppletive forms: a plural or past that is formed without an overt affix gets a zero morpheme
   (mice = mouse + -s with empty surface); a suppletive form (went, better, best) is the root with a changed
   surface plus the zero inflection, not a new root.
8. Word-formation order (immediate constituents): the cut order follows how the word was built, from the root
   outward: unhappiness = ((un- happy) -ness); the morpheme list is written left to right, and the order must
   agree with the affixes' selection: a suffix attaches to the word class it selects (-ness → Adj, -ment → V).
9. Productivity: prefer cuts built on productive, transparent patterns. Unproductive, opaque, fossilised
   combinations are single morphemes (see Core principle).
10. Compounds: two or more free roots are cut as roots (sun + flower); the head is on the right.

## Output format

    word<TAB>pos<TAB>morpheme ; morpheme ; morpheme

Each morpheme is written `form|surface|code|cat|variant|allo` (the last three fields may be left empty and
trailing empty fields omitted).

- form: the dictionary form, with hyphens on affixes: `un-`, `-ness`, `happy`, `-ceive`.
- surface: exactly the letters this morpheme has in the word (`happi` in unhappiness). The surfaces joined in
  order MUST spell the word exactly.
- code: `P` derivational prefix, `R` free root, `B` bound root, `S` derivational suffix, `I` inflectional suffix.
- cat: word class of a root only: `N`, `V`, `Adj`, `Adv`. Leave empty for affixes.
- variant: only for the look-alike endings listed in rule 7.
- allo: the basic form when this affix is a conditioned variant (`ir-|ir|P|||in-`).

pos is one of: noun, verb, adj, adv, prep, pron, det, conj, interj. If I give a pos, keep it. Words with several
parts of speech: use the most frequent one.

Example lines:

    unhappiness	noun	un-|un|P ; happy|happi|R|Adj ; -ness|ness|S
    irrecoverably	adv	ir-|ir|P|||in- ; re-|re|P ; cover|cov|R|V ; -able|ab|S ; -ly|ly|I|Adv|-ly (adv)
    employ	verb	employ|employ|R|V
    employment	noun	employ|employ|R|V ; -ment|ment|S
    receive	verb	re-|re|P ; -ceive|ceive|B|V
    reception	noun	re-|re|P ; -cept|cep|B|V ; -ion|tion|S
    sunflower	noun	sun|sun|R|N ; flower|flower|R|N
    mouse	noun	mouse|mouse|R|N
    mice	noun	mouse|mice|R|N ; -s||I||-s (plural)
    better	adj	good|better|R|Adj ; -er||I||-er (comparative)
    visibly	adv	vis|vis|B|V ; -ible|ib|S ; -ly|ly|I|Adv|-ly (adv)

## Rules (follow them strictly, they are the course's conventions)

1. DEFAULT = ONE MORPHEME. Cut a word only when every part is a real morpheme with its own meaning that a
   student could defend. Never cut a word just because it looks like it contains an affix (corner, butter,
   hammer, sing, string, rapid, reader-like endings that are not suffixes). When unsure, do not cut.
2. Stop at the root. Do not go back to Latin or Greek parts when a native English root exists
   (`happy`, not `hap` + `-y`; `cover`, not `co-` + `vert`). Never cut a fossilised derivation (see the core
   principle): health, truth, length, strength, flight, height, weight, youth, depth, width are single morphemes.
3. Loanwords borrowed whole are ONE morpheme even though they look cuttable in the source language:
   employ, deploy, enjoy, refer, prefer, defer, confer, infer, transfer (and similar). Their derived forms
   cut at the English suffix: employment = employ + -ment.
4. A living prefix on a free word is cut: recover = re- + cover; rewrite = re- + write; unlock; disagree.
   A Latinate prefix on a bound root is also cut when both parts recur in a family of words:
   receive/deceive/conceive/perceive = re-/de-/con-/per- + -ceive; reception/deception = re- + -cept + -ion;
   construct/instruct/destruct = con-/in-/de- + -struct; produce/reduce = pro-/re- + -duce.
   If the root does not recur in other words, do not cut.
5. Only REGULAR spelling changes may be absorbed into the surface: final e dropped (hope→hop+ing), y→i (happy→happi), consonant doubling (run→runn), and the standard -ion variants (act→action, educate→education, divide→division, decide→decision, conclude→conclusion, describe→description). Spelling changes belong to the surface, not to extra morphemes: happy→happi, visibly→vis + ib + ly,
   nationalize→nationaliz, hope→hop. Keep `form` in dictionary shape and write the real letters in `surface`.
6. Order of morphemes = left to right as spelled, so surfaces concatenate to the word.
7. Inflection and look-alike endings. Inflectional suffixes (code `I`) are only the eight English ones:
   -s (plural / 3rd person / possessive), -ed, -ing (verb form), -en (participle), -er (comparative),
   -est, and -ly when it makes an adverb from an adjective (the course treats adverbial -ly as inflectional).
   Everything else is derivational (`S`). Give `variant` for these look-alikes, exactly this text:
   - `-ing (v)` verb progressive, `-ing (N)` noun (meeting), `-ing (adj)` participial adjective (interesting)
   - `-ed (v2)` past / participle, `-ed (adj)` adjective (interested)
   - `-ly (adv)` adverb (quickly, visibly), `-ly (adj)` adjective (friendly, costly)
   - `-er (comparative)`, `-er (N)` agent/tool (driver), `-er (onomatopoeia)` (chatter, flicker)
   - `-est (superlative)`, `-s (plural)`, `-s (3sg)`, `-ed (v2)`
   Labels `(v) (v2) (adv) (comparative) (superlative) (plural) (3sg)` go with code `I`; all others with `S`.
   Only lemma-level words are sent, so inflection will appear only inside lemmas that really contain it
   (adverbs in -ly; irregular forms such as mice, children, went).
8. Irregular forms (mice, men, geese, children, went, sang, better, best): the root keeps its base `form`
   with the changed spelling as `surface`, followed by a ZERO inflectional morpheme with empty surface:
   `mouse|mice|R|N ; -s||I||-s (plural)`; `go|went|R|V ; -ed||I||-ed (v2)`; `good|better|R|Adj ; -er||I||-er (comparative)`.
   Children = `child|child|R|N ; -ren|ren|I||-s (plural)`.
9. Compounds: each free root is its own morpheme (sunflower, blackboard, toothbrush). Blends and acronyms
   (brunch, laser): keep as one morpheme.
10. Prefix allomorphs: in- has im-/il-/ir- before p,b,m / l / r. Write the spelled form and set `allo` to the basic
    form (illegal → `il-|il|P|||in-`). Same for a-/an-, con-/com-/col-/cor-, -ion/-tion/-ation when a
    surface differs from the basic suffix form.
11. Do not cut: proper names, single letters, numbers, fixed phrases (just send them as one morpheme), and
    words whose parts are not English morphemes (table, window, people, animal).

12. CUT ALL THE WAY TO THE ROOT. If the base left after removing one affix is itself a derived word, keep
    cutting it. unemployment = un- + employ + -ment (never un- + employment); unlikely = un- + like + -ly;
    independent = in- + depend + -ent; unfortunately = un- + fortune + -ate + -ly; television = tele- + vis + -ion.
    The same word must always be cut the same way (vision = vis + -ion, so television uses vis + -ion too).

## Before you answer each line, check

- Do the surfaces joined together spell the word exactly?
- Is every cut defensible under rules 1–4? If not, merge. Is every base cut down to its root (rule 12)?
- Are inflectional endings (code I) only from rule 7, and always the LAST morpheme(s)?
- Is the number of fields right (exactly 3 tab-separated fields; 6 fields at most per morpheme)?

If a word is not a normal English word (a typo, a non-word), reply `word<TAB>?<TAB>?` for that line.

---

# PART C: RULES-ADVANCED.md (the ADVANCED key)

You are a morphologist preparing the ADVANCED answer key for an English Morphology course (Latinate and Greek word
analysis, neo-classical roots and affixes, after Nida, Bauer and Katamba). A BASIC key already exists. It cuts
only what a first-year student can see in present-day English (science = one morpheme, health = one morpheme).
Your job is the ADVANCED cut, which goes one level deeper: bound roots and affixes that come from Latin, Greek
or Old English, as long as the piece is a recognised morpheme that recurs in a family of words.

I send lines `word<TAB>etymology`. Use the etymology text as evidence; it is the dictionary's own. Reply with data
only: one line per word, same order, no explanations, no numbering, no code fences, no skipped words.

## Output format

    word<TAB>pos<TAB>morpheme ; morpheme ; morpheme

Each morpheme is `form|surface|code|cat|variant|allo|gloss` (trailing empty fields may be omitted).
- form: dictionary form. Affixes carry hyphens (`un-`, `-ness`). A bound root carries a hyphen on each side where
  it attaches: `sci-` (word-initial root), `-ceive`, `-spect-` (between a prefix and a suffix).
- surface: the exact letters in the word. Surfaces joined in order MUST spell the word.
- code: `P` prefix, `R` free root, `B` bound root (including neo-classical combining forms: bio-, geo-, -logy,
  -graph, -phone, tele-, omni-), `S` derivational suffix, `I` inflectional suffix.
- cat: word class of a root only: N, V, Adj, Adv. Empty for affixes. Bound roots take the class of the words
  they build (sci- → V).
- variant, allo: as in the basic key (look-alike labels such as `-ing (N)`; basic form of an allomorph).
- gloss: for every bound root and every non-English affix, the source and meaning in 2 to 6 words, for example
  `Latin scire 'to know'`, `Greek logos 'word, study'`, `Latin ex- 'out'`. Leave empty for English roots.

If your best advanced cut is the SAME as the basic cut (the word has no deeper Latin/Greek/OE structure), reply
`word<TAB>pos<TAB>=`. Most words in this list should end up as `=` or only slightly deeper. Do not invent depth.

Example lines:

    science	noun	sci-|sci|B|V||| Latin scire 'to know' ; -ence|ence|S|||| Latin -entia, 'state, quality'
    scientist	noun	sci-|sci|B|V||| Latin scire 'to know' ; -ent|ent|S|||| Latin -ens, 'agent' ; -ist|ist|S
    omniscient	adj	omni-|omni|P||||Latin omnis 'all' ; sci-|sci|B|V|||Latin scire 'to know' ; -ent|ent|S
    conceive	verb	con-|con|P||||Latin com- 'together' ; -ceive|ceive|B|V|||Latin capere 'to take'
    perception	noun	per-|per|P||||Latin per 'through' ; -cept-|cep|B|V|||Latin capere 'to take' ; -ion|tion|S
    biology	noun	bio-|bio|B|N|||Greek bios 'life' ; -logy|logy|B|N|||Greek logos 'study, word'
    health	noun	heal|heal|R|V ; -th|th|S|||| Old English -thu, 'state'
    truth	noun	true|tru|R|Adj ; -th|th|S
    table	noun	=

## Rules

1. The Core principle and theory tests of the basic key still apply, with ONE change: etymological pieces are
   now allowed, but only when they are recognised morphemes with a recurring family (at least three words in
   current English share the piece, like -ceive, -cept, -duce, -struct, -spect, -scribe, sci-, bio-, -logy, -graph).
2. Every piece must be justified by the etymology text I give you. If the text does not show the structure,
   reply `=`.
3. Cut a derived base all the way to the deepest recurring piece (scientist = sci- + -ent + -ist, not
   science + -ist), and always cut the same piece the same way across words (-ceive in conceive, receive,
   perceive, deceive).
4. Old English / Germanic derivations are allowed when the base is still an English word: health = heal + -th,
   truth = true + -th, length = long + -th, strength = strong + -th, flight = fly + -t, weight = weigh + -t,
   gift = give + -t. Write the changed stem in `surface` (long → `leng`) and the real base in `form`.
5. A piece that appears in only one or two words is not a morpheme: do not cut cranberry-type residues.
6. Inflection (-s, -ed, -ing, -er, -est, adverbial -ly) is code `I` and always last, as in the basic key.
7. Never cut a proper noun, a borrowed word whose parts do not recur in English (employ, deploy, enjoy, refer),
   or a word where the cut would leave one letter.
8. Surfaces join to the word; at most 7 fields per morpheme; exactly 3 tab-separated fields per line.

---

Start now with Step 0.
