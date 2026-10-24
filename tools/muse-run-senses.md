# JOB: label the sense of every prefix (re-, in-, un-, de-, dis-, en-) so the IC trees come out right

You will do this whole job on your own, without asking me questions, and finish with one zip. Work in
`~/workspace/morpheme-dictionary/senses/`. The job can be resumed: skip any batch whose output file already
exists and has one line per input word.

## Why
Some prefixes have two senses and each sense attaches to a different word class, so the order in which the
word was built depends on the sense. Examples:
- ir-refut-able: ir- means NOT and goes with an ADJECTIVE, so -able joins refute first: ir-(refute-able).
- re-activ-ate: re- means AGAIN and goes with a VERB: (re-act)-ive-ate.
- re-action-ary: re- means AGAINST/BACK and goes with a NOUN: re-(action), then -ary.
My program builds the IC tree from your labels. You only give labels.

## Input
Batches: `https://l2practice.github.io/morphology/work/sense/sense-NNNN.txt` for NNNN = 0001 to 0037.
The list of files is `https://l2practice.github.io/morphology/work/sense-index.txt`.
Each line: `word<TAB>cut<TAB>pos`, where `cut` is the morpheme cut already made, for example
`reactionary<TAB>re- + act + -ion + -ary<TAB>adj`.

## Output
For each batch write `senses/out-sense-NNNN.txt`: exactly one line per input word, same order:

    word<TAB>label ; label

one label for each prefix in the cut that is one of re-, in-, im-, il-, ir-, un-, de-, dis-, en-, em-, in the
order they appear in the cut. A word with two such prefixes gets two labels (irrecoverably: `ir- (not) ; re- (again)`).
Use ONLY these labels, written exactly like this:

| label | meaning | attaches to | examples |
|---|---|---|---|
| re- (again) | again | verb | rewrite, reactivate, rebuild, reuse |
| re- (against) | against, back | noun | reaction, reactionary |
| in- (not) | not | adjective, noun | inactive, inability, inaction |
| im- (not) | not | adjective, noun | impossible, immature |
| il- (not) | not | adjective | illegal, illogical |
| ir- (not) | not | adjective | irregular, irrefutable, irrelevant |
| in- (into) | in, into | verb, noun | insert, input, inflow |
| im- (into) | in, into | verb, noun | import, implant |
| un- (not) | not | adjective | unhappy, unlikely, unfortunate |
| un- (reverse) | reverse an action | verb | unlock, undo, unfold |
| de- (reverse) | remove, reverse | verb | deactivate, decode, defrost |
| de- (down) | down, away | verb, noun | descend, depress, degrade |
| dis- (not) | not, opposite | verb, adjective, noun | disagree, dishonest, disability |
| dis- (apart) | apart, away | verb, noun | dismiss, disperse, distract |
| en- (make) | make, cause to be | noun, adjective | enrich, enlarge, endanger |
| en- (into) | in, into | noun, verb | enclose, encase |
| em- (make) | make, cause to be | noun, adjective | empower, embitter |
| em- (into) | in, into | noun, verb | embed, embody |

## Rules
1. The label must fit the base the prefix attaches to IN THIS WORD: ask what the prefix is attached to
   (a verb, a noun or an adjective) and pick the sense that goes with that class. The word class of the base
   is not the class of the whole word: in `irrefutable` the prefix ir- attaches to `refutable` (an adjective),
   not to `refute`.
2. When the base is a bound root (-ceive, -struct), choose by meaning.
3. If the prefix in the cut is not really a prefix in this word (invade, defend, enter, disk, inch, unit, dentist),
   or the cut looks wrong, answer `word<TAB>-` for that word. Do not guess.
4. Never change the cut and never write anything but labels. No commentary, no numbering, no code fences,
   no skipped words.
5. Check each line before you save: the number of labels equals the number of those prefixes in the cut;
   each label starts with the prefix as written in the cut (`im-` takes `im- (not)` or `im- (into)`).

## Finish
When all 37 batches are done, put every `out-sense-*.txt` and a `summary.txt` (words processed, words labelled,
words answered `-`) in ONE zip named `senses-results.zip` in `~/workspace/morpheme-dictionary/` and reply with
only: the full path, the size and the three numbers.

Start now.
