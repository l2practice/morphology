#!/usr/bin/env bash
# Rebuild lexicon/ (Basic) and lexicon-adv/ (Advanced) from lexicon-src/ and lexicon-adv-src/ (Muse output + manual files).
# usage: tools/build-lexicon.sh <dictionary data version dir>   e.g. .../data/v/v2026.10.07-ba343f9d
set -euo pipefail
cd "$(dirname "$0")/.."; D="$1"; T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
rm -f lexicon-src/out-zz-manual.txt lexicon-src/out-zzz-course.txt lexicon-src/out-zzz-etymology.txt lexicon-src/out-zzzz-senses-muse.txt lexicon-adv-src/out-adv-zzz-bases.txt
echo "== Basic: Muse output"; node tools/import-lexicon.mjs "$T/b0" "$T/rej" lexicon-src/out-*.txt | tail -1
echo "== Basic: combining forms (-cide, -vore, -logy ...)"; python3 tools/combining-forms.py "$T/b0" lexicon-src/out-zz-manual.txt
node tools/import-lexicon.mjs "$T/b1" "$T/rej" lexicon-src/out-*.txt >/dev/null
echo "== Basic: course examples confirmed by the dictionary"; python3 tools/course-examples.py "$T/b1" "$D" lexicon-src/out-zzz-course.txt
echo "== Basic: cuts the dictionary etymology states ("'"From omni- + presence"'")"
node tools/import-lexicon.mjs "$T/b1b" "$T/rej" lexicon-src/out-*.txt >/dev/null
python3 tools/etymology-cuts.py "$T/b1b" "$D" lexicon-src/out-zzz-etymology.txt 60000
if ls lexicon-src/senses/out-sense-*.txt >/dev/null 2>&1; then
  echo "== Basic: prefix senses from Muse"
  node tools/import-lexicon.mjs "$T/b2" "$T/rej" lexicon-src/out-*.txt >/dev/null
  node tools/apply-senses.mjs "$T/b2" lexicon-src/out-zzzz-senses-muse.txt lexicon-src/senses/out-sense-*.txt
fi
rm -rf lexicon; node tools/import-lexicon.mjs lexicon lexicon-src/rejected.txt lexicon-src/out-*.txt | tail -1
echo "== Advanced: Muse output + manual"; node tools/import-lexicon.mjs --adv "$T/a0" "$T/arej" lexicon-adv-src/out-*.txt | tail -1
echo "== Advanced: course bound bases"; python3 tools/bound-bases.py "$T/b1" lexicon-adv-src/out-adv-zzz-bases.txt "$D/words.txt" 40000 "$T/a0"
rm -rf lexicon-adv; node tools/import-lexicon.mjs --adv --basic lexicon lexicon-adv lexicon-adv-src/rejected.txt lexicon-adv-src/out-*.txt | tail -1
