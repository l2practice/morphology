#!/usr/bin/env bash
# usage: tools/ingest-stems-zip.sh stems-results.zip <dictionary data version dir>
# Muse's accepted bound-stem cuts go into the Advanced layer; both lexicons are rebuilt.
set -euo pipefail
ZIP="$1"; D="$2"; cd "$(dirname "$0")/.."
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
python3 -I - "$ZIP" "$T" <<'PY'
import sys, zipfile, os
z, out = sys.argv[1:3]
with zipfile.ZipFile(z) as zf:
    for n in zf.namelist():
        if not os.path.normpath(os.path.join(out, n)).startswith(os.path.abspath(out)): raise SystemExit("unsafe path " + n)
    zf.extractall(out)
PY
rm -f lexicon-adv-src/out-adv-stem-*.txt
for f in $(find "$T" -name 'out-stem-*.txt'); do cp "$f" "lexicon-adv-src/out-adv-$(basename "$f" | sed 's/^out-//')"; done
ls lexicon-adv-src/out-adv-stem-*.txt | wc -l | sed 's/$/ stem files/'
tools/build-lexicon.sh "$D"
