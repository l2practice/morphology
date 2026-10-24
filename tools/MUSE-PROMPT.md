# Muse prompt: morpheme cuts for the whole dictionary

How to use: paste everything between the two `=====` lines into Muse as the instruction, then send word batches
(150–250 words per message, one word per line, format `word<TAB>pos` or just `word`). Save every reply as
`batch-001.txt`, `batch-002.txt` … The importer reads those files.

Send lemmas only (headwords). Regular inflected forms (plural -s, -ed, -ing, -er, -est …) are added by the app
when a student types them, so do not ask Muse for them. Irregular forms (mice, went, better) are separate
headwords of their own in the batch.

=====

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

Begin when I send the first batch.

=====

## Notes for after Muse answers

- Keep Muse's reply as plain text files. Do not let it wrap lines in code fences.
- The importer (next step) checks every line: surfaces join to the word, codes are legal, inflection is last,
  look-alike labels agree with the code, affixes are in the course's affix inventory. Failing lines are written
  to `rejected.txt` and can be sent back to Muse as a smaller batch.
- Irregular headwords (mice, went, better) should be in the batches too, because their forms are listed in the
  dictionary as separate entries or variants.
