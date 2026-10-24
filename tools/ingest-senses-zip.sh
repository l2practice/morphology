#!/usr/bin/env bash
# usage: tools/ingest-senses-zip.sh senses-results.zip <dictionary data version dir>
# Unpack Muse's sense labels into lexicon-src/senses/ and rebuild both lexicons.
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
mkdir -p lexicon-src/senses; find "$T" -name 'out-sense-*.txt' -exec cp {} lexicon-src/senses/ \;
echo "$(ls lexicon-src/senses | wc -l) sense files"
python3 tools/check-coverage.py work/sense lexicon-src/senses >/dev/null 2>&1 || true
tools/build-lexicon.sh "$D"
