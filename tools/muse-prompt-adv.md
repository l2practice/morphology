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
7. Never cut a proper noun or a word where the cut would leave one letter. Borrowed words DO get cut here when the
   parts recur in a family: refer/prefer/confer/transfer/defer/infer = prefix + -fer (Latin ferre 'to carry');
   employ/deploy = em-/de- + -ploy, imply/reply/apply/comply/supply = prefix + -ply (Latin plicare 'to fold');
   enjoy = en- + joy.
8. Surfaces join to the word; at most 7 fields per morpheme; exactly 3 tab-separated fields per line.

## When all batches are finished (or when I say "pack it")

1. Check every input word has exactly one output line.
2. Put all `out-adv-*.txt` files, a `rejected-adv.txt` (words you refused, with reason) and a `summary-adv.txt`
   (number of words, number deeper than basic, number `=`) into ONE zip named `advanced-results.zip`.
3. Reply with only: the zip path, its size, and the three numbers.

Begin when I send the first batch.
