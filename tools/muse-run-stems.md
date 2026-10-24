# JOB: confirm or reject proposed bound stems for the ADVANCED layer (vulner-able, pres-ence, cognit-ion ...)

Work on your own, without questions, and finish with one zip. Work in `~/workspace/morpheme-dictionary/stems/`.
The job can be resumed: skip any batch whose output file already exists and has one line per input word.

## What this is
My program looked for stems that come back in a family of words and are not words themselves
(vulnerable, vulnerability, invulnerable → vulner-; present, presence, omnipresent → pres-). It makes MANY wrong proposals
(coincidences such as clarence, candle, sultan, secret, magnet). You are the judge.

## Input
Batches: `https://l2practice.github.io/morphology/work/stem/stem-NNNN.txt` for NNNN = 0001 to 0007.
The list of files is `https://l2practice.github.io/morphology/work/stem-index.txt`.
Each line: `word<TAB>proposed cut<TAB>other words of the same family<TAB>etymology (first 170 characters)`, for example
`vulnerable<TAB>-vulner- + -able<TAB>vulnerability, invulnerable, invulnerability<TAB>From Late Latin vulnerābilis (“injurious, wounding”), from Latin vulnerō (“to wound”).`

## Output
For each batch write `stems/out-stem-NNNN.txt`: exactly one line per input word, same order, in ONE of two forms:

1. REJECT: `word<TAB>pos<TAB>=`  (the proposal is wrong, or the word has no deeper structure for a student)
2. ACCEPT: `word<TAB>pos<TAB>morpheme ; morpheme ; ...` with each morpheme written `form|surface|code|cat|variant|allo|gloss`:
   - form: dictionary form. Affixes carry hyphens (`omni-`, `-able`). A bound stem carries a hyphen on each side where it
     attaches: `-vulner-`, `-pres-`.
   - surface: the exact letters in the word. Joined in order they MUST spell the word.
   - code: `P` prefix, `R` free root, `B` bound root, `S` derivational suffix, `I` inflectional suffix.
   - cat: N, V, Adj or Adv for roots only (bound stems take V for verbal roots, N for nouns, Adj for adjectives).
   - gloss: for every bound stem and every non-English affix, source and meaning in 2 to 6 words, for example
     `Latin vulnus 'wound'`, `Latin esse 'to be'`, `Latin omnis 'all'`. Leave empty for English words.
   Example lines:

       vulnerable	adj	-vulner-|vulner|B|V|||Latin vulnus 'wound' ; -able|able|S
       omnipresence	noun	omni-|omni|P|||Latin omnis 'all' ; -pres-|pres|B|V|||Latin praesens 'being at hand' ; -ence|ence|S
       clarence	noun	=

## Rules
1. Accept only when ALL of these hold: (a) the stem is a real Latin or Greek root, recognised in dictionaries (vulner-,
   pres-, cognit-, integr-, dramat-), (b) the other words of the family really share that stem and its meaning (the
   etymology line helps), (c) every other piece is a genuine prefix or suffix: omni-, in-, un-, re-, -able, -ity, -ence, -ent,
   -ion, -ive, -ly ...
2. Reject coincidences: the stem is a different root in the other words (liqu- in liquid, liqueur; magn- in magnet vs
   magnify), the word is a name or borrowing (clarence, sultan, candle, chalet, secret), the "stem" is only part of a
   longer root (ivers-, ecut-, gniz-), or you are unsure.
3. You may move the stem boundary to the standard root (cognit- not cogni-, vulner- not vuln-), keeping surfaces that join to
   the word. Do not invent suffixes that are not recognised (-et, -ar in secret, nebular are usually wrong).
4. Keep prefixes: `omni-` stays a prefix; `in-` in invulnerable is a prefix.
5. No commentary, no numbering, no code fences, no skipped words; exactly three tab-separated fields on every line;
   joined surfaces must spell the word; only the codes P R B S I.

## Finish
When all 7 batches are done put every `out-stem-*.txt` and a `summary.txt` (words processed, accepted, rejected) in ONE zip
named `stems-results.zip` in `~/workspace/morpheme-dictionary/` and reply with only: the full path, the size and the numbers.

Start now.
