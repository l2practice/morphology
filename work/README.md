# Work queue for Muse

Public, read-only list of dictionary words to cut into morphemes (see tools/MUSE-PROMPT.md for the rules).

- `pilot.txt`   : 53 test words. Do these first.
- `index.txt`   : batch files in order (most frequent words first).
- `in/in-NNNN.txt` : 200 words each, one per line.

Base URL: https://l2practice.github.io/morphology/work/
Example: https://l2practice.github.io/morphology/work/in/in-0001.txt

Results go to `out-NNNN.txt` (same number), same line order, format from MUSE-PROMPT.md.
